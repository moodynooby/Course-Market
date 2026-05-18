import MiniSearch from 'minisearch';
import { useMemo, useRef, useState } from 'react';
import type { Professor } from '../types';

const professorSearchOptions = {
  fields: ['name'],
  storeFields: ['id'],
  searchOptions: {
    prefix: true,
    fuzzy: 0.2,
  },
};

export function useProfessorSearch(professors: Professor[]) {
  const [query, setQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const index = useMemo(() => {
    const idx = new MiniSearch(professorSearchOptions);
    idx.addAll(professors);
    return idx;
  }, [professors]);

  const setQueryDebounced = (q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setQuery(q), 200);
  };

  const results = useMemo(() => {
    if (!query.trim()) return professors;
    const hits = index.search(query) as Array<{ id: number }>;
    const ids = new Set(hits.map((r) => r.id));
    return professors.filter((p) => ids.has(p.id));
  }, [professors, query, index]);

  return { results, query, setQuery: setQueryDebounced };
}
