## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2026-06-12 - Insecure Internal Data Lookups
**Vulnerability:** Internal database lookups (e.g., `existingTrade`, `userProfile`) were using wildcard selects, fetching sensitive PII like `userEmail` into application memory even when not needed.
**Learning:** Fetching excessive data for internal logic increases the risk of accidental exposure via logging, error messages, or future code changes that might inadvertently return the full object.
**Prevention:** Apply data minimization to *all* queries, including internal lookups, by explicitly selecting only the columns required for the immediate logic.
