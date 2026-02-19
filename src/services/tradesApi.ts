import type { TradePost } from '../types';

const NETLIFY_FUNCTION_URL = import.meta.env.VITE_NETLIFY_FUNCTION_URL;

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

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
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

export async function searchTrades(filters?: {
  courseCode?: string;
  action?: 'offer' | 'request';
  status?: string;
}): Promise<TradePost[]> {
  const trades = await getTrades();

  if (!filters) return trades;

  return trades.filter((trade) => {
    if (
      filters.courseCode &&
      !trade.courseCode.toLowerCase().includes(filters.courseCode.toLowerCase())
    ) {
      return false;
    }
    if (filters.action && trade.action !== filters.action) return false;
    if (filters.status && trade.status !== filters.status) return false;
    return true;
  });
}

// Map DB row (snake_case / numeric IDs) to frontend TradePost
function mapDbTradeToFrontend(row: any): TradePost {
  return {
    id: String(row.id),
    userId: String(row.userId ?? row.user_id),
    userDisplayName: row.userDisplayName ?? row.user_display_name ?? 'User',
    courseCode: row.courseCode ?? row.course_code,
    courseName: row.courseName ?? row.course_name ?? '',
    sectionOffered: row.sectionOffered ?? row.section_offered,
    sectionWanted: row.sectionWanted ?? row.section_wanted,
    action: row.action,
    status: row.status,
    description: row.description ?? undefined,
    contactPhone: row.contactPhone ?? row.contact_phone ?? undefined,
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
  };
}
