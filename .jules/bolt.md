
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Schedule Feature Calculation Optimization
**Learning:** Bitmasks are significantly faster than Sets for small, fixed domains like DaysOfWeek (0-6). Mapping DayOfWeek to a bitmask and using bitwise operations avoids object allocations and collection overhead in tight loops. Single-pass logic over sorted arrays for complex conditions (like lunch breaks) is more efficient than allocating intermediate Maps or sub-arrays.
**Action:** Use bitmasks for day-of-week tracking and single-pass iteration for multi-slot schedule features to minimize GC pressure during combinatorial generation.

## 2026-05-21 - Feature Vector Caching for Clustering
**Learning:** During schedule clustering, `getScheduleFeatureVector` is called repeatedly for the same schedule object (O(N*K) where N is schedules and K is clusters). Using a `WeakMap` to cache these vectors achieves a ~180x speedup for hot-path calculations without risk of memory leaks.
**Action:** Use `WeakMap` to memoize expensive computations derived from stable objects in performance-critical iterative algorithms like clustering or ranking.
