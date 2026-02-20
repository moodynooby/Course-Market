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
  defaultModel: string;
  urlPlaceholder: string;
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    value: 'webllm',
    label: 'WebLLM (Browser-based, Free)',
    defaultModel: LLM_MODELS.webllm.laptop,
    urlPlaceholder: 'Not required',
  },
  {
    value: 'wllama',
    label: 'Wllama (Fallback, No WebGPU Required)',
    defaultModel: LLM_MODELS.wllama.laptop,
    urlPlaceholder: 'Not required',
  },
  {
    value: 'openai',
    label: 'OpenAI API',
    defaultModel: LLM_CONSTANTS.DEFAULT_MODELS.OPENAI,
    urlPlaceholder: LLM_CONSTANTS.API_DEFAULTS.OPENAI,
  },
  {
    value: 'anthropic',
    label: 'Anthropic Claude',
    defaultModel: LLM_CONSTANTS.DEFAULT_MODELS.ANTHROPIC,
    urlPlaceholder: LLM_CONSTANTS.API_DEFAULTS.ANTHROPIC,
  },
  {
    value: 'custom',
    label: 'Custom OpenAI-compatible API',
    defaultModel: '',
    urlPlaceholder: 'https://your-api.com/v1/chat/completions',
  },
] as const;
