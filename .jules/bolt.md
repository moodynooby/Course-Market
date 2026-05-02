## 2025-05-15 - [Backtracking Optimization]
**Learning:** Schedule generation using generators and array spreading (`yield*`, `[...current]`) incurs significant overhead due to memory allocation and garbage collection.
**Action:** Use index-based backtracking with a shared array and `push`/`pop` operations to minimize allocations. Hoist scoring context (Sets, parsed times) out of loops.
