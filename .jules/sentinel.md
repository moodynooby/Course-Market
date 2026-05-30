## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-20 - In-Memory Filtering Bug and Excessive Data Exposure
**Vulnerability:** `getUserKey` was querying by `auth0UserId` with a `.limit(1)` and then filtering by `provider` in memory.
**Learning:** This caused a functional bug where the query could return a row for the "wrong" provider, leading to a false `null` result even if a key for the correct provider existed. It also fetched sensitive data (keys for other providers) unnecessarily.
**Prevention:** Filter by all required primary/unique keys in the database `WHERE` clause and use explicit column selection to follow the principle of least privilege.
