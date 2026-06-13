## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-15 - Logic Bug in Composite Key Retrieval
**Vulnerability:** `getUserKey` filtered only by `auth0UserId` on a table with a composite primary key (user, provider), then checked the provider in code. This could return the wrong key or `null` even if a key existed for the requested provider.
**Learning:** Relying on application-layer filtering for multi-column identifiers in database queries is non-deterministic and can lead to Authorization Bypass or Denial of Service if the wrong record is returned and processed.
**Prevention:** Always include all parts of a composite key or multi-column identifier in the SQL `WHERE` clause using `and()` to ensure the database returns the exact intended record.
