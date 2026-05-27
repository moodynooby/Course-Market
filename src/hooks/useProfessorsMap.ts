import { useCallback, useEffect, useState } from 'react';
import { professorsApi } from '../services/professorsApi';

export interface ProfessorRatingInfo {
  avgRating: number;
  ratingCount: number;
}

// Module-level cache to share data across all hook instances immediately
let sharedPromise: Promise<Map<string, ProfessorRatingInfo>> | null = null;
let cachedMap: Map<string, ProfessorRatingInfo> | null = null;

/**
 * Hook to fetch and cache professor ratings.
 *
 * Optimization: Uses a module-level cache and shared promise to ensure that:
 * 1. Data is only fetched once.
 * 2. All components share the same Map reference.
 * 3. Subsequent mounts get the data instantly without re-fetching or extra renders.
 */
export function useProfessorsMap() {
  const [map, setMap] = useState<Map<string, ProfessorRatingInfo>>(cachedMap || new Map());

  const fetch = useCallback(async () => {
    if (cachedMap && cachedMap.size > 0) {
      if (map !== cachedMap) setMap(cachedMap);
      return;
    }

    if (sharedPromise) {
      const result = await sharedPromise;
      if (result.size > 0) {
        cachedMap = result;
        setMap(result);
      }
      return;
    }

    sharedPromise = (async () => {
      try {
        const professors = await professorsApi.getProfessors();
        const m = new Map<string, ProfessorRatingInfo>();
        for (const p of professors) {
          m.set(p.name, { avgRating: Number(p.avgRating) || 0, ratingCount: p.ratingCount || 0 });
        }
        cachedMap = m;
        return m;
      } catch (e) {
        console.error('Failed to fetch professor ratings:', e);
        // Don't cache the failure permanently to allow retries on next mount
        sharedPromise = null;
        return new Map<string, ProfessorRatingInfo>();
      }
    })();

    const result = await sharedPromise;
    if (result.size > 0) setMap(result);
  }, [map]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return map;
}
