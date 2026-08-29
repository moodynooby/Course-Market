
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Schedule Feature Calculation Optimization
**Learning:** Bitmasks are significantly faster than Sets for small, fixed domains like DaysOfWeek (0-6). Mapping DayOfWeek to a bitmask and using bitwise operations avoids object allocations and collection overhead in tight loops. Single-pass logic over sorted arrays for complex conditions (like lunch breaks) is more efficient than allocating intermediate Maps or sub-arrays.
**Action:** Use bitmasks for day-of-week tracking and single-pass iteration for multi-slot schedule features to minimize GC pressure during combinatorial generation.

## 2026-06-16 - Hot Path Time Parsing & Slot Caching
**Learning:** `hasTimeConflict` and `computeScheduleFeatures` are high-frequency hot paths. String splitting and `Map` lookups in these loops are significant. `WeakMap` caching of pre-calculated numeric minutes for `TimeSlot` objects eliminates redundant parsing and lookup overhead.
**Action:** Use `WeakMap` for per-object metadata caching in high-frequency loops and optimize string parsing with manual `indexOf`/`slice` to avoid array allocations.
