export const STORAGE_KEYS = {
  PREFERENCES: 'auraishub_preferences',
  THEME_MODE: 'theme-mode',
} as const;

import type { Preferences } from '../types';

export const DEFAULT_PREFERENCES: Preferences = {
  preferredStartTime: '08:00',
  preferredEndTime: '17:00',
  maxGapMinutes: 60,
  preferConsecutiveDays: true,
  preferMorning: false,
  preferAfternoon: false,
  preferEvening: false,
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
      preferEvening: false,
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
      preferEvening: false,
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
      preferEvening: false,
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
