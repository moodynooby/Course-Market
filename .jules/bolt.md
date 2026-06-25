
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Schedule Feature Calculation Optimization
**Learning:** Bitmasks are significantly faster than Sets for small, fixed domains like DaysOfWeek (0-6). Mapping DayOfWeek to a bitmask and using bitwise operations avoids object allocations and collection overhead in tight loops. Single-pass logic over sorted arrays for complex conditions (like lunch breaks) is more efficient than allocating intermediate Maps or sub-arrays.
**Action:** Use bitmasks for day-of-week tracking and single-pass iteration for multi-slot schedule features to minimize GC pressure during combinatorial generation.

## 2026-05-21 - Hot Path Object Allocation & Parsing Optimization
**Learning:** Repeatedly parsing "HH:mm" strings and checking Set membership in tight loops (like `hasTimeConflict` and `computeScheduleFeaturesWithContext`) is a major bottleneck. Using a `WeakMap` to cache parsed `TimeSlot` metadata (start/end minutes, day number) reduces CPU and GC pressure. Additionally, checking simple conditions (like `slot1.day !== slot2.day`) before performing more complex lookups or overlaps significantly improves average-case performance.
**Action:** Always cache metadata for stable objects used in high-frequency comparisons and prioritize early returns with primitive checks.
