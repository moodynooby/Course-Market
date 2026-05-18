import { useCallback, useEffect, useState } from 'react';
import { professorsApi } from '../services/professorsApi';

interface ProfessorRatingInfo {
  avgRating: number;
  ratingCount: number;
}

let sharedPromise: Promise<Map<string, ProfessorRatingInfo>> | null = null;

export function useProfessorsMap() {
  const [map, setMap] = useState<Map<string, ProfessorRatingInfo>>(new Map());

  const fetch = useCallback(async () => {
    if (sharedPromise) {
      setMap(await sharedPromise);
      return;
    }
    sharedPromise = (async () => {
      try {
        const professors = await professorsApi.getProfessors();
        const m = new Map<string, ProfessorRatingInfo>();
        for (const p of professors) {
          m.set(p.name, { avgRating: Number(p.avgRating) || 0, ratingCount: p.ratingCount || 0 });
        }
        return m;
      } catch {
        return new Map<string, ProfessorRatingInfo>();
      }
    })();
    setMap(await sharedPromise);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return map;
}
