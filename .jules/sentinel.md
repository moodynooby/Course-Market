## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-20 - Hardening API Responses and Configuration Retrieval
**Vulnerability:** Core utilities for retrieving user API keys were fetching entire rows and filtering in application logic. Additionally, URL construction for background synchronization relied solely on the user-controlled `Host` header.
**Learning:** Filtering at the application layer after a wildcard DB select wastes resources and risks data leakage if the filter logic is bypassed or flawed. Relying on `event.headers.host` in server-side functions can lead to Host Header Injection and SSRF if used to fetch external resources.
**Prevention:** Push authorization filters (like `provider` checks) into the database query using `and()`. Prefer server-side environment variables like `process.env.URL` for constructing internal base URLs over untrusted request headers.
