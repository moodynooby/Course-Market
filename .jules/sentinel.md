## 2025-05-15 - [Excessive Data Exposure in API responses]
**Vulnerability:** Excessive Data Exposure (OWASP API3:2023). API endpoints for creating or updating records returned sensitive PII (userEmail, auth0UserId) by default.
**Learning:** Using Drizzle's `.returning()` without arguments returns all columns in the table. While convenient for development, it often leaks internal or sensitive identifiers that the frontend doesn't need.
**Prevention:** Always use explicit column selection in `.returning()` (and `.select()`) calls to ensure only necessary data is sent to the client, following the principle of least privilege.
