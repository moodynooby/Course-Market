import type { TradePost } from '../types';
import { ENV } from '../config/devConfig';

const NETLIFY_FUNCTION_URL = ENV.NETLIFY_FUNCTION_URL;

function getBaseUrl(): string {
  if (NETLIFY_FUNCTION_URL) return NETLIFY_FUNCTION_URL;
  return '/.netlify/functions';
}

async function fetchApi(path: string, token: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export async function getTrades(token: string): Promise<TradePost[]> {
  const result = await fetchApi('/trades', token);
  return result.trades || [];
}

export async function createTrade(
  token: string,
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
  const result = await fetchApi('/trades', token, {
    method: 'POST',
    body: JSON.stringify(tradeData),
  });
  return result.trade;
}

export async function updateTrade(
  token: string,
  tradeId: string,
  updates: {
    courseCode?: string;
    courseName?: string;
    sectionOffered?: string;
    sectionWanted?: string;
    action?: 'offer' | 'request';
    status?: 'open' | 'pending' | 'completed' | 'cancelled';
    description?: string;
    contactPhone?: string;
  },
): Promise<TradePost> {
  const result = await fetchApi(`/trades/${tradeId}`, token, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return result.trade;
}

export async function deleteTrade(token: string, tradeId: string): Promise<void> {
  await fetchApi(`/trades/${tradeId}`, token, {
    method: 'DELETE',
  });
}
