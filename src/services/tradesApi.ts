import type { TradePost } from '../types';
import type { TradeInput, TradeUpdateInput } from '../lib/schemas';
import { api } from './apiClient';

export async function getTrades(token: string): Promise<TradePost[]> {
  const result = await api.get<{ trades: TradePost[] }>('/trades', token);
  return result.trades || [];
}

export async function createTrade(
  token: string,
  tradeData: TradeInput,
): Promise<TradePost> {
  const result = await api.post<{ trade: TradePost }>('/trades', tradeData, token);
  return result.trade;
}

export async function updateTrade(
  token: string,
  tradeId: string,
  updates: TradeUpdateInput,
): Promise<TradePost> {
  const result = await api.put<{ trade: TradePost }>(`/trades/${tradeId}`, updates, token);
  return result.trade;
}

export async function deleteTrade(token: string, tradeId: string): Promise<void> {
  await api.delete(`/trades/${tradeId}`, token);
}
