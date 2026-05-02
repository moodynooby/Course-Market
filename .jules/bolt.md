## 2025-05-15 - [Scoring Context Hoisting]
**Learning:** Schedule scoring is a tight loop bottleneck. Re-creating `Set` objects and parsing time strings inside `calculateScheduleScore` for every combination (up to 10,000+ times) adds significant GC pressure and CPU overhead.
**Action:** Use a `ScoringContext` to hoist invariant calculations (Sets, parsed times, day order maps) out of high-frequency loops. This yielded a ~25% performance improvement in schedule generation.

## 2025-05-15 - [Backtracking & Early Pruning]
**Learning:** Generator-based recursion with array spreading (`[...]`) for combinatorial search is slow due to excessive memory allocations and lack of early pruning for non-conflict constraints.
**Action:** Use an index-based backtracking approach with a shared array (push/pop) and move credit limit checks into the pruning logic. This combined with scoring context hoisting resulted in a ~40% total performance gain.
