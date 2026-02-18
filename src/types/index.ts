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
  location: string;
  timeSlots: TimeSlot[];
  capacity: number;
  enrolled: number;
  term?: string;
}

export interface TimeSlot {
  day: DayOfWeek;
  startTime: string; // 24-hour format "HH:MM"
  endTime: string;   // 24-hour format "HH:MM"
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
  preferredStartTime: string; // "HH:MM"
  preferredEndTime: string;   // "HH:MM"
  maxGapMinutes: number;
  preferConsecutiveDays: boolean;
  preferMorning: boolean;
  preferAfternoon: boolean;
  maxCredits: number;
  minCredits: number;
  avoidDays: DayOfWeek[];
  excludeInstructors: string[];
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
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
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
