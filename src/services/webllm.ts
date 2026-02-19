// Real WebLLM integration for browser-based LLM inference
// Uses @mlc-ai/web-llm for in-browser AI with WebGPU acceleration

import * as webllm from '@mlc-ai/web-llm';

export type LLMProvider = 'webllm' | 'openai' | 'anthropic' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  // BYOK fields
  apiKey?: string;
  apiBaseUrl?: string;
  // WebLLM specific
  initProgressCallback?: (progress: webllm.InitProgressReport) => void;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class WebLLMService {
  private engine: webllm.MLCEngineInterface | null = null;
  private isInitialized = false;
  private isLoading = false;
  private config: LLMConfig = {
    provider: 'webllm',
    model: 'Llama-3-8B-Instruct-q4f32_1-MLC',
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

      if (this.config.provider === 'webllm') {
        // Check WebGPU support
        if (!('gpu' in navigator)) {
          throw new Error(
            'WebGPU is not supported in this browser. Please use Chrome 113+ or Edge 113+.',
          );
        }

        // Initialize WebLLM engine
        this.engine = new webllm.MLCEngine();

        // Set up progress callback
        if (this.config.initProgressCallback) {
          this.engine.setInitProgressCallback(this.config.initProgressCallback);
        }

        // Load the model
        if (this.config.model) {
          await this.engine.reload(this.config.model, {
            temperature: this.config.temperature,
          });
        }

        this.isInitialized = true;
        console.warn('WebLLM initialized with model:', this.config.model);
        return true;
      }

      // For other providers (BYOK), just store config
      this.isInitialized = true;
      console.warn(`${this.config.provider} configured`);
      return true;
    } catch (error) {
      console.warn('Failed to initialize LLM:', error);
      this.isInitialized = false;
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('LLM service not initialized');
    }

    try {
      if (this.config.provider === 'webllm' && this.engine) {
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

      // BYOK: External API call
      return await this.callExternalAPI(prompt, systemPrompt);
    } catch (error) {
      console.error('LLM completion failed:', error);
      throw new Error(`Failed to generate completion: ${(error as Error).message}`);
    }
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
    let body: any;
    const headers: any = {
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
        // Anthropic format
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

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error (${response.status}): ${error}`);
    }

    const data = await response.json();

    // Parse response based on provider
    if (provider === 'anthropic') {
      return data.content?.[0]?.text || 'No response generated';
    }
    return data.choices?.[0]?.message?.content || 'No response generated';
  }

  async analyzeSchedule(schedule: any, preferences: any): Promise<string> {
    const systemPrompt = `You are a helpful academic advisor assistant. Analyze schedules and provide concise, actionable recommendations.`;

    const prompt = `Analyze this course schedule and provide recommendations:

**Schedule Details:**
- Total Credits: ${schedule.totalCredits}
- Score: ${schedule.score}/100
- Sections: ${schedule.sections.map((s: any) => `${s.code} Section ${s.sectionNumber} (${s.instructor})`).join(', ')}

**Time Slots:**
${schedule.sections
  .map(
    (s: any) =>
      `${s.code}: ${s.timeSlots.map((t: any) => `${t.day} ${t.startTime}-${t.endTime}`).join(', ')}`,
  )
  .join('\n')}

**User Preferences:**
- Preferred time: ${preferences.preferredStartTime || '08:00'} - ${preferences.preferredEndTime || '17:00'}
- Max gap between classes: ${preferences.maxGapMinutes || 60} minutes
- Prefer ${preferences.preferMorning ? 'morning' : preferences.preferAfternoon ? 'afternoon' : 'any'} classes
- Avoid days: ${preferences.avoidDays?.join(', ') || 'None'}

Provide:
1. Schedule score assessment (is it good?)
2. Key strengths
3. Areas for improvement  
4. Specific recommendations (max 3)`;

    return this.generateCompletion(prompt, systemPrompt);
  }

  async getScheduleAdvice(courses: any[], preferences: any): Promise<string> {
    const systemPrompt = `You are a helpful academic advisor. Provide strategic advice for course selection.`;

    const prompt = `Provide advice for selecting sections from these courses:

**Available Courses:**
${courses.map((c: any) => `- ${c.code}: ${c.name} (${c.credits} credits)`).join('\n')}

**User Preferences:**
- Time preference: ${preferences.preferMorning ? 'Morning' : preferences.preferAfternoon ? 'Afternoon' : 'Flexible'}
- Credit range: ${preferences.minCredits}-${preferences.maxCredits}
- Max gap: ${preferences.maxGapMinutes} minutes

Provide strategic advice for optimal course and section selection.`;

    return this.generateCompletion(prompt, systemPrompt);
  }

  isSupported(): boolean {
    if (this.config.provider === 'webllm') {
      return 'gpu' in navigator;
    }
    return true; // Other providers always supported via API
  }

  isReady(): boolean {
    return this.isInitialized && !this.isLoading;
  }

  getProvider(): LLMProvider {
    return this.config.provider;
  }

  getModel(): string | undefined {
    return this.config.model;
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
    }
    this.isInitialized = false;
  }
}

// Global instance
export const webLLM = new WebLLMService();

// Convenience functions
export async function isWebLLMAvailable(): Promise<boolean> {
  return webLLM.isSupported();
}

export async function optimizeWithWebLLM(
  schedules: any[],
  preferences: any,
  config?: Partial<LLMConfig>,
): Promise<any> {
  // Initialize with optional config
  await webLLM.initialize(config);

  if (!webLLM.isReady()) {
    throw new Error('LLM not available or not initialized');
  }

  if (schedules.length === 0) {
    return {
      schedules,
      bestSchedule: null,
      error: 'No schedules to optimize',
    };
  }

  // Analyze the best schedule
  const analysis = await webLLM.analyzeSchedule(schedules[0], preferences);

  return {
    schedules,
    bestSchedule: schedules[0] || null,
    aiAnalysis: analysis,
  };
}

export default webLLM;
