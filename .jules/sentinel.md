# Sentinel Security Journal

## 2025-05-15 - JWT Algorithm Hardening
**Vulnerability:** JWT validation was implicitly allowing any algorithm supported by the library, which can lead to algorithm confusion attacks (e.g., forcing HMAC validation with a public key).
**Learning:** Even when using a JWKS provider, it is safer to explicitly restrict the allowed algorithms to those expected (in this case, RS256).
**Prevention:** Always specify `algorithms: ['RS256']` in `jwtVerify` options when working with Auth0 or similar OIDC providers.

## 2025-05-15 - Error Message Information Disclosure
**Vulnerability:** Netlify functions were returning raw error messages in 500 Internal Server Error responses, potentially leaking database schema details or internal logic.
**Learning:** Detailed error logging should happen on the server side, while the client should receive a generic message for unexpected failures.
**Prevention:** Use a centralized `secureErrorResponse` helper to mask 500-level error messages before they reach the client.

## 2025-05-15 - Missing Input Length Limits
**Vulnerability:** The `description` field in the trade schema lacked a maximum length limit, creating a risk of resource exhaustion (DoS) or database bloat if a malicious user sent extremely large strings.
**Learning:** Every text input that is stored in the database should have a reasonable `max()` constraint in its validation schema.
**Prevention:** Audit Zod schemas and ensure all string fields have appropriate `.max()` limits.
