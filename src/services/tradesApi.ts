import type { TradePost } from '../types';
import { api } from './apiClient';

export async function getTrades(token: string): Promise<TradePost[]> {
  const result = await api.get<{ trades: TradePost[] }>('/trades', token);
  return result.trades || [];
}

export async function createTrade(
  token: string,
  tradeData: {
    courseCode: string;
    courseName: string;
    sectionOffered: string;
    sectionWanted: string;
    description?: string;
    contactPhone?: string;
  },
): Promise<TradePost> {
  const result = await api.post<{ trade: TradePost }>('/trades', tradeData, token);
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
    status?: 'open' | 'pending' | 'completed' | 'cancelled';
    description?: string;
    contactPhone?: string;
  },
): Promise<TradePost> {
  const result = await api.put<{ trade: TradePost }>(`/trades/${tradeId}`, updates, token);
  return result.trade;
}

export async function deleteTrade(token: string, tradeId: string): Promise<void> {
  await api.delete(`/trades/${tradeId}`, token);
}
