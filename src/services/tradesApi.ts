import type { TradePost } from '../types';
import { ENV } from '../config/devConfig';

const NETLIFY_FUNCTION_URL = ENV.NETLIFY_FUNCTION_URL;

function getBaseUrl(): string {
  if (NETLIFY_FUNCTION_URL) return NETLIFY_FUNCTION_URL;
  return '/.netlify/functions';
}

async function fetchApi(path: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  if (!contentType.includes('application/json')) {
    throw new Error('Server returned non-JSON response. Are Netlify Functions running?.');
  }

  return response.json();
}

export async function getTrades(): Promise<TradePost[]> {
  const result = await fetchApi('/trades');
  return (result.trades || []).map(mapDbTradeToFrontend);
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
    contactPhone?: string;
  },
): Promise<TradePost> {
  const result = await fetchApi('/trades', {
    method: 'POST',
    body: JSON.stringify({
      action: 'createTrade',
      trade: {
        userId: parseInt(userId) || 1,
        userDisplayName,
        ...tradeData,
        status: 'open',
      },
    }),
  });

  return mapDbTradeToFrontend(result.trade);
}

export async function updateTradeStatus(
  tradeId: string,
  status: 'pending' | 'completed' | 'cancelled',
): Promise<TradePost | null> {
  const result = await fetchApi('/trades', {
    method: 'PUT',
    body: JSON.stringify({ action: 'updateTrade', tradeId: parseInt(tradeId), status }),
  });

  return result.trade ? mapDbTradeToFrontend(result.trade) : null;
}

export async function deleteTrade(tradeId: string): Promise<boolean> {
  const result = await fetchApi('/trades', {
    method: 'DELETE',
    body: JSON.stringify({ action: 'deleteTrade', tradeId: parseInt(tradeId) }),
  });

  return result.success;
}

// Shape of a trade row returned from the database/Netlify function
interface DbTradeRow {
  id?: unknown;
  userId?: unknown;
  user_id?: unknown;
  userDisplayName?: unknown;
  user_display_name?: unknown;
  courseCode?: unknown;
  course_code?: unknown;
  courseName?: unknown;
  course_name?: unknown;
  sectionOffered?: unknown;
  section_offered?: unknown;
  sectionWanted?: unknown;
  section_wanted?: unknown;
  action?: unknown;
  status?: unknown;
  description?: unknown;
  contactPhone?: unknown;
  contact_phone?: unknown;
  createdAt?: unknown;
  created_at?: unknown;
  updatedAt?: unknown;
  updated_at?: unknown;
}

// Map DB row (snake_case / numeric IDs) to frontend TradePost
function mapDbTradeToFrontend(row: DbTradeRow): TradePost {
  return {
    id: String(row.id ?? ''),
    userId: String(row.userId ?? row.user_id ?? ''),
    userDisplayName: String(row.userDisplayName ?? row.user_display_name ?? 'User'),
    courseCode: String(row.courseCode ?? row.course_code ?? ''),
    courseName: String(row.courseName ?? row.course_name ?? ''),
    sectionOffered: String(row.sectionOffered ?? row.section_offered ?? ''),
    sectionWanted: String(row.sectionWanted ?? row.section_wanted ?? ''),
    action: row.action as 'offer' | 'request',
    status: row.status as 'open' | 'pending' | 'completed' | 'cancelled',
    description: row.description as string | undefined,
    contactPhone: row.contactPhone
      ? String(row.contactPhone)
      : row.contact_phone
        ? String(row.contact_phone)
        : undefined,
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
  };
}
