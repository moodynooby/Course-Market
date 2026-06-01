## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-23 - Logic Filtering in Database Queries
**Vulnerability:** A query in `getUserKey` fetched all records for a user but applied filtering (like provider matching) in JavaScript after a `limit(1)`, potentially skipping valid records or over-fetching sensitive data.
**Learning:** Performing logic-based filtering in application code instead of the database query violates the Principle of Least Privilege and can cause functional bugs (shadowed records).
**Prevention:** Always move logic-based filters (e.g., `WHERE provider = ?`) into the database query and use explicit column selection to only fetch required fields.
