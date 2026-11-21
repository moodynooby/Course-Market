import { useEffect, useState } from 'react';
import { professorsApi } from '../services/professorsApi';
import type { ProfessorRatingInfo } from '../types';

let sharedPromise: Promise<Map<string, ProfessorRatingInfo>> | null = null;
let cachedMap: Map<string, ProfessorRatingInfo> | null = null;

async function loadProfessorsMap(): Promise<Map<string, ProfessorRatingInfo>> {
  if (cachedMap) return cachedMap;

  if (!sharedPromise) {
    sharedPromise = professorsApi
      .getProfessors()
      .then((professors) => {
        const map = new Map<string, ProfessorRatingInfo>();
        for (const professor of professors) {
          map.set(professor.name, {
            avgRating: Number(professor.avgRating) || 0,
            ratingCount: professor.ratingCount || 0,
          });
        }
        cachedMap = map;
        return map;
      })
      .catch((error) => {
        console.error('Failed to fetch professor ratings:', error);
        sharedPromise = null;
        return new Map<string, ProfessorRatingInfo>();
      });
  }

  return sharedPromise;
}

export function useProfessorsMap() {
  const [map, setMap] = useState<Map<string, ProfessorRatingInfo>>(cachedMap ?? new Map());

  useEffect(() => {
    let cancelled = false;
    loadProfessorsMap().then((result) => {
      if (!cancelled && result.size > 0) setMap(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return map;
}
