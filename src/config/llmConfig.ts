import type { LLMProvider } from '../types';
import { ENV } from './devConfig';

export type LLMTask = 'SEARCH' | 'OPTIMIZE' | 'DRAFT' | 'DEFAULT';

export const LLM_TASK_MODELS = {
  SEARCH: {
    webllm: 'Qwen2-0.5B-Instruct-q4f16_1-MLC',
    groq: 'llama-3.1-8b-instant',
  },
  OPTIMIZE: {
    webllm: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    groq: 'llama-3.3-70b-versatile',
  },
  DRAFT: {
    webllm: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    groq: 'llama-3.1-8b-instant',
  },
  DEFAULT: {
    webllm: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    groq: 'llama-3.1-8b-instant',
  },
} as const;

export interface BYOKConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  initProgressCallback?: (progress: { progress: number; text: string }) => void;
}

export const DEFAULT_LLM_CONFIG: BYOKConfig = {
  provider: 'webllm',
  apiKey: '',
  model: LLM_TASK_MODELS.DEFAULT.webllm,
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

export function getDefaultModel(provider: LLMProvider, task: LLMTask = 'DEFAULT'): string {
  const taskKey = (task in LLM_TASK_MODELS ? task : 'DEFAULT') as keyof typeof LLM_TASK_MODELS;

  if (provider === 'groq') return LLM_TASK_MODELS[taskKey].groq;
  return LLM_TASK_MODELS[taskKey].webllm;
}

export interface ProviderOption {
  value: LLMProvider;
  label: string;
  description: string;
  learnMoreUrl?: string;
  defaultModel: string;
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    value: 'webllm',
    label: 'Local AI (GPU Accelerated)',
    description:
      'Fastest option. Runs completely on your device. Requires Chrome/Edge with WebGPU.',
    learnMoreUrl: 'https://mlc.ai/web-llm/',
    defaultModel: LLM_TASK_MODELS.DEFAULT.webllm,
  },
  {
    value: 'groq',
    label: 'Groq Cloud (Fast)',
    description: 'High-speed cloud inference. Uses a shared key by default, or enter your own.',
    learnMoreUrl: 'https://groq.com/',
    defaultModel: LLM_TASK_MODELS.DEFAULT.groq,
  },
];
