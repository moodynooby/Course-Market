
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Schedule Feature Calculation Optimization
**Learning:** Bitmasks are significantly faster than Sets for small, fixed domains like DaysOfWeek (0-6). Mapping DayOfWeek to a bitmask and using bitwise operations avoids object allocations and collection overhead in tight loops. Single-pass logic over sorted arrays for complex conditions (like lunch breaks) is more efficient than allocating intermediate Maps or sub-arrays.
**Action:** Use bitmasks for day-of-week tracking and single-pass iteration for multi-slot schedule features to minimize GC pressure during combinatorial generation.

## 2026-06-05 - Time Parsing and Slot Caching Optimization
**Learning:** Manual string parsing with `indexOf` and `slice` is faster than `split(':').map(Number)` in high-frequency loops as it avoids array allocations. For bounded domains (like 1440 minutes in a day), a simple `Map` is more efficient than a manual LRU cache. Caching pre-calculated properties of data objects (like `TimeSlot` minutes) in a `WeakMap` eliminates redundant work across different parts of the application.
**Action:** Replace `split` patterns with manual parsing in hot paths, use `WeakMap` for per-object caching, and favor simple `Map` over LRU for small, bounded key spaces.
