
## 2026-05-19 - Schedule Generation Optimization
**Learning:** Recursive generators with array spreading ([...current, sec]) in tight loops incur significant memory allocation and GC overhead. Hoisting preference-related calculations (Set creation, time parsing) into a 'ScoringContext' avoids redundant work during candidate evaluation.
**Action:** Use manual backtracking with shared mutable arrays and pre-calculated contexts for performance-critical combinatorial search and scoring paths.

## 2026-05-20 - Schedule Feature Calculation Optimization
**Learning:** Bitmasks are significantly faster than Sets for small, fixed domains like DaysOfWeek (0-6). Mapping DayOfWeek to a bitmask and using bitwise operations avoids object allocations and collection overhead in tight loops. Single-pass logic over sorted arrays for complex conditions (like lunch breaks) is more efficient than allocating intermediate Maps or sub-arrays.
**Action:** Use bitmasks for day-of-week tracking and single-pass iteration for multi-slot schedule features to minimize GC pressure during combinatorial generation.

## 2026-05-21 - Schedule Hot Path and Feature Vector Caching
**Learning:** In combinatorial schedule generation and clustering, the same 'TimeSlot' and 'GeneratedSchedule' objects are repeatedly processed. 'WeakMap' caching for parsed minutes and feature vectors eliminates redundant string parsing and heavy feature calculations (e.g., ~28x speedup for vector retrieval). Manual string slicing for "HH:MM" parsing is significantly faster than '.split().map(Number)' in hot paths.
**Action:** Use 'WeakMap' for caching expensive properties of long-lived objects (like schedules or slots) and prefer manual string parsing over array-allocation-heavy helpers in tight loops.
