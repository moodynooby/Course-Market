// Database service using localStorage

import type { Course, Section, TradePost } from '../types';
import { STORAGE_KEYS } from '../constants/storageKeys';

// User functions
export function saveUser(user: any) {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function getUser(): any | null {
  const saved = localStorage.getItem(STORAGE_KEYS.USER);
  return saved ? JSON.parse(saved) : null;
}

export function clearUser() {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// Courses functions
export function saveCourses(courses: Course[], sections: Section[]) {
  localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
}

export function getCourses(): { courses: Course[]; sections: Section[] } {
  const coursesStr = localStorage.getItem(STORAGE_KEYS.COURSES);
  const sectionsStr = localStorage.getItem(STORAGE_KEYS.SECTIONS);

  return {
    courses: coursesStr ? JSON.parse(coursesStr) : [],
    sections: sectionsStr ? JSON.parse(sectionsStr) : [],
  };
}

// Trades functions
export function saveTrades(trades: TradePost[]) {
  localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
}

export function getTrades(): TradePost[] {
  const saved = localStorage.getItem(STORAGE_KEYS.TRADES);
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
