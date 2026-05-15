## 2026-05-15 - Index Caching for Client-Side Search
**Learning:** Rebuilding MiniSearch indices on every search call (e.g., during keystrokes) and using (N)$ `Array.find` to map search results back to original objects is a significant bottleneck. For 1000 schedules, this cost ~37ms per search.
**Action:** Implement WeakMap-based caching for search indices using the data array as a key. Pre-compute a Map for (1)$ lookups during the result mapping phase. This achieved an ~8x speedup in benchmarks.
