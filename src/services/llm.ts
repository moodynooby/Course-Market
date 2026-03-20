import { CreateMLCEngine, type MLCEngineInterface } from '@mlc-ai/web-llm';
import { Wllama } from '@wllama/wllama';
import { ENV } from '../config/devConfig';
import {
  type BYOKConfig,
  DEFAULT_LLM_CONFIG,
  getDefaultModel,
  LLM_CONSTANTS,
  type LLMTask,
} from '../config/llmConfig';
import type { Course, LLMProvider, Preferences, Schedule, Section, TradePost } from '../types';

type LLMConfig = BYOKConfig;

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function buildScheduleAnalysisPrompt(
  schedule: Schedule,
  preferences: Preferences,
  allSections?: Section[],
): string {
  if (!schedule || !schedule.sections) {
    return 'Analyze this course schedule and provide recommendations.';
  }

  const sectionsInfo = schedule.sections
    .map(
      (s) => `- ${s.courseId}: Section ${s.sectionNumber} (Instructor: ${s.instructor || 'TBA'})`,
    )
    .join('\n');

  const timeSlotsInfo = schedule.sections
    .map((s) => {
      const times = s.timeSlots?.map((t) => `${t.day} ${t.startTime}-${t.endTime}`).join(', ');
      return `- ${s.courseId}: ${times || 'TBA'}`;
    })
    .join('\n');

  let availableSectionsInfo = '';
  if (allSections && allSections.length > 0) {
    const currentCourseIds = new Set(schedule.sections.map((s) => s.courseId));

    // Group sections by course, only for courses in the current schedule
    const sectionsByCourse = new Map<string, Section[]>();
    allSections.forEach((s) => {
      if (currentCourseIds.has(s.courseId)) {
        const existing = sectionsByCourse.get(s.courseId) || [];
        if (existing.length < 5) {
          // Limit to 5 alternatives per course to save tokens
          existing.push(s);
          sectionsByCourse.set(s.courseId, existing);
        }
      }
    });

    if (sectionsByCourse.size > 0) {
      availableSectionsInfo = '\n### Available Alternative Sections\n';
      availableSectionsInfo += '| Course | Section | Instructor | Time Slots |\n';
      availableSectionsInfo += '|:-------|:--------|:-----------|:-----------|\n';

      sectionsByCourse.forEach((sections, courseId) => {
        sections.forEach((s) => {
          const timeStr =
            s.timeSlots?.map((t) => `${t.day} ${t.startTime}-${t.endTime}`).join(', ') || 'TBA';
          availableSectionsInfo += `| ${courseId} | ${s.sectionNumber} | ${s.instructor || 'TBA'} | ${timeStr} |\n`;
        });
      });
    }
  }

  return `You are a helpful academic advisor assistant. Analyze the provided schedule against the user's preferences and provide concise, actionable recommendations in markdown format.

## Current Schedule Details
- **Total Credits**: ${schedule.totalCredits ?? 0}
- **Score**: ${schedule.score ?? 0}/100
- **Sections**:
${sectionsInfo}

## Weekly Time Slots
${timeSlotsInfo}
${availableSectionsInfo}

## User Preferences
- **Preferred Time Range**: ${preferences?.preferredStartTime || '08:00'} - ${preferences?.preferredEndTime || '17:00'}
- **Maximum Gap**: ${preferences?.maxGapMinutes || 60} minutes
- **Preference**: ${preferences?.preferMorning ? 'Morning classes' : preferences?.preferAfternoon ? 'Afternoon classes' : 'No specific time preference'}
- **Avoid Days**: ${preferences?.avoidDays?.join(', ') || 'None'}

## Instructions
Provide your analysis using this Markdown structure:
1. **Assessment**: A 1-2 sentence verdict on whether this schedule is well-optimized.
2. **Strengths**: Bullet points of what fits the user's preferences well.
3. **Improvements**: Bullet points of specific issues or conflicts with preferences.
4. **Recommendations**: If better alternatives exist, provide a table comparing the current vs suggested section with a brief reason.
5. **Actionable Tips**: 1-2 specific tips for the user.`;
}

