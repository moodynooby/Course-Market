// Database service using Drizzle with localStorage fallback

import type { Course, Section, Trade, Preferences } from '../types';

// Local storage keys
const COURSES_KEY = 'course_market_courses';
const SECTIONS_KEY = 'course_market_sections';
const TRADES_KEY = 'course_market_trades';
const PREFERENCES_KEY = 'course_market_preferences';
const USER_KEY = 'course_market_user';

// Database state
let dbAvailable = false;

export async function initDatabase(): Promise<boolean> {
  try {
    dbAvailable = false;
    return false;
  } catch {
    dbAvailable = false;
    return false;
  }
}

export function isDbAvailable(): boolean {
  return dbAvailable;
}

// User functions
export function saveUser(user: any) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): any | null {
  const saved = localStorage.getItem(USER_KEY);
  return saved ? JSON.parse(saved) : null;
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

// Courses functions
export function saveCourses(courses: Course[], sections: Section[]) {
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
  localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
}

export function getCourses(): { courses: Course[]; sections: Section[] } {
  const coursesStr = localStorage.getItem(COURSES_KEY);
  const sectionsStr = localStorage.getItem(SECTIONS_KEY);
  
  return {
    courses: coursesStr ? JSON.parse(coursesStr) : [],
    sections: sectionsStr ? JSON.parse(sectionsStr) : [],
  };
}

// Trades functions
export function saveTrades(trades: Trade[]) {
  localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
}

export function getTrades(): Trade[] {
  const saved = localStorage.getItem(TRADES_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function addTrade(trade: Trade) {
  const trades = getTrades();
  trades.unshift(trade);
  saveTrades(trades);
  return trade;
}

export function updateTrade(tradeId: string, updates: Partial<Trade>) {
  const trades = getTrades();
  const index = trades.findIndex(t => t.id === tradeId);
  if (index !== -1) {
    trades[index] = { ...trades[index], ...updates };
    saveTrades(trades);
    return trades[index];
  }
  return null;
}

export function deleteTrade(tradeId: string) {
  const trades = getTrades();
  const filtered = trades.filter(t => t.id !== tradeId);
  saveTrades(filtered);
}

// Preferences functions
export function savePreferences(prefs: Preferences) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
}

export function getPreferences(): Preferences | null {
  const saved = localStorage.getItem(PREFERENCES_KEY);
  return saved ? JSON.parse(saved) : null;
}

// Clear all data
export function clearAllData() {
  localStorage.removeItem(COURSES_KEY);
  localStorage.removeItem(SECTIONS_KEY);
  localStorage.removeItem(TRADES_KEY);
  localStorage.removeItem(PREFERENCES_KEY);
  localStorage.removeItem(USER_KEY);
}

// Generate sample trades
export function generateSampleTrades(userId: string, userName: string): Trade[] {
  const sampleTrades: Trade[] = [
    {
      id: `trade-${Date.now()}-1`,
      userId,
      userDisplayName: userName,
      courseCode: 'CS 101',
      courseName: 'Intro to Computer Science',
      sectionOffered: '001',
      sectionWanted: '002',
      action: 'offer',
      status: 'open',
      description: 'Can offer section 001 (Dr. Smith MWF 9:00) for section 002 (Dr. Jones MWF 10:00)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `trade-${Date.now()}-2`,
      userId,
      userDisplayName: userName,
      courseCode: 'MATH 201',
      courseName: 'Calculus II',
      sectionOffered: '002',
      sectionWanted: '001',
      action: 'request',
      status: 'open',
      description: 'Looking for morning section 001 (Dr. Brown MWF 8:00)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `trade-${Date.now()}-3`,
      userId,
      userDisplayName: 'Alice Johnson',
      courseCode: 'ENG 101',
      courseName: 'English Composition',
      sectionOffered: '002',
      sectionWanted: '001',
      action: 'offer',
      status: 'open',
      description: 'Available for trade with morning preference',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  
  const existing = getTrades();
  const combined = [...sampleTrades, ...existing];
  saveTrades(combined);
  return sampleTrades;
}