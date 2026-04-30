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

// Onboarding and User Profile types
export interface UserProfile {
  auth0UserId: string;
  displayName: string;
  email: string;
  phone: string;
  semesterId?: string;
  onboardingCompleted: boolean;
  preferences?: Preferences;
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
  version: string;
  semesterId: string;
  semesterName: string;
  exportedAt: string;
  sections: SectionJSON[];
  metadata: {
    totalSections: number;
    totalCourses: number;
    subjects: string[];
    creditsRange: {
      min: number;
      max: number;
    };
  };
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
  subjects: string[];
  semesters: string[];
  avgRating: number;
  avgDifficulty: number;
  avgChillness: number;
  avgStrictness: number;
  takeAgainPercent: number;
  totalRatings: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfessorRating {
  id: number;
  professorId: number;
  auth0UserId: string;
  userDisplayName: string;
  courseCode: string;
  rating: number;
  difficulty: number;
  takeAgain: boolean;
  chillness: number;
  strictness: number;
  tags: string[];
  comment: string;
  createdAt: string;
}
