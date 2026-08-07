
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Schedule Feature Calculation Optimization
**Learning:** Bitmasks are significantly faster than Sets for small, fixed domains like DaysOfWeek (0-6). Mapping DayOfWeek to a bitmask and using bitwise operations avoids object allocations and collection overhead in tight loops. Single-pass logic over sorted arrays for complex conditions (like lunch breaks) is more efficient than allocating intermediate Maps or sub-arrays.
**Action:** Use bitmasks for day-of-week tracking and single-pass iteration for multi-slot schedule features to minimize GC pressure during combinatorial generation.

## 2026-05-21 - TimeSlot Parsing and WeakMap Caching
**Learning:** Converting time strings to minutes is a major bottleneck when done repeatedly in hot loops (e.g., conflict detection during generation). A `WeakMap` keyed by the `TimeSlot` object allows caching these results safely without memory leaks. Replacing `.split().map(Number)` with `indexOf` and `parseInt` further reduces micro-overhead in the conversion itself.
**Action:** Use `WeakMap` to associate pre-calculated numeric values with immutable data objects that participate in combinatorial operations.