export function buildSearchCoursesPrompt(query: string, courses: Course[]): string {
  const coursesCtx = courses
    .map((c) => {
      const desc = c.description
        ? ` (${c.description.slice(0, 150)}${c.description.length > 150 ? '...' : ''})`
        : '';
      return `- ${c.id}: ${c.code} - ${c.name}${desc}`;
    })
    .join('\n');

  return `You are a course discovery assistant. A user is looking for courses with this query: "${query}"

Here is the list of available courses:
${coursesCtx}

Identify the top 5-10 most relevant courses that match the user's intent. 
Return ONLY a valid JSON array of course IDs, like this: ["id1", "id2", "id3"]
Do not include any other text or explanation.`;
}

export function buildTradeMessagePrompt(trade: TradePost): string {
  return `You are a helpful assistant assisting a student with trading a course section.
  
Trade Details:
- Course: ${trade.courseCode} - ${trade.courseName}
- Offering Section: ${trade.sectionOffered}
- Looking for Section: ${trade.sectionWanted}
- Student Name: ${trade.userDisplayName}

Draft a polite, professional, and clear message that the student can send to potential trade partners. 
The message should introduce the trade offer and ask if they are interested. 
Keep it concise (under 100 words).`;
}

class UnifiedLLMService {
  private engine: MLCEngineInterface | null = null;
  private wllama: Wllama | null = null;
  private isInitialized = false;
  private isLoading = false;
  private lastInitPromise: Promise<boolean> | null = null;
  private config: LLMConfig = DEFAULT_LLM_CONFIG;
  private analysisCache: Map<string, string> = new Map();
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  async initialize(config?: Partial<LLMConfig>, task: LLMTask = 'DEFAULT'): Promise<boolean> {
    if (this.isLoading && this.lastInitPromise) {
      return this.lastInitPromise;
    }

    this.lastInitPromise = this.performInitialization(config, task);
    return this.lastInitPromise;
  }

  private async performInitialization(
    config?: Partial<LLMConfig>,
    task: LLMTask = 'DEFAULT',
  ): Promise<boolean> {
    const targetConfig = { ...this.config, ...config };
    const targetProvider = targetConfig.provider;
    const targetModel = await getDefaultModel(targetProvider, task);

    // If already initialized with a different model or provider, destroy first
    if (
      this.isInitialized &&
      (this.config.model !== targetModel || this.config.provider !== targetProvider)
    ) {
      if (ENV.IS_DEV) console.log('Model/Provider change detected, re-initializing LLM...');
      await this.destroy();
    }

    if (this.isInitialized) {
      return true;
    }

    this.isLoading = true;

    try {
      this.config = { ...this.config, ...config, model: targetModel };

      switch (this.config.provider) {
        case 'webllm':
          try {
            return await this.initializeWebLLM();
          } catch (error) {
            if (ENV.IS_DEV) {
              console.error('WebLLM initialization failed, falling back to Wllama:', error);
            }

            // Clean up any partial state before falling back
            await this.destroy();

            // Report fallback to user
            if (this.config.initProgressCallback) {
              this.config.initProgressCallback({
                progress: 0,
                text: 'WebGPU failed or out of memory. Falling back to Universal AI (CPU)...',
              });
            }

            // Switch provider in config so future calls use Wllama
            this.config.provider = 'wllama';
            this.config.model = await getDefaultModel('wllama', task);
            return await this.initializeWllama();
          }
        case 'wllama':
          return await this.initializeWllama();
        default:
          this.isInitialized = true;
          if (ENV.IS_DEV) {
            console.warn(`${this.config.provider} configured`);
          }
          return true;
      }
    } catch (error) {
      if (ENV.IS_DEV) {
        console.error('Failed to initialize LLM:', error);
      }
      await this.destroy();
      return false;
    } finally {
      this.isLoading = false;
      this.lastInitPromise = null;
    }
  }

