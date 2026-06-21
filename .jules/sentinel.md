## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-16 - Non-deterministic Key Retrieval in getUserKey
**Vulnerability:** `getUserKey` filtered by `auth0UserId` but not `provider` in the database query, performing the provider check in JavaScript on only the first result.
**Learning:** Incomplete database filtering combined with `limit(1)` can lead to "shadowing" where one record prevents others from being retrieved, even if the latter are the correct ones for the requested context.
**Prevention:** Always include all discriminator columns (e.g., both `auth0UserId` and `provider`) in the SQL `WHERE` clause to ensure deterministic and correct data retrieval at the database level.
