## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-16 - SSRF via Host Header Spoofing in Netlify Functions
**Vulnerability:** Constructing absolute URLs for internal API calls or data fetching using the `Host` header in Netlify functions.
**Learning:** The `Host` header is user-controlled and can be spoofed to point to malicious internal or external endpoints, leading to SSRF or cache poisoning.
**Prevention:** Use trusted environment variables like `process.env.URL` (provided by Netlify) as the base URL instead of headers from the incoming request.
