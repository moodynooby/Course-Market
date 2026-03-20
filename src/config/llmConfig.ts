import { getGPUTier } from 'detect-gpu';
import type { LLMProvider } from '../types';
import { ENV } from './devConfig';

// --- Tasks ---
export type LLMTask = 'SEARCH' | 'OPTIMIZE' | 'DRAFT' | 'DEFAULT';

// --- Model Constants ---
const LLAMA_1B_GGUF = `https://huggingface.co/hugging-quants/Llama-3.2-1B-Instruct-Q4_K_M-GGUF/resolve/main/llama-3.2-1b-instruct-q4_k_m.gguf`;
const SMOLLM2_135M_GGUF = `https://huggingface.co/QuantFactory/SmolLM2-135M-GGUF/resolve/main/SmolLM2-135M.Q4_0.gguf`;
export const LLM_TASK_MODELS = {
  SEARCH: {
    webllm: 'Qwen2-0.5B-Instruct-q4f16_1-MLC',
    wllama: SMOLLM2_135M_GGUF,
    groq: 'llama-3.1-8b-instant',
  },
  OPTIMIZE: {
    webllm: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    wllama: LLAMA_1B_GGUF,
    groq: 'llama-3.3-70b-versatile',
  },
  DRAFT: {
    webllm: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    wllama: SMOLLM2_135M_GGUF,
    groq: 'llama-3.1-8b-instant',
  },
  DEFAULT: {
    webllm: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    wllama: SMOLLM2_135M_GGUF,
    groq: 'llama-3.1-8b-instant',
  },
} as const;

export const LLM_CONSTANTS = {
  WLLAMA_WASM: {
    'single-thread':
      'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.7/esm/single-thread/wllama.wasm',
    'multi-thread':
      'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.7/esm/multi-thread/wllama.wasm',
  },
  API_DEFAULTS: {
    OPENAI: 'https://api.openai.com/v1/chat/completions',
    ANTHROPIC: 'https://api.anthropic.com/v1/messages',
    GROQ: 'https://api.groq.com/openai/v1/chat/completions',
  },
  DEFAULT_MODELS: {
    OPENAI: 'gpt-4o-mini',
    ANTHROPIC: 'claude-3-haiku-20240307',
    GROQ: 'llama-3.3-70b-versatile',
  },
} as const;

// --- Config Types ---
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
  model: LLM_TASK_MODELS.DEFAULT.webllm,
  temperature: 0.7,
  maxTokens: 1024,
};

// --- Storage ---
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

// --- Helpers ---
export async function getDefaultModel(
  provider: LLMProvider,
  task: LLMTask = 'DEFAULT',
): Promise<string> {
  const taskKey = (task in LLM_TASK_MODELS ? task : 'DEFAULT') as keyof typeof LLM_TASK_MODELS;

  // Cloud providers: Always task-optimized
  if (provider === 'groq') return LLM_TASK_MODELS[taskKey].groq;
  if (provider === 'openai') {
    return taskKey === 'OPTIMIZE' ? 'gpt-4o' : LLM_CONSTANTS.DEFAULT_MODELS.OPENAI;
  }
  if (provider === 'anthropic') {
    return taskKey === 'OPTIMIZE'
      ? 'claude-3-5-sonnet-20240620'
      : LLM_CONSTANTS.DEFAULT_MODELS.ANTHROPIC;
  }

  // Hardware detection for local providers
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

  let gpuTier = 2;
  try {
    const tier = await getGPUTier();
    gpuTier = tier.tier;
  } catch (e) {
    if (ENV.IS_DEV) console.warn('Failed to detect GPU tier:', e);
  }

  // Choose CPU-based model for mobile or low-end GPUs
  if (isMobile || gpuTier < 1) {
    return LLM_TASK_MODELS[taskKey].wllama;
  }

  return LLM_TASK_MODELS[taskKey][provider];
}

// --- UI Options ---
export interface ProviderOption {
  value: LLMProvider;
  label: string;
  description: string;
  learnMoreUrl?: string;
  defaultModel: string;
  urlPlaceholder: string;
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    value: 'webllm',
    label: 'Local AI (GPU Accelerated)',
    description: 'Fastest local option. Requires WebGPU (Chrome/Edge).',
    learnMoreUrl: 'https://mlc.ai/web-llm/',
    defaultModel: LLM_TASK_MODELS.DEFAULT.webllm,
    urlPlaceholder: 'Not required',
  },
  {
    value: 'wllama',
    label: 'Universal AI (CPU / WASM)',
    description: 'Runs on any browser. Slower but very compatible.',
    learnMoreUrl: 'https://github.com/abnerworks/wllama',
    defaultModel: LLM_TASK_MODELS.DEFAULT.wllama,
    urlPlaceholder: 'Not required',
  },
  {
    value: 'groq',
    label: 'Groq (High-Speed Fallback)',
    description: 'Lightning-fast cloud inference. Requires Groq API key.',
    learnMoreUrl: 'https://groq.com/',
    defaultModel: LLM_TASK_MODELS.DEFAULT.groq,
    urlPlaceholder: LLM_CONSTANTS.API_DEFAULTS.GROQ,
  },
  {
    value: 'openai',
    label: 'OpenAI (GPT-4o Mini)',
    description: 'Cloud API. Best quality, requires API key.',
    learnMoreUrl: 'https://openai.com/api/',
    defaultModel: LLM_CONSTANTS.DEFAULT_MODELS.OPENAI,
    urlPlaceholder: LLM_CONSTANTS.API_DEFAULTS.OPENAI,
  },
  {
    value: 'anthropic',
    label: 'Anthropic (Claude 3)',
    description: 'High-quality cloud API. Requires API key.',
    learnMoreUrl: 'https://anthropic.com/api/',
    defaultModel: LLM_CONSTANTS.DEFAULT_MODELS.ANTHROPIC,
    urlPlaceholder: LLM_CONSTANTS.API_DEFAULTS.ANTHROPIC,
  },
] as const;
