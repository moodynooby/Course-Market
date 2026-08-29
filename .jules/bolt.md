
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Schedule Feature Calculation Optimization
**Learning:** Bitmasks are significantly faster than Sets for small, fixed domains like DaysOfWeek (0-6). Mapping DayOfWeek to a bitmask and using bitwise operations avoids object allocations and collection overhead in tight loops. Single-pass logic over sorted arrays for complex conditions (like lunch breaks) is more efficient than allocating intermediate Maps or sub-arrays.
**Action:** Use bitmasks for day-of-week tracking and single-pass iteration for multi-slot schedule features to minimize GC pressure during combinatorial generation.

## 2026-05-21 - Time Parsing and Slot Caching Optimization
**Learning:** Even with a Map cache, repeated string parsing in high-frequency loops (conflict detection, scoring) is a bottleneck. Using a WeakMap to link pre-calculated numeric values directly to domain objects (TimeSlots) eliminates string overhead entirely. Bounded domains like days-of-week (0-6) are always better handled with bitmasks than Sets in hot paths.
**Action:** Use WeakMap for object-level calculation caching and bitmasks for small set memberships to maximize throughput in combinatorial logic.
