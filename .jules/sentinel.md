# Sentinel Journal - Critical Security Learnings

## 2025-05-22 - Sentinel Initialized
**Vulnerability:** N/A
**Learning:** Initializing the Sentinel journal to track critical security findings and patterns.
**Prevention:** N/A

## 2025-05-22 - Information Disclosure in API Errors
**Vulnerability:** API endpoints were returning raw error messages and stack traces to the client in 500 responses.
**Learning:** This is a common pattern in early-stage development to aid debugging, but it exposes internal implementation details, database schema hints, and library versions to potential attackers.
**Prevention:** Always catch top-level errors and return a generic message to the client while logging the specific error on the server.

## 2025-05-22 - JWT Algorithm Confusion Risks
**Vulnerability:** JWT validation did not explicitly restrict allowed algorithms.
**Learning:** Without explicit algorithm pinning, an attacker could potentially perform an "algorithm confusion" attack, for example, by providing a token signed with HS256 using the public key as the secret.
**Prevention:** Always specify the expected algorithm (e.g., `RS256`) in the `jwtVerify` options.
