
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Schedule Feature Calculation Optimization
**Learning:** Bitmasks are significantly faster than Sets for small, fixed domains like DaysOfWeek (0-6). Mapping DayOfWeek to a bitmask and using bitwise operations avoids object allocations and collection overhead in tight loops. Single-pass logic over sorted arrays for complex conditions (like lunch breaks) is more efficient than allocating intermediate Maps or sub-arrays.
**Action:** Use bitmasks for day-of-week tracking and single-pass iteration for multi-slot schedule features to minimize GC pressure during combinatorial generation.

## 2026-05-21 - Time Parsing and Slot Caching Optimization
**Learning:** String parsing (`.split().map(Number)`) and Map lookups with manual LRU eviction incur significant overhead in (N^2)$ scheduling loops. Using `WeakMap` to cache pre-calculated numeric minutes directly on `TimeSlot` objects, combined with manual string slicing (`indexOf` + `slice`), provides a substantial performance boost (~28% in micro-benchmarks).
**Action:** Use `getSlotMinutes` utility for all `TimeSlot` numeric conversions and prefer manual string parsing over `.split()` in hot paths.
