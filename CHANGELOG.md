# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to semantic versioning once releases are published.

## [Unreleased]

### Added

- Architecture map, contributor guide, documentation standards, and architecture baseline.
- Non-mutating quality gate, Husky staged checks, and pull-request CI enforcement.
- Focused calendar event, schedule details, and trading skeleton components.

### Fixed

- Validation failure on new account onboarding caused by requiring phone numbers during profile creation.
- Native Capacitor login redirect URI configuration so mobile authentication completes via custom scheme.
- Return context preservation across auth redirects and onboarding to keep users on their intended route.
- Premature profile loading state in auth context and onboarding skip bouncing.
- Recovery after a failed cached semester request.
- Deduplicated native Auth0 callback recognition across `auth.ts`, `nativeAuth.ts`, and `deepLinks.ts`.

### Changed

- Streamlined authentication to require login upfront, routing directly to Google OAuth (`connection: 'google-oauth2'`).
- Simplified `LoginPage` to a focused Google sign-in action with automatic redirects for authenticated users.
- Wrapped `<Layout />` once with `<ProtectedRoute>` in `App.tsx` instead of wrapping each route individually.
- Pinned Biome `2.5.14` as the single formatter and linter for supported source files.
- Centralized storage keys, schedule thresholds, and the canonical schedule type.

### Removed

- Download App button from the top navigation header for now.
- Unused `useAuthGuard` and action-time auth interception in favor of route-level authentication.
- Unused path aliases, dead exports, Lefthook, and disconnected offline persistence code.
