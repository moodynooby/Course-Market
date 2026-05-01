import { api } from './apiClient';

export interface OptimizationCacheEntry {
  id: number;
  auth0UserId: string;
  cacheKey: string;
  analysis: string;
  actions: any;
  createdAt: string;
}

export const optimizationApi = {
  async getCache(cacheKey: string, token?: string): Promise<OptimizationCacheEntry | null> {
    try {
      const response = await api.get<OptimizationCacheEntry>(
        `/optimization?cacheKey=${encodeURIComponent(cacheKey)}`,
        token,
      );
      return response;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async saveCache(cacheKey: string, analysis: string, actions: any, token?: string): Promise<void> {
    await api.post(
      '/optimization',
      {
        cacheKey,
        analysis,
        actions,
      },
      token,
    );
  },
};
