## 2025-05-15 - Index Caching for Client-Side Search

**Learning:** Client-side search indexing (using MiniSearch) becomes a bottleneck when search input triggers re-indexing of thousands of items on every keystroke. WeakMap-based caching of indices tied to the input data's reference allows for sub-millisecond search performance during active typing.

**Action:** Always cache MiniSearch indices using WeakMap when the searchable data is passed as a prop or local state that might stay stable across multiple search operations. Use Map lookups for mapping result IDs to full objects to avoid O(N) search overhead in the results phase.
