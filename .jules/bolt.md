
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Schedule Feature Calculation Optimization
**Learning:** Bitmasks are significantly faster than Sets for small, fixed domains like DaysOfWeek (0-6). Mapping DayOfWeek to a bitmask and using bitwise operations avoids object allocations and collection overhead in tight loops. Single-pass logic over sorted arrays for complex conditions (like lunch breaks) is more efficient than allocating intermediate Maps or sub-arrays.
**Action:** Use bitmasks for day-of-week tracking and single-pass iteration for multi-slot schedule features to minimize GC pressure during combinatorial generation.

## 2026-05-21 - Feature Vector and Time Parsing Optimization
**Learning:** `WeakMap` is ideal for caching computed features (like embeddings) that are stable for the lifetime of an object, significantly speeding up $O(N \cdot K)$ clustering paths. For small, fixed domains like minutes-in-a-day (1440), a simple `Map` is more efficient than a manual LRU-capped cache, which can incur $O(N)$ eviction costs. Fast string parsing with `slice` and `indexOf` is noticeably faster than `split().map(Number)` in high-frequency utility functions.
**Action:** Implement `WeakMap` caching for expensive stable object features and simplify caches for small-domain primitives.
