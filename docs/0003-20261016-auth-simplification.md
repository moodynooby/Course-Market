# Authentication Simplification and Direct Google Sign-In

- Status: complete
- Owners: Course-Market maintainers
- Last Updated: 2026-10-16
- Related Files: `src/context/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/App.tsx`, `src/pages/LoginPage.tsx`, `src/pages/CallbackPage.tsx`, `src/pages/OnboardingPage.tsx`, `src/utils/authReturn.ts`, `src/native/auth.ts`, `src/native/nativeAuth.ts`, `src/native/deepLinks.ts`

## Goal

Simplify the authentication model by requiring authentication upfront, bypassing the Auth0 hosted screen directly into Google OAuth, eliminating action-time auth guarding (`useAuthGuard`), and deduplicating native auth callback handling.

## Scope

- Switch from action-time lazy auth gating to mandatory authentication at the route boundary (`ProtectedRoute`).
- Configure direct Google OAuth redirection via `connection: 'google-oauth2'`.
- Fix profile lifecycle race conditions in `AuthContext` to prevent false redirects to onboarding.
- Replace `useAuthGuard` with a pure utility `src/utils/authReturn.ts` for preserving return URLs.
- Deduplicate native Capacitor Auth0 callback recognition into `src/native/auth.ts`.
- Wrap `<Layout />` once with `<ProtectedRoute>` in `src/App.tsx`.
- Streamline `LoginPage` with a focused "Continue with Google" action and authenticated redirects.
- Guard `OnboardingPage` against unauthenticated access.

## Invariants

- Preserve schedule generation, scoring, and conflict metadata contracts.
- Preserve public Netlify server functions and PostgreSQL Drizzle schemas.
- Preserve Capacitor Android URL scheme routing (`auraishub://...`).
- Pass all checks in `npm run lint` without bypasses.

## Implemented

- Added `connection: 'google-oauth2'` to `loginWithRedirect` so sign-in routes directly to Google.
- Fixed `profileInitialized` lifecycle in `AuthContext` to prevent `loading` flashing `false` before profile completion.
- Replaced individual route protection in `App.tsx` with a single `<ProtectedRoute>` wrapping `<Layout />`.
- Removed `src/hooks/useAuthGuard.ts` and replaced return URL storage with `src/utils/authReturn.ts`.
- Consolidated `isAuthCallback` in `src/native/auth.ts` and reused in `src/native/nativeAuth.ts` and `src/native/deepLinks.ts`.
- Simplified `LoginPage` to a clean Google sign-in view with automatic redirect for authenticated users.
- Added unauthenticated redirect in `OnboardingPage`.
- Removed dead guest browsing banners, `actionLabel` leftovers, and redundant `isAuthenticated` / `!user` guards in `CoursesPage`, `TradingPage`, and `ProfessorsPage`.
- Cleaned up obsolete test mocks in `src/test/mocks.tsx`.
- Added unit tests for `authReturn` utility in `src/utils/__tests__/authReturn.test.ts`.

## Verification

- `npm run lint`: passing (Biome, Markdownlint, ShellCheck, TypeScript, Vitest).
- Tests: 14 test files, 138 tests passing.
