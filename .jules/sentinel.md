## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2026-05-29 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using wildcard `.select()` or `.returning()` were over-fetching data, including PII like `userEmail` and authentication tokens, potentially exposing them if the API response structure changed or was not properly filtered.
**Learning:** Defaulting to wildcard selection violates the principle of least privilege. Even if the current schema doesn't have sensitive fields, future additions might be accidentally leaked.
**Prevention:** Use explicit column selection in Drizzle ORM queries to fetch only required fields, especially when interacting with user profiles or trades tables.
