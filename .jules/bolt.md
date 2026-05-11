## 2025-05-15 - [Search Index Caching]
**Learning:** Re-indexing static data on every search query (e.g., on every keystroke) is a significant and unnecessary bottleneck. Using `WeakMap` to cache search indices based on data reference equality provides a massive performance boost (~3x speedup) while maintaining memory safety.
**Action:** Always check if search indices or expensive data transformations can be cached when the underlying data is stable. Key the cache by the data reference to support efficient updates in a React environment.
