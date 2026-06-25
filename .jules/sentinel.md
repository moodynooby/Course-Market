## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-15 - Host Header Spoofing in Server-Side Fetch
**Vulnerability:** The `/sync` endpoint was using `event.headers.host` to construct absolute URLs for internal API calls, which can be spoofed by an attacker.
**Learning:** Relying on the `Host` header for security-sensitive URL construction is dangerous as it is user-controlled.
**Prevention:** Prioritize trusted environment variables like `process.env.URL` for base URL construction in server-side logic.
