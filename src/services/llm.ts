// Unified LLM service for browser-based LLM inference
// Supports: WebLLM (WebGPU), Wllama (WebAssembly), OpenAI, Anthropic, Custom APIs

import { CreateMLCEngine, type MLCEngineInterface } from '@mlc-ai/web-llm';
import { Wllama } from '@wllama/wllama';
import { getGPUTier } from 'detect-gpu';
import type { LLMProvider, LLMConfig, Schedule, Preferences } from '../types';

export { LLMProvider, LLMConfig };

export const LLM_MODELS = {
  webllm: {
    laptop: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    mobile: 'SmolLM-1.7B-Instruct-q4f16_1-MLC',
  },
  wllama: {
    laptop: 'TinyLlama-1.1B-Chat-v1.0.Q4_K_M.gguf',
    mobile: 'TinyLlama-1.1B-Chat-v1.0.Q4_K_M.gguf',
  },
} as const;

export async function getDefaultModel(provider: 'webllm' | 'wllama'): Promise<string> {
  const gpuTier = await getGPUTier();
  const isMobile = gpuTier.isMobile || gpuTier.tier < 2;
  const models = LLM_MODELS[provider];
  if (!models) return '';
  return isMobile ? models.mobile : models.laptop;
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function buildScheduleAnalysisPrompt(schedule: Schedule, preferences: Preferences): string {
  if (!schedule || !schedule.sections) {
    return 'Analyze this course schedule and provide recommendations.';
  }

  const sectionsInfo = schedule.sections
    .map((s) => `${s.sectionNumber || 'N/A'} (${s.instructor || 'TBA'})`)
    .join(', ');

  const timeSlotsInfo = schedule.sections
    .map((s) => {
      const times = s.timeSlots?.map((t) => `${t.day} ${t.startTime}-${t.endTime}`).join(', ');
      return times || 'TBA';
    })
    .join('\n');

  return `You are a helpful academic advisor assistant. Analyze schedules and provide concise, actionable recommendations.

Analyze this course schedule and provide recommendations:

**Schedule Details:**
- Total Credits: ${schedule.totalCredits ?? 0}
- Score: ${schedule.score ?? 0}/100
- Sections: ${sectionsInfo}

**Time Slots:**
${timeSlotsInfo}

**User Preferences:**
- Preferred time: ${preferences?.preferredStartTime || '08:00'} - ${preferences?.preferredEndTime || '17:00'}
- Max gap between classes: ${preferences?.maxGapMinutes || 60} minutes
- Prefer ${preferences?.preferMorning ? 'morning' : preferences?.preferAfternoon ? 'afternoon' : 'any'} classes
- Avoid days: ${preferences?.avoidDays?.join(', ') || 'None'}

Provide:
1. Schedule score assessment (is it good?)
2. Key strengths
3. Areas for improvement
4. Specific recommendations (max 3)`;
}

class UnifiedLLMService {
  private engine: MLCEngineInterface | null = null;
  private wllama: Wllama | null = null;
  private isInitialized = false;
  private isLoading = false;
  private config: LLMConfig = {
    provider: 'webllm',
    model: '',
    temperature: 0.7,
    maxTokens: 1024,
  };

  async initialize(config?: Partial<LLMConfig>): Promise<boolean> {
    if (this.isInitialized || this.isLoading) {
      return this.isInitialized;
    }

    this.isLoading = true;

    try {
      this.config = { ...this.config, ...config };

      switch (this.config.provider) {
        case 'webllm':
          return await this.initializeWebLLM();
        case 'wllama':
          return await this.initializeWllama();
        default:
          this.isInitialized = true;
          console.warn(`${this.config.provider} configured`);
          return true;
      }
    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      this.isInitialized = false;
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  private async initializeWebLLM(): Promise<boolean> {
    if (!('gpu' in navigator)) {
      throw new Error(
        'WebGPU is not supported in this browser. Please use Chrome 113+ or Firefox 141+.',
      );
    }

    const model = this.config.model || (await getDefaultModel('webllm'));

    this.engine = await CreateMLCEngine(model, {
      initProgressCallback: this.config.initProgressCallback,
    });

    this.isInitialized = true;
    console.warn('WebLLM initialized with model:', model);
    return true;
  }

  private async initializeWllama(): Promise<boolean> {
    const model = this.config.model || (await getDefaultModel('wllama'));
    this.config.model = model;

    const modelPath = this.getWllamaModelPath(model);

    this.wllama = new Wllama({
      'single-thread/wllama.wasm':
        'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.7/single-thread/wllama.wasm',
      'multi-thread/wllama.wasm':
        'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.7/multi-thread/wllama.wasm',
    });

    await this.wllama.loadModelFromUrl(modelPath, {
      progressCallback: (progress: { loaded: number; total: number }) => {
        if (this.config.initProgressCallback) {
          this.config.initProgressCallback({
            progress: progress.loaded / progress.total,
            text: `Loaded ${progress.loaded} of ${progress.total} bytes`,
          });
        }
      },
    });

    this.isInitialized = true;
    console.warn('Wllama initialized with model:', model);
    return true;
  }

  private getWllamaModelPath(modelName: string): string {
    const parts = modelName.split('/');
    const fileName = parts[parts.length - 1];
    const repo = parts.slice(0, -1).join('/') || 'TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF';
    return `https://huggingface.co/${repo}/resolve/main/${fileName}`;
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
      console.error('LLM completion failed:', error);
      throw new Error(`Failed to generate completion: ${(error as Error).message}`);
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

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    const response = await this.wllama.createCompletion(fullPrompt, {
      nPredict: this.config.maxTokens || 1024,
      sampling: {
        temp: this.config.temperature || 0.7,
      },
    });
    return response || 'No response generated';
  }

  private async callExternalAPI(prompt: string, systemPrompt?: string): Promise<string> {
    const { provider, apiKey, apiBaseUrl, model, temperature, maxTokens } = this.config;

    if (!apiKey) {
      throw new Error(`API key required for ${provider}`);
    }

    const messages: LLMMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    let url = apiBaseUrl;
    let body: unknown;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (provider) {
      case 'openai':
        url = url || 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = {
          model: model || 'gpt-3.5-turbo',
          messages,
          temperature,
          max_tokens: maxTokens,
        };
        break;

      case 'anthropic':
        url = url || 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        const systemMessage = messages.find((m) => m.role === 'system');
        const userMessages = messages.filter((m) => m.role !== 'system');
        body = {
          model: model || 'claude-3-haiku-20240307',
          max_tokens: maxTokens || 1024,
          system: systemMessage?.content,
          messages: userMessages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        };
        break;

      case 'custom':
        if (!url) {
          throw new Error('Custom API URL required');
        }
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        body = {
          model: model,
          messages,
          temperature,
          max_tokens: maxTokens,
        };
        break;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    const response = await fetch(url!, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error (${response.status}): ${error}`);
    }

    const data = await response.json();

    if (provider === 'anthropic') {
      return data.content?.[0]?.text || 'No response generated';
    }
    return data.choices?.[0]?.message?.content || 'No response generated';
  }

  async analyzeSchedule(schedule: Schedule, preferences: Preferences): Promise<string> {
    const prompt = buildScheduleAnalysisPrompt(schedule, preferences);
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
    this.isInitialized = false;
  }
}

export const llmService = new UnifiedLLMService();

export async function optimizeWithLLM(
  schedules: Schedule[],
  preferences: Preferences,
  config?: Partial<LLMConfig>,
): Promise<{
  schedules: Schedule[];
  bestSchedule: Schedule | null;
  aiAnalysis: string;
}> {
  await llmService.initialize(config);

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

  const analysis = await llmService.analyzeSchedule(schedules[0], preferences);

  return {
    schedules,
    bestSchedule: schedules[0] || null,
    aiAnalysis: analysis,
  };
}

export default llmService;
