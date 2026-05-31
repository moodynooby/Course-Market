## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-16 - Hardening Sensitive Data Retrieval
**Vulnerability:** Retrieving sensitive records (like LLM keys) by partial keys and filtering the rest in application logic can lead to functional breakage or accidental exposure if the query returns an unexpected record first.
**Learning:** In `getUserKey`, querying only by `auth0UserId` and checking the `provider` in TypeScript was brittle. If a user had multiple keys, the database could return any of them first, potentially causing the function to return `null` incorrectly.
**Prevention:** Always push filtering logic (especially for composite keys) to the database level using `WHERE` clauses with `and()` and use explicit column selection to minimize data in flight.
