## 2025-05-15 - [Backtracking & Scoring Context]
**Learning:** Replacing recursive generators with manual backtracking and a shared array significantly reduces memory allocations. Hoisting expensive Set creations and time parsing into a `ScoringContext` outside the scoring hot loop further improves performance in combinatorial search.
**Action:** Always prefer manual backtracking with shared state for large combinatorial searches. Use a context object to hoist invariant computations out of functions called in tight loops.
