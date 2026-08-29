
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Schedule Feature Calculation Optimization
**Learning:** Bitmasks are significantly faster than Sets for small, fixed domains like DaysOfWeek (0-6). Mapping DayOfWeek to a bitmask and using bitwise operations avoids object allocations and collection overhead in tight loops. Single-pass logic over sorted arrays for complex conditions (like lunch breaks) is more efficient than allocating intermediate Maps or sub-arrays.
**Action:** Use bitmasks for day-of-week tracking and single-pass iteration for multi-slot schedule features to minimize GC pressure during combinatorial generation.

## 2026-05-21 - Optimized Time Parsing and Slot Caching
**Learning:** HH:mm string parsing with `.split(':').map(Number)` in hot loops (like conflict detection) creates significant GC pressure. Using `indexOf` and `slice` for manual parsing is faster. Furthermore, `WeakMap` based caching of parsed minutes on the `TimeSlot` object itself eliminates redundant work entirely when the same slots are compared across different schedule candidates.
**Action:** Use `getSlotMinutes` utility to cache parsed time values on `TimeSlot` objects and avoid array allocations in string parsing utilities.
