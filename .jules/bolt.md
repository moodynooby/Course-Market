## 2025-05-15 - Backtracking & Pruning for Schedule Generation
**Learning:** Combinatorial explosion is the primary bottleneck in schedule generation. A "generate-then-filter" approach is O(S^C) where S is sections and C is courses. Even with small inputs, this quickly becomes unusable.
**Action:** Always implement early pruning in search algorithms. By checking for conflicts at each step of the recursion, we discard massive branches of the search tree that would otherwise be processed and then rejected.

## 2025-05-15 - Hot Loop Micro-optimizations
**Learning:** String operations (split, replace) and repeated array lookups (find, includes) in tight loops (like scoring thousands of combinations) add up significantly.
**Action:** Use memoization/caching for repetitive computations (like time parsing) and use Sets/Maps for O(1) lookups of preference data.
