## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-16 - Logic Bug in Multi-Key Retrieval
**Vulnerability:** A query to retrieve user-specific keys used only `auth0UserId` in the `where` clause, then filtered the result by `provider` in application code.
**Learning:** If a user has multiple records (e.g., keys for different providers), a `.limit(1)` query might return the "wrong" record first, causing the application to incorrectly report that no key exists for the requested provider.
**Prevention:** Always include all necessary identifying columns (e.g., `auth0UserId` AND `provider`) in the database `where` clause to ensure deterministic and correct record retrieval, combined with explicit column selection for data minimization.
