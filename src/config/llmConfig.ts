import type { LLMProvider } from '../types';
import { ENV } from './devConfig';

// --- LLM ---
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

export const LLM_CONSTANTS = {
  WLLAMA_WASM: {
    'single-thread': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.7/single-thread/wllama.wasm',
    'multi-thread': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.7/multi-thread/wllama.wasm',
  },
  API_DEFAULTS: {
    OPENAI: 'https://api.openai.com/v1/chat/completions',
    ANTHROPIC: 'https://api.anthropic.com/v1/messages',
  },
  DEFAULT_MODELS: {
    OPENAI: 'gpt-3.5-turbo',
    ANTHROPIC: 'claude-3-haiku-20240307',
  },
  ANTHROPIC_API_VERSION: '2023-06-01',
} as const;

export interface BYOKConfig {
  provider: LLMProvider;
  apiKey: string;
  apiBaseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  initProgressCallback?: (progress: { progress: number; text: string }) => void;
}

export const DEFAULT_LLM_CONFIG: BYOKConfig = {
  provider: 'webllm',
  apiKey: '',
  model: LLM_MODELS.webllm.laptop,
  temperature: 0.7,
  maxTokens: 1024,
};

const LLM_CONFIG_STORAGE_KEY = 'llm-byok-config';

export function getLlmConfig(): BYOKConfig {
  try {
    const savedLlm = localStorage.getItem(LLM_CONFIG_STORAGE_KEY);
    if (savedLlm) {
      return { ...DEFAULT_LLM_CONFIG, ...JSON.parse(savedLlm) };
    }
  } catch (error) {
    if (ENV.IS_DEV) console.error('Failed to parse LLM config from localStorage:', error);
  }
  return DEFAULT_LLM_CONFIG;
}

export function saveLlmConfig(config: BYOKConfig): void {
  try {
    localStorage.setItem(LLM_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    if (ENV.IS_DEV) console.error('Failed to save LLM config to localStorage:', error);
  }
}

export function clearLlmConfig(): void {
  localStorage.removeItem(LLM_CONFIG_STORAGE_KEY);
}

export async function getDefaultModel(
  provider: 'webllm' | 'wllama',
  isMobile: boolean = false,
): Promise<string> {
  const models = LLM_MODELS[provider];
  if (!models) return '';
  return isMobile ? models.mobile : models.laptop;
}

export interface ProviderOption {
  value: LLMProvider;
  label: string;
  description: string;
  learnMoreUrl?: string;
  defaultModel: string;
  urlPlaceholder: string;
}

export interface ModelOption {
  value: string;
  label: string;
  description: string;
  recommendedFor: 'balanced' | 'speed' | 'quality';
}

export const MODEL_OPTIONS: Record<string, ModelOption[]> = {
  webllm: [
    {
      value: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
      label: 'Llama 3.2 (1B params)',
      description: 'Best balance of speed and quality. Great for most users.',
      recommendedFor: 'balanced',
    },
    {
      value: 'SmolLM-1.7B-Instruct-q4f16_1-MLC',
      label: 'SmolLM (1.7B params)',
      description: 'Fastest option. Best for older computers.',
      recommendedFor: 'speed',
    },
    {
      value: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
      label: 'Phi-3.5 Mini',
      description: "Microsoft's efficient model. Good quality, moderate speed.",
      recommendedFor: 'balanced',
    },
    {
      value: 'Qwen2-0.5B-Instruct-q4f16_1-MLC',
      label: 'Qwen 2 (0.5B params)',
      description: 'Lightest option. Very fast, basic quality.',
      recommendedFor: 'speed',
    },
  ],
  wllama: [
    {
      value: 'TinyLlama-1.1B-Chat-v1.0.Q4_K_M.gguf',
      label: 'TinyLlama (1.1B params)',
      description: 'Reliable fallback. Works on any browser.',
      recommendedFor: 'speed',
    },
    {
      value: 'phi-2.Q4_K_M.gguf',
      label: 'Phi-2 (2.7B params)',
      description: "Microsoft's model. Better quality, slower.",
      recommendedFor: 'balanced',
    },
    {
      value: 'mistral-7b-instruct-v0.2.Q4_K_M.gguf',
      label: 'Mistral 7B (7B params)',
      description: 'High quality but needs more memory. Slower.',
      recommendedFor: 'quality',
    },
    {
      value: 'gemma-2b-it-q4_k_m.gguf',
      label: 'Gemma 2B (2B params)',
      description: "Google's model. Good quality, moderate speed.",
      recommendedFor: 'balanced',
    },
    {
      value: 'qwen-0.5b-chat-q4_k_m.gguf',
      label: 'Qwen 0.5B (0.5B params)',
      description: "Alibaba's tiny model. Fastest, basic quality.",
      recommendedFor: 'speed',
    },
  ],
  openai: [
    {
      value: 'gpt-3.5-turbo',
      label: 'GPT-3.5 Turbo',
      description: 'Fast and affordable. Good for most tasks.',
      recommendedFor: 'balanced',
    },
    {
      value: 'gpt-4o-mini',
      label: 'GPT-4o Mini',
      description: 'Cheapest GPT-4 option. Great quality-to-price ratio.',
      recommendedFor: 'quality',
    },
    {
      value: 'gpt-4o',
      label: 'GPT-4o',
      description: 'Most capable. Best quality but expensive.',
      recommendedFor: 'quality',
    },
  ],
  anthropic: [
    {
      value: 'claude-3-haiku-20240307',
      label: 'Claude 3 Haiku',
      description: 'Fast and affordable. Great for quick responses.',
      recommendedFor: 'balanced',
    },
    {
      value: 'claude-3-sonnet-20240229',
      label: 'Claude 3 Sonnet',
      description: 'Better quality. Good balance of speed and capability.',
      recommendedFor: 'quality',
    },
  ],
  custom: [],
};

export const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    value: 'webllm',
    label: 'Local AI (Free & Private)',
    description: 'Runs on your device. No internet needed after first download.',
    learnMoreUrl: 'https://mlc.ai/web-llm/',
    defaultModel: LLM_MODELS.webllm.laptop,
    urlPlaceholder: 'Not required',
  },
  {
    value: 'wllama',
    label: 'Universal AI (Works Everywhere)',
    description: 'Reliable fallback. Works on any browser.',
    learnMoreUrl: 'https://github.com/abnerworks/wllama',
    defaultModel: LLM_MODELS.wllama.laptop,
    urlPlaceholder: 'Not required',
  },
  {
    value: 'openai',
    label: 'OpenAI (GPT)',
    description: 'Requires API key. Pay per use.',
    learnMoreUrl: 'https://openai.com/api/',
    defaultModel: LLM_CONSTANTS.DEFAULT_MODELS.OPENAI,
    urlPlaceholder: LLM_CONSTANTS.API_DEFAULTS.OPENAI,
  },
  {
    value: 'anthropic',
    label: 'Anthropic (Claude)',
    description: 'Requires API key. Pay per use.',
    learnMoreUrl: 'https://www.anthropic.com/claude',
    defaultModel: LLM_CONSTANTS.DEFAULT_MODELS.ANTHROPIC,
    urlPlaceholder: LLM_CONSTANTS.API_DEFAULTS.ANTHROPIC,
  },
  {
    value: 'custom',
    label: 'Custom API',
    description: 'Use your own OpenAI-compatible API endpoint.',
    defaultModel: '',
    urlPlaceholder: 'https://your-api.com/v1/chat/completions',
  },
] as const;