  private async initializeWebLLM(): Promise<boolean> {
    if (!('gpu' in navigator) || !navigator.gpu) {
      throw new Error(
        'WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or Firefox 141+.',
      );
    }

    const model = this.config.model!;

    try {
      this.engine = await CreateMLCEngine(model, {
        initProgressCallback: this.config.initProgressCallback,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isOOM =
        errorMessage.includes('out of memory') ||
        errorMessage.includes('GPUDeviceLostInfo') ||
        errorMessage.includes('Not enough memory') ||
        errorMessage.includes('Device was lost') ||
        errorMessage.includes('failed to allocate') ||
        errorMessage.includes('buffer');

      if (isOOM) {
        throw new Error(
          `GPU memory error: ${errorMessage}. This model might be too large for your GPU. Try switching to Universal AI (CPU) or an external API in Settings.`,
        );
      }
      throw error;
    }

    this.isInitialized = true;
    if (ENV.IS_DEV) {
      console.warn('WebLLM initialized with model:', model);
    }
    return true;
  }

  private async initializeWllama(): Promise<boolean> {
    const model = this.config.model!;
    const modelPath = this.getWllamaModelPath(model);

    this.wllama = new Wllama({
      'single-thread/wllama.wasm': LLM_CONSTANTS.WLLAMA_WASM['single-thread'],
      'multi-thread/wllama.wasm': LLM_CONSTANTS.WLLAMA_WASM['multi-thread'],
    });

    try {
      const nThreads = Math.min(8, navigator.hardwareConcurrency || 4);
      await this.wllama.loadModelFromUrl(modelPath, {
        n_ctx: 8192,
        progressCallback: (progress: { loaded: number; total: number }) => {
          if (this.config.initProgressCallback) {
            this.config.initProgressCallback({
              progress: progress.loaded / progress.total,
              text: `Loaded ${progress.loaded} of ${progress.total} bytes`,
            });
          }
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('out of memory') ||
        errorMessage.includes('memory') ||
        errorMessage.includes('failed to allocate')
      ) {
        throw new Error(
          'Not enough memory to load this model. Try using a smaller model or switch to an external API (OpenAI/Anthropic) in Settings.',
        );
      }
      throw error;
    }

    this.isInitialized = true;
    if (ENV.IS_DEV) {
      console.warn('Wllama initialized with model:', model);
    }
    return true;
  }

  private getWllamaModelPath(modelName: string): string {
    return modelName; // New config uses full URLs directly
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('LLM service not initialized');
    }

    try {
      switch (this.config.provider) {
        case 'webllm':
          return await this.generateWebLLMCompletion(prompt, systemPrompt);
        case 'wllama':
          return await this.generateWllamaCompletion(prompt, systemPrompt);
        default:
          return await this.callExternalAPI(prompt, systemPrompt);
      }
    } catch (error) {
      if (ENV.IS_DEV) {
        console.error('LLM completion failed:', error);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate completion: ${errorMessage}`);
    }
  }

  private async generateWebLLMCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.engine) {
      throw new Error('WebLLM engine not initialized');
    }

    const messages: LLMMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });

    return reply.choices[0]?.message?.content || 'No response generated';
  }

  private async generateWllamaCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.wllama) {
      throw new Error('Wllama not initialized');
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system' as const, content: systemPrompt });
    }
    messages.push({ role: 'user' as const, content: prompt });

    const response = await this.wllama.createChatCompletion(messages, {
      nPredict: this.config.maxTokens || 1024,
      sampling: {
        temp: this.config.temperature || 0.7,
      },
    });
    return response || 'No response generated';
  }

  private async callExternalAPI(prompt: string, systemPrompt?: string): Promise<string> {
    const { provider, apiKey, apiBaseUrl, model, temperature, maxTokens } = this.config;

    if (!this.token) {
      throw new Error('Authentication required for cloud AI');
    }

    if (!apiKey) {
      throw new Error(`API key required for ${provider}`);
    }

    const messages: LLMMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('/.netlify/functions/llm-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        provider,
        model,
        messages,
        temperature,
        maxTokens,
        apiKey,
        apiBaseUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloud AI error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.text || 'No response generated';
  }

  private generateCacheKey(schedule: Schedule, preferences: Preferences): string {
    return `${schedule.id}-${JSON.stringify(preferences)}`;
  }

  async analyzeSchedule(
    schedule: Schedule,
    preferences: Preferences,
    allSections?: Section[],
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(schedule, preferences);
    if (this.analysisCache.has(cacheKey)) {
      if (ENV.IS_DEV) console.log('Serving analysis from cache');
      return this.analysisCache.get(cacheKey)!;
    }

    const prompt = buildScheduleAnalysisPrompt(schedule, preferences, allSections);
    const result = await this.generateCompletion(prompt);

    this.analysisCache.set(cacheKey, result);
    return result;
  }

  async searchCourses(query: string, courses: Course[]): Promise<Course[]> {
    // Simple hybrid approach: keyword filter first to stay within context limits
    const keywords = query
      .toLowerCase()
      .split(' ')
      .filter((k) => k.length > 2);
    let candidates = courses.filter((c) =>
      keywords.some(
        (k) =>
          c.name.toLowerCase().includes(k) ||
          c.code.toLowerCase().includes(k) ||
          c.description?.toLowerCase().includes(k),
      ),
    );

    // If too many, take top 25 to avoid token limits and context overflow
    if (candidates.length > 25) {
      candidates = candidates.slice(0, 25);
    }

    // If no keyword matches, use a smaller subset for performance
    if (candidates.length === 0) {
      candidates = courses.slice(0, 15);
    }

    const prompt = buildSearchCoursesPrompt(query, candidates);
    const response = await this.generateCompletion(prompt);

    try {
      // Extract JSON from response (handling potential markdown code blocks)
      const jsonStr = response.match(/\[.*\]/s)?.[0] || '[]';
      const selectedIds: string[] = JSON.parse(jsonStr);
      return candidates.filter((c) => selectedIds.includes(c.id));
    } catch (e) {
      if (ENV.IS_DEV) console.error('Failed to parse search results:', e);
      return candidates.slice(0, 5); // Fallback
    }
  }

  async draftTradeMessage(trade: TradePost): Promise<string> {
    const prompt = buildTradeMessagePrompt(trade);
    return this.generateCompletion(prompt);
  }

  isSupported(): boolean {
    if (this.config.provider === 'webllm') {
      return 'gpu' in navigator;
    }
    return true;
  }

  isReady(): boolean {
    return this.isInitialized && !this.isLoading;
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
    }
    if (this.wllama) {
      await this.wllama.exit();
    }
    this.engine = null;
    this.wllama = null;
    this.analysisCache.clear();
    this.isInitialized = false;
  }
}

export const llmService = new UnifiedLLMService();

export async function optimizeWithLLM(
  schedules: Schedule[],
  preferences: Preferences,
  token: string,
  config?: Partial<LLMConfig>,
  allSections?: Section[],
): Promise<{
  schedules: Schedule[];
  bestSchedule: Schedule | null;
  aiAnalysis: string;
}> {
  llmService.setToken(token);
  await llmService.initialize(config, 'OPTIMIZE');

  if (!llmService.isReady()) {
    throw new Error('LLM not available or not initialized');
  }

  if (schedules.length === 0) {
    return {
      schedules,
      bestSchedule: null,
      aiAnalysis: 'No schedules to optimize',
    };
  }

  const analysis = await llmService.analyzeSchedule(schedules[0], preferences, allSections);

  return {
    schedules,
    bestSchedule: schedules[0] || null,
    aiAnalysis: analysis,
  };
}

export default llmService;
