import { apiClient } from './apiClient';

export interface OptimizationCacheEntry {
  id: number;
  auth0UserId: string;
  cacheKey: string;
  analysis: string;
  actions: any;
  createdAt: string;
}

export const optimizationApi = {
  async getCache(cacheKey: string): Promise<OptimizationCacheEntry | null> {
    try {
      const response = await apiClient.get<OptimizationCacheEntry>(
        `/.netlify/functions/optimization?cacheKey=${encodeURIComponent(cacheKey)}`,
      );
      return response;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async saveCache(cacheKey: string, analysis: string, actions: any): Promise<void> {
    await apiClient.post('/.netlify/functions/optimization', {
      cacheKey,
      analysis,
      actions,
    });
  },
};
