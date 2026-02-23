export interface Course {
  id: string;
  code: string;
  name: string;
  subject: string;
  credits: number;
  description?: string;
}

export interface Section {
  id: string;
  courseId: string;
  sectionNumber: string;
  instructor: string;
  timeSlots: TimeSlot[];
  capacity: number;
  enrolled: number;
}

export interface TimeSlot {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

export type DayOfWeek = 'M' | 'T' | 'W' | 'Th' | 'F' | 'Sa' | 'Su';

export interface Schedule {
  id: string;
  name: string;
  sections: Section[];
  totalCredits: number;
  score: number;
  conflicts: string[];
}

export interface Preferences {
  preferredStartTime: string;
  preferredEndTime: string;
  maxGapMinutes: number;
  preferConsecutiveDays: boolean;
  preferMorning: boolean;
  preferAfternoon: boolean;
  maxCredits: number;
  minCredits: number;
  avoidDays: DayOfWeek[];
  excludeInstructors: string[];
  theme?: 'light' | 'dark' | 'system';
}

export interface TradePost {
  id: string;
  auth0UserId: string;
  userDisplayName: string;
  userEmail: string;
  userAvatarUrl?: string;
  courseCode: string;
  courseName: string;
  sectionOffered: string;
  sectionWanted: string;
  action: 'offer' | 'request';
  status: 'open' | 'pending' | 'completed' | 'cancelled';
  description?: string;
  contactPhone: string;
  createdAt: string;
  updatedAt: string;
}

export interface CSVParseResult {
  courses: Course[];
  sections: Section[];
  errors: string[];
  warnings: string[];
}

export type LLMProvider = 'webllm' | 'wllama' | 'openai' | 'anthropic' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  apiBaseUrl?: string;
  initProgressCallback?: (progress: { progress: number; text: string }) => void;
}
