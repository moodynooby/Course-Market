## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-15 - In-Database Filtering for Sensitive Lookups
**Vulnerability:** `getUserKey` was fetching all keys for a user and filtering by `provider` in TypeScript, potentially over-fetching sensitive API keys.
**Learning:** Application-layer filtering of sensitive data is inefficient and less secure than database-level filtering.
**Prevention:** Use composite keys or multi-column `WHERE` clauses (e.g., `and(eq(userId), eq(provider))`) to ensure only the specific sensitive record requested is ever loaded into memory.
