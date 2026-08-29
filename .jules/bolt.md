
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Schedule Feature Calculation Optimization
**Learning:** Bitmasks are significantly faster than Sets for small, fixed domains like DaysOfWeek (0-6). Mapping DayOfWeek to a bitmask and using bitwise operations avoids object allocations and collection overhead in tight loops. Single-pass logic over sorted arrays for complex conditions (like lunch breaks) is more efficient than allocating intermediate Maps or sub-arrays.
**Action:** Use bitmasks for day-of-week tracking and single-pass iteration for multi-slot schedule features to minimize GC pressure during combinatorial generation.

## 2026-05-21 - Hot-Path Time Parsing & Slot Caching
**Learning:** Even with Map caching, repeated string parsing (split/map) and object allocations in tight scoring loops (millions of iterations) create significant GC pressure. WeakMap-based caching of parsed results directly on the input data objects (TimeSlot) bypasses Map lookups and string parsing entirely. Bitmasks for small domains like DaysOfWeek provide O(1) membership checks that are significantly faster than Set.has.
**Action:** Use WeakMap to cache derived numeric data on stable input objects in combinatorial hot paths; replace Sets with bitmasks for day-of-week tracking.
