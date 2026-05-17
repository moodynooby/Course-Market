## 2025-05-15 - Index Caching for Client-Side Search
**Learning:** Client-side search indexing with `minisearch` can become a significant bottleneck when performed on every search interaction (e.g., on every keystroke). For datasets like generated schedules (1000+ items) or professor lists, re-indexing on every search call adds $O(N)$ overhead that can exceed 50ms per search, leading to noticeable UI lag.

**Action:** Implement `WeakMap`-based caching for `MiniSearch` indices using the data array as the key. This ensures that indexing only happens once per dataset version. Additionally, use a `Map` to store ID-to-object mappings for $O(1)$ retrieval of result objects, avoiding expensive $O(N)$ `.find()` or `.filter()` calls during result mapping.
