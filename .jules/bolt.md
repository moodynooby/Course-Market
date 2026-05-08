## 2025-05-15 - [Backtracking and Scoring Optimization]
**Learning:** Replacing generator-based recursion with manual backtracking using a shared mutable array significantly reduces memory allocation and overhead. Additionally, hoisting constant calculations (like Set creation and time parsing) into a `ScoringContext` outside of hot loops provides a major performance boost for large-scale combinatorial searches.
**Action:** Always prefer manual backtracking and context hoisting for performance-critical combinatorial algorithms.
