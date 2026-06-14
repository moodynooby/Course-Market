## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-16 - Host Header Injection in Netlify Functions
**Vulnerability:** The `/sync` endpoint used the request's `Host` header to construct absolute URLs for internal data fetching, which is user-controlled and can be spoofed.
**Learning:** Relying on incoming request headers for sensitive server-side operations like `fetch` can lead to SSRF (Server-Side Request Forgery) if an attacker provides a malicious host.
**Prevention:** Use trusted environment variables (e.g., `process.env.URL` in Netlify) to determine the application's base URL for internal service calls.
