// Storage keys for localStorage
export const STORAGE_KEYS = {
  PREFERENCES: 'auraishub_preferences',
  THEME_MODE: 'theme-mode',
  LLM_CONFIG: 'llm-byok-config',
} as const;

import type { LLMProvider, Preferences } from '../types';

export type LLMTask = 'OPTIMIZE' | 'DRAFT' | 'DEFAULT';

export interface BYOKConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  initProgressCallback?: (progress: { progress: number; text: string }) => void;
}

// LLM task-to-model mappings
export const LLM_TASK_MODELS = {
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

export function getDefaultModel(provider: LLMProvider, task: LLMTask = 'DEFAULT'): string {
  const taskKey = (task in LLM_TASK_MODELS ? task : 'DEFAULT') as keyof typeof LLM_TASK_MODELS;

  if (provider === 'groq') return LLM_TASK_MODELS[taskKey].groq;
  return LLM_TASK_MODELS[taskKey].webllm;
}

// LLM provider options
export const PROVIDER_OPTIONS = [
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
] as const;

// Default LLM configuration
export const DEFAULT_LLM_CONFIG = {
  provider: 'webllm' as const,
  apiKey: '',
  model: LLM_TASK_MODELS.DEFAULT.webllm,
  temperature: 0.7,
  maxTokens: 1024,
};

// Default user preferences
export const DEFAULT_PREFERENCES: Preferences = {
  preferredStartTime: '08:00',
  preferredEndTime: '17:00',
  maxGapMinutes: 60,
  preferConsecutiveDays: true,
  preferMorning: false,
  preferAfternoon: false,
  preferNoEvening: false,
  maxCredits: 18,
  minCredits: 12,
  avoidDays: [],
};

export interface SchedulePreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  preferences: Partial<Preferences>;
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: 'compact',
    label: 'Compact',
    description: 'Early start, tight gaps, morning focused',
    icon: '🌅',
    preferences: {
      preferredStartTime: '08:00',
      preferredEndTime: '15:00',
      maxGapMinutes: 15,
      preferConsecutiveDays: true,
      preferMorning: true,
      preferAfternoon: false,
      preferNoEvening: true,
      minCredits: 15,
      maxCredits: 18,
    },
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Standard 9–5, moderate gaps',
    icon: '⚖️',
    preferences: {
      preferredStartTime: '09:00',
      preferredEndTime: '17:00',
      maxGapMinutes: 60,
      preferConsecutiveDays: false,
      preferMorning: false,
      preferAfternoon: false,
      preferNoEvening: false,
      minCredits: 12,
      maxCredits: 15,
    },
  },
  {
    id: 'spread',
    label: 'Spread Out',
    description: 'Later start, room between classes',
    icon: '🌇',
    preferences: {
      preferredStartTime: '10:00',
      preferredEndTime: '19:00',
      maxGapMinutes: 120,
      preferConsecutiveDays: false,
      preferMorning: false,
      preferAfternoon: true,
      preferNoEvening: false,
      minCredits: 9,
      maxCredits: 12,
    },
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Manual tweaks',
    icon: '⚙️',
    preferences: {},
  },
];
