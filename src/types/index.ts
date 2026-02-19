export interface Course {
  id: string;
  code: string;
  name: string;
  subject: string;
  credits: number;
  description?: string;
  sourceCsv?: string;
  importedAt?: string;
}

export interface Section {
  id: string;
  courseId: string;
  sectionNumber: string;
  instructor: string;
  location: string;
  timeSlots: TimeSlot[];
  capacity: number;
  enrolled: number;
  term?: string;
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
  userId: string;
  displayName: string;
  email?: string;
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
  userId: string;
  userDisplayName: string;
  courseCode: string;
  courseName: string;
  sectionOffered: string;
  sectionWanted: string;
  action: 'offer' | 'request';
  status: 'open' | 'pending' | 'completed' | 'cancelled';
  description?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  provider: 'google' | 'github' | 'phone' | 'email';
  phoneNumber?: string;
  createdAt: string;
}

export interface ContactRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  tradeId?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface CSVParseResult {
  success: boolean;
  courses: Course[];
  sections: Section[];
  errors: string[];
  warnings: string[];
}

export interface OptimizationResult {
  schedules: Schedule[];
  bestSchedule: Schedule | null;
  aiAnalysis?: string;
  error?: string;
}

export interface ThemeMode {
  mode: 'light' | 'dark' | 'system';
  isDark: boolean;
}
