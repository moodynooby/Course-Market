## 2025-05-15 - Schedule Generation Optimization
**Learning:** Recursive generators and array spreads in combinatorial search cause significant GC pressure and overhead. Manual backtracking with a shared mutable array is much faster for deep search spaces. Hoisting expensive operations (like Set creation and time parsing) into a context object significantly improves hot-path performance in scoring functions.
**Action:** Use shared-array backtracking for search algorithms and 'ScoringContext' patterns for repeated calculations in loops.
