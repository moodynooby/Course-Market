## 2025-05-15 - [Schedule Generation & Scoring Optimization]
**Learning:** Generator-based recursion combined with array spreading (`[...current, section]`) creates significant memory pressure and GC overhead in combinatorial search. Hoisting expensive operations (Set creation, time parsing) out of high-frequency loops into a context object is critical for scoring performance.
**Action:** Use index-based backtracking with shared mutable arrays (push/pop) for combinatorial problems. Always hoist constant preference-based calculations out of scoring/filtering loops.
