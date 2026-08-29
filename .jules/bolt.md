
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Schedule Feature Calculation Optimization
**Learning:** Bitmasks are significantly faster than Sets for small, fixed domains like DaysOfWeek (0-6). Mapping DayOfWeek to a bitmask and using bitwise operations avoids object allocations and collection overhead in tight loops. Single-pass logic over sorted arrays for complex conditions (like lunch breaks) is more efficient than allocating intermediate Maps or sub-arrays.
**Action:** Use bitmasks for day-of-week tracking and single-pass iteration for multi-slot schedule features to minimize GC pressure during combinatorial generation.

## 2026-06-01 - Time Parsing & Identity Caching
**Learning:** High-frequency operations like `hasTimeConflict` benefit significantly from `WeakMap` caching of pre-calculated numeric values directly on object identity. This bypasses string parsing entirely for repeated comparisons. Additionally, manual string parsing (`indexOf`/`slice`) is faster than `.split().map(Number)` in performance-critical utility paths.
**Action:** Use `WeakMap` for identity-based caching of derived properties on data objects (like `TimeSlot`) and prioritize manual parsing for ultra-hot string-to-number paths.
