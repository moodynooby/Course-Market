## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-20 - Netlify Function Security Hardening
**Vulnerability:** API responses lacked standard security headers, and internal URL construction for `/sync` relied on the user-controlled `Host` header.
**Learning:** Netlify's `[[headers]]` in `netlify.toml` do NOT automatically apply to dynamic Function responses. Additionally, trusting `event.headers.host` for absolute URL construction enables Host header spoofing/SSRF.
**Prevention:** 1) Inject `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` into the base `jsonResponse` helper. 2) Prioritize server-controlled environment variables like `process.env.URL` for URL construction.
