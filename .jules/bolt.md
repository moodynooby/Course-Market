## 2025-05-15 - Backtracking and Scoring Context Optimization
**Learning:** Combinatorial search in schedule generation was bottlenecked by generator-based recursion and array spreads, causing excessive memory allocations. Additionally, schedule scoring was performing redundant Set creations and time parsing for every candidate schedule.
**Action:** Use manual backtracking with a shared mutable array (push/pop) for search. Hoist invariant scoring setup (Sets, preferred time conversions) into a `ScoringContext` when processing large batches of results to achieve a ~34% speedup.
