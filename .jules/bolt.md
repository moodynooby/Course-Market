## 2025-05-15 - [Search Index Caching]
**Learning:** Rebuilding `MiniSearch` indices and generating search documents on every keystroke/call is a significant bottleneck for UI responsiveness. Even for small datasets, document mapping and indexing can take 15-40ms, which is noticeable during typing.
**Action:** Implement reference-based caching (`data === lastDataRef`) for search indices and their associated documents. This reduces repeated search latency to sub-millisecond levels.
