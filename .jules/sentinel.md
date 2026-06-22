## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-16 - Non-deterministic Credential Retrieval and Host Header Risks
**Vulnerability:** `getUserKey` was fetching credentials by `auth0UserId` only and filtering by `provider` in application logic, which could fail if a user had multiple keys. Additionally, `/sync` used `event.headers.host` for URL construction, making it susceptible to Host header spoofing.
**Learning:** Filtering sensitive lookups at the database level using all primary key components (like `provider` in this case) ensures deterministic and secure retrieval. Relying on client-provided headers like `Host` for internal logic is unsafe when trusted environment variables like `process.env.URL` are available.
**Prevention:** Always filter by all identifying fields in the `WHERE` clause for credential lookups. Prefer trusted platform environment variables over request headers for absolute URL construction in backend functions.
