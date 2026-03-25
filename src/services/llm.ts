import { webLLM } from '@browser-ai/web-llm';
import { generateText } from 'ai';
import { ENV } from '../config/devConfig';
import {
  type BYOKConfig,
  DEFAULT_LLM_CONFIG,
  getDefaultModel,
  type LLMTask,
} from '../config/llmConfig';
import type { Preferences, Schedule, Section, TradePost } from '../types';

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

    const sectionsByCourse = new Map<string, Section[]>();
    allSections.forEach((s) => {
      if (currentCourseIds.has(s.courseId)) {
        const existing = sectionsByCourse.get(s.courseId) || [];
        if (existing.length < 5) {
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
  private isInitialized = false;
  private isLoading = false;
  private isFallbackMode = false;
  private lastInitPromise: Promise<boolean> | null = null;
  private config: BYOKConfig = DEFAULT_LLM_CONFIG;
  private analysisCache: Map<string, string> = new Map();
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  async initialize(config?: Partial<BYOKConfig>, task: LLMTask = 'DEFAULT'): Promise<boolean> {
    if (this.isLoading && this.lastInitPromise) {
      return this.lastInitPromise;
    }

    this.lastInitPromise = this.performInitialization(config, task);
    return this.lastInitPromise;
  }

  private async performInitialization(
    config?: Partial<BYOKConfig>,
    task: LLMTask = 'DEFAULT',
  ): Promise<boolean> {
    const targetConfig = { ...this.config, ...config };
    const targetProvider = targetConfig.provider;
    const targetModel = getDefaultModel(targetProvider, task);

    if (
      this.isInitialized &&
      (this.config.model !== targetModel || this.config.provider !== targetProvider)
    ) {
      if (ENV.IS_DEV) console.log('Model/Provider change detected, re-initializing...');
      this.isInitialized = false;
    }

    if (this.isInitialized && this.config.provider !== 'webllm') {
      return true;
    }

    this.isLoading = true;

    try {
      this.config = { ...this.config, ...config, model: targetModel };

      if (this.config.provider === 'webllm') {
        if (!('gpu' in navigator) || !navigator.gpu) {
          throw new Error('WebGPU not supported');
        }
        // @browser-ai/web-llm handles initialization lazily
        this.isInitialized = true;
        return true;
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      if (ENV.IS_DEV) console.error('Failed to initialize LLM:', error);
      this.isInitialized = false;
      return false;
    } finally {
      this.isLoading = false;
      this.lastInitPromise = null;
    }
  }
  private async getModel(task: LLMTask = 'DEFAULT') {
    const { provider } = this.config;
    const model = getDefaultModel(provider, task);

    if (provider === 'webllm' && !this.isFallbackMode) {
      return webLLM(model, {
        initProgressCallback: this.config.initProgressCallback,
      });
    }

    // Proxy "model" as a custom provider
    return {
      modelId: model,
      specificationVersion: 'v1' as const,
      defaultObjectGenerationMode: 'json' as const,
      doGenerate: async (params: any) => {
        const text = await this.callExternalAPI(
          params.prompt || params.messages[params.messages.length - 1].content,
          params.system,
        );
        return {
          text,
          finishReason: 'stop' as const,
          usage: { promptTokens: 0, completionTokens: 0 },
        };
      },
    } as any;
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      if (this.config.provider === 'webllm' && !this.isFallbackMode) {
        try {
          const { text } = await generateText({
            model: await this.getModel(),
            prompt,
            system: systemPrompt,
            temperature: this.config.temperature,
          });
          return text;
        } catch (error) {
          if (ENV.IS_DEV) console.error('WebLLM generation failed, trying cloud fallback:', error);
          this.isFallbackMode = true;
          this.config.provider = 'groq';
          this.config.model = getDefaultModel('groq');
        }
      }

      return await this.callExternalAPI(prompt, systemPrompt);
    } catch (error) {
      if (ENV.IS_DEV) {
        console.error('LLM completion failed:', error);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown cloud error';
      throw new Error(errorMessage);
    }
  }

  private async callExternalAPI(prompt: string, systemPrompt?: string): Promise<string> {
    const { model, temperature, maxTokens } = this.config;

    if (!this.token) {
      throw new Error('Authentication required for cloud AI');
    }

    const messages = [];
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
        provider: 'groq',
        model,
        messages,
        temperature,
        maxOutputTokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.message || errorData.error || `Cloud AI error (${response.status})`,
      ) as Error & { code?: string };
      if (errorData.code) {
        error.code = errorData.code;
      }
      throw error;
    }

    const data = await response.json();
    return data.text || 'No response generated';
  }

  async analyzeSchedule(
    schedule: Schedule,
    preferences: Preferences,
    allSections?: Section[],
  ): Promise<string> {
    const cacheKey = `${schedule.id}-${JSON.stringify(preferences)}`;
    if (this.analysisCache.has(cacheKey)) return this.analysisCache.get(cacheKey)!;

    const result = await this.generateCompletion(
      buildScheduleAnalysisPrompt(schedule, preferences, allSections),
    );
    this.analysisCache.set(cacheKey, result);
    return result;
  }

  async draftTradeMessage(trade: TradePost): Promise<string> {
    const prompt = buildTradeMessagePrompt(trade);
    return this.generateCompletion(prompt);
  }

  isSupported(): boolean {
    return this.config.provider !== 'webllm' || 'gpu' in navigator;
  }

  isReady(): boolean {
    return this.isInitialized && !this.isLoading;
  }

  async destroy(): Promise<void> {
    this.analysisCache.clear();
    this.isInitialized = false;
    this.isFallbackMode = false;
  }
}

export const llmService = new UnifiedLLMService();

export async function optimizeWithLLM(
  schedules: Schedule[],
  preferences: Preferences,
  token: string,
  config?: Partial<BYOKConfig>,
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
