import type { Course, Preferences, Section } from '../types';
import type { ScheduleDiagnostics } from '../utils/schedule-diagnostics';
import type { PrefilterSummary } from '../utils/schedule-prefilter';
import type { GeneratedSchedule } from '../utils/schedule-types';
import { api } from './apiClient';

export interface GenerateSchedulesPayload {
  courses: Course[];
  sections: Section[];
  scheduleSections?: Section[];
  pinnedSelections?: Record<string, string>;
  preferences: Preferences;
  options?: {
    maxSchedules?: number;
  };
}

export interface GenerateSchedulesResponse {
  schedules: GeneratedSchedule[];
  summary: PrefilterSummary | null;
  diagnostics: ScheduleDiagnostics | null;
}

export async function generateSchedulesApi(
  payload: GenerateSchedulesPayload,
): Promise<GenerateSchedulesResponse> {
  return api.post<GenerateSchedulesResponse>('/schedules/generate', payload);
}
