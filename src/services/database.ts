// Database service using localStorage

import type { Course, Section, TradePost, Preferences } from '../types';

// Local storage keys
const COURSES_KEY = 'course_market_courses';
const SECTIONS_KEY = 'course_market_sections';
const TRADES_KEY = 'course_market_trades';
const PREFERENCES_KEY = 'course_market_preferences';
const USER_KEY = 'course_market_user';

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
export function saveTrades(trades: TradePost[]) {
  localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
}

export function getTrades(): TradePost[] {
  const saved = localStorage.getItem(TRADES_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function addTrade(trade: TradePost) {
  const trades = getTrades();
  trades.unshift(trade);
  saveTrades(trades);
  return trade;
}

export function updateTrade(tradeId: string, updates: Partial<TradePost>) {
  const trades = getTrades();
  const index = trades.findIndex((t) => t.id === tradeId);
  if (index !== -1) {
    trades[index] = { ...trades[index], ...updates };
    saveTrades(trades);
    return trades[index];
  }
  return null;
}

export function deleteTrade(tradeId: string) {
  const trades = getTrades();
  const filtered = trades.filter((t) => t.id !== tradeId);
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
