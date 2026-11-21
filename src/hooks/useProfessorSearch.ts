import { useEffect, useMemo, useRef, useState } from 'react';
import { searchProfessors } from '../services/search';
import type { Professor } from '../types';
import { PROFESSOR_SEARCH_DEBOUNCE_MS } from '../utils/constants';

export function useProfessorSearch(professors: Professor[]) {
  const [query, setQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setQueryDebounced = (q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setQuery(q), PROFESSOR_SEARCH_DEBOUNCE_MS);
  };

  const results = useMemo(() => {
    return searchProfessors(professors, query);
  }, [professors, query]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { results, query, setQuery: setQueryDebounced };
}
