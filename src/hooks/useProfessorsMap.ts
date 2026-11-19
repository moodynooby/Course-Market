import { useCallback, useEffect, useState } from 'react';
import { professorsApi } from '../services/professorsApi';
import type { ProfessorRatingInfo } from '../types';

let sharedPromise: Promise<Map<string, ProfessorRatingInfo>> | null = null;
let cachedMap: Map<string, ProfessorRatingInfo> | null = null;

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
