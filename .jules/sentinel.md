## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-16 - Host Header Spoofing in absolute URL construction
**Vulnerability:** Constructing absolute URLs for internal API calls using `event.headers.host` can be exploited via Host header spoofing.
**Learning:** Netlify provides `process.env.URL` which is a reliable source for the site's base URL. Relying on request headers for security-sensitive URL construction is dangerous.
**Prevention:** Prioritize trusted environment variables like `process.env.URL` for base URL construction. Use headers only as a last-resort fallback with appropriate validation.
