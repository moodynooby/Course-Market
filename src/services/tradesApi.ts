import type { TradePost, UserProfile } from '../types';

const NETLIFY_FUNCTION_URL = import.meta.env.VITE_NETLIFY_FUNCTION_URL;
const LOCAL_STORAGE_KEY = 'course_market_trades';
const USERS_KEY = 'course_market_users';

let isOnlineMode = !!NETLIFY_FUNCTION_URL;

export function configureTrading(online: boolean = true): void {
  isOnlineMode = online && !!NETLIFY_FUNCTION_URL;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function getStoredUsers(): UserProfile[] {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function storeUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Failed to store users:', e);
  }
}

function getStoredTrades(): TradePost[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function storeTrades(trades: TradePost[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trades));
  } catch (e) {
    console.warn('Failed to store trades:', e);
  }
}

async function fetchFromNetlify(path: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${NETLIFY_FUNCTION_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Netlify function error: ${response.statusText}`);
  }

  return response.json();
}

export async function createUser(displayName: string, email?: string): Promise<UserProfile> {
  const newUser: UserProfile = {
    id: generateUserId(),
    displayName,
    email: email || '',
    provider: 'email',
    createdAt: new Date().toISOString(),
  };

  if (isOnlineMode) {
    try {
      await fetchFromNetlify('/trades', {
        method: 'POST',
        body: JSON.stringify({ action: 'createUser', user: newUser }),
      });
    } catch (error) {
      console.warn('Failed to create user online, falling back to local:', error);
      isOnlineMode = false;
    }
  }

  if (!isOnlineMode) {
    const users = getStoredUsers();
    users.push(newUser);
    storeUsers(users);
  }

  return newUser;
}

export async function getTrades(): Promise<TradePost[]> {
  if (isOnlineMode) {
    try {
      const result = await fetchFromNetlify('/trades');
      return result.trades || [];
    } catch (error) {
      console.warn('Failed to fetch trades from Netlify, falling back to local:', error);
      isOnlineMode = false;
    }
  }

  if (!isOnlineMode) {
    return getStoredTrades();
  }

  return [];
}

export async function createTrade(
  userId: string,
  userDisplayName: string,
  tradeData: {
    courseCode: string;
    courseName: string;
    sectionOffered: string;
    sectionWanted: string;
    action: 'offer' | 'request';
    description?: string;
  }
): Promise<TradePost> {
  const trade: TradePost = {
    id: generateId(),
    userId,
    userDisplayName,
    ...tradeData,
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isOnlineMode) {
    try {
      const result = await fetchFromNetlify('/trades', {
        method: 'POST',
        body: JSON.stringify({ action: 'createTrade', trade }),
      });
      return result.trade || trade;
    } catch (error) {
      console.warn('Failed to create trade online, falling back to local:', error);
      isOnlineMode = false;
    }
  }

  if (!isOnlineMode) {
    const trades = getStoredTrades();
    trades.push(trade);
    storeTrades(trades);
    return trade;
  }

  return trade;
}

export async function updateTradeStatus(
  tradeId: string,
  status: 'pending' | 'completed' | 'cancelled'
): Promise<TradePost | null> {
  if (isOnlineMode) {
    try {
      const result = await fetchFromNetlify('/trades', {
        method: 'PUT',
        body: JSON.stringify({ action: 'updateTrade', tradeId, status }),
      });
      return result.trade || null;
    } catch (error) {
      console.warn('Failed to update trade online, falling back to local:', error);
      isOnlineMode = false;
    }
  }

  if (!isOnlineMode) {
    const trades = getStoredTrades();
    const index = trades.findIndex(t => t.id === tradeId);
    
    if (index !== -1) {
      trades[index] = {
        ...trades[index],
        status,
        updatedAt: new Date().toISOString(),
      };
      storeTrades(trades);
      return trades[index];
    }
  }

  return null;
}

export async function deleteTrade(tradeId: string): Promise<boolean> {
  if (isOnlineMode) {
    try {
      await fetchFromNetlify('/trades', {
        method: 'DELETE',
        body: JSON.stringify({ action: 'deleteTrade', tradeId }),
      });
      return true;
    } catch (error) {
      console.warn('Failed to delete trade online, falling back to local:', error);
      isOnlineMode = false;
    }
  }

  if (!isOnlineMode) {
    const trades = getStoredTrades();
    const filteredTrades = trades.filter(t => t.id !== tradeId);
    storeTrades(filteredTrades);
    return true;
  }

  return false;
}

export async function searchTrades(
  filters?: {
    courseCode?: string;
    action?: 'offer' | 'request';
    status?: string;
  }
): Promise<TradePost[]> {
  const trades = await getTrades();
  
  if (!filters) {
    return trades;
  }

  return trades.filter(trade => {
    if (filters.courseCode && !trade.courseCode.toLowerCase().includes(filters.courseCode.toLowerCase())) {
      return false;
    }
    if (filters.action && trade.action !== filters.action) {
      return false;
    }
    if (filters.status && trade.status !== filters.status) {
      return false;
    }
    return true;
  });
}

export function getConnectionStatus(): {
  isOnlineMode: boolean;
  hasNetlify: boolean;
  mode: 'online' | 'local';
} {
  return {
    isOnlineMode,
    hasNetlify: !!NETLIFY_FUNCTION_URL,
    mode: isOnlineMode ? 'online' : 'local'
  };
}

export function generateSampleTrades(userId: string, userName: string): void {
  const sampleTrades: Omit<TradePost, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      userId,
      userDisplayName: userName,
      courseCode: 'CS 101',
      courseName: 'Intro to Computer Science',
      sectionOffered: '001',
      sectionWanted: '002',
      action: 'offer',
      status: 'open',
      description: 'Can offer section 001 (Dr. Smith MWF 9:00) for section 002 (Dr. Jones MWF 10:00)'
    },
    {
      userId,
      userDisplayName: userName,
      courseCode: 'MATH 201',
      courseName: 'Calculus II',
      sectionOffered: '002',
      sectionWanted: '001',
      action: 'request',
      status: 'open',
      description: 'Looking for morning section 001 (Dr. Brown MWF 8:00)'
    },
    {
      userId,
      userDisplayName: 'Alice Johnson',
      courseCode: 'ENG 101',
      courseName: 'English Composition',
      sectionOffered: '002',
      sectionWanted: '001',
      action: 'offer',
      status: 'open',
      description: 'Available for trade with morning preference'
    }
  ];

  const trades = getStoredTrades();
  const newTrades = sampleTrades.map(trade => ({
    ...trade,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  trades.push(...newTrades);
  storeTrades(trades);
}