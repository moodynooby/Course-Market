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
  startDate?: string;
  endDate?: string;
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
  preferNoEvening?: boolean;
  maxCredits: number;
  minCredits: number;
  avoidDays: DayOfWeek[];
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
  status: 'open' | 'filled' | 'cancelled';
  description?: string;
  contactPhone: string;
  createdAt: string;
  updatedAt: string;
}

export type LLMProvider = 'webllm' | 'groq';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource?: {
    section: Section;
    course?: Course;
  };
}

export interface UserProfile {
  auth0UserId: string;
  phone: string;
  semesterId?: string;
  preferences?: Preferences;
  courseSelections?: Record<string, string>;
  pinnedSelections?: Record<string, string>;
  llmConfig?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  id: string;
  name: string;
  jsonUrl?: string;
  isActive: boolean;
}

// JSON file structure for semester data
export interface SemesterJSON {
  semesterId: string;
  semesterName: string;
  sections: SectionJSON[];
}

export interface SectionJSON {
  id: string;
  courseId?: string; // Optional for backward compatibility
  courseCode: string;
  courseName: string;
  sectionNumber: string;
  instructor: string;
  credits: number;
  subject: string;
  capacity: number;
  enrolled: number;
  timeSlots: TimeSlot[];
}

export interface Professor {
  id: number;
  name: string;
  department?: string | null;
  avgRating?: number;
  avgDifficulty?: number;
  ratingCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfessorRating {
  id: number;
  professorId: number;
  auth0UserId: string;
  rating: number;
  difficulty: number;
  comment: string;
  courseCode: string;
  semesterId: string;
  takeAgain: boolean;
  createdAt: string;
}

export interface ProfessorDetails extends Professor {
  ratings: ProfessorRating[];
}
