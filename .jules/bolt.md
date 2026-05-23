
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Search Pipeline & Lookup Optimizations
**Learning:** Returning only IDs from search services forces UI components to perform O(N) filtering to recover objects, which is inefficient and discards search relevance ordering. Frequently used array lookups like 'DAY_ORDER.indexOf(day)' in tight loops (sorting, feature calculation) should be replaced with O(1) Record lookups.
**Action:** Always return full objects in relevance order from search services. Use memoized Maps in components for O(1) lookups during selection and conflict detection. Replace O(N) array index lookups with O(1) Map/Record lookups in performance-critical utilities.
