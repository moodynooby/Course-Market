## 2026-05-10 - [MiniSearch Index Caching]
**Learning:** Re-building a MiniSearch index on every search call (e.g., during keystrokes) is a significant bottleneck, especially when it involves expensive data transformation (like in 'searchSchedules').
**Action:** Use reference equality checks on the input data array to cache the MiniSearch instance and only rebuild it when the data actually changes.
