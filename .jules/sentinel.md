## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-15 - Application-Level Filtering Bug in Key Retrieval
**Vulnerability:** `getUserKey` filtered by `auth0UserId` in the database but checked the `provider` in application logic, which would fail or return wrong data if a user had multiple keys.
**Learning:** Incomplete database-level filtering creates non-deterministic behavior and potential authorization bypass if logic assumes a single record per user.
**Prevention:** Always use the `and()` operator to combine all required filters at the database level and use explicit column selection for sensitive data like API keys.
