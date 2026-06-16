## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-20 - Multi-column Authorization and Data Minimization
**Vulnerability:** `getUserKey` was fetching all columns and performing provider filtering in-memory, which is inefficient and violates data minimization.
**Learning:** Relying on application-level filtering for authorization-sensitive data (like API keys) can lead to logic bugs and unnecessary data exposure.
**Prevention:** Use the `and()` operator in Drizzle to enforce multi-column filtering at the database level and explicitly select only the required columns (e.g., `apiKey`) to maintain a minimal security footprint.
