## 2025-05-15 - Excessive Data Exposure in Netlify Functions
**Vulnerability:** Netlify functions using Drizzle `.returning()` without explicit column selection were returning all columns, including PII like `userEmail`.
**Learning:** Default wildcard selection (like `SELECT *`) in API responses violates the principle of least privilege and can lead to accidental PII leakage when new columns are added to the schema.
**Prevention:** Always use explicit column selection in `select()` and `.returning()` calls to ensure only necessary, non-sensitive data is exposed to the client.

## 2025-05-16 - Non-Deterministic Key Retrieval in LLM Proxy
**Vulnerability:** `getUserKey` retrieved a user's first API key using `limit(1)` and then checked the provider in application logic.
**Learning:** If a user has keys for multiple providers (e.g., Groq, OpenAI), the database might return a non-matching key first, causing the function to incorrectly return `null` and deny access despite a valid key existing.
**Prevention:** Always include all identifying criteria (e.g., `provider` and `auth0UserId`) in the database `WHERE` clause to ensure deterministic and accurate data retrieval.
