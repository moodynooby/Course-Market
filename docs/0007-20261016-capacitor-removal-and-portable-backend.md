# Capacitor Removal and Portable Backend Driver

- Status: complete
- Owners: Architecture, Web & Mobile Platform
- Last Updated: 2026-10-16
- Related Files: `db/index.ts`, `src/utils/share.ts`, `src/utils/haptics.ts`, `ARCHITECTURE-MAP.md`, `package.json`

## Context & Motivation

AuraIsHub historically packaged an Android Studio shell via Capacitor (`android/`, `capacitor.config.ts`, `src/native/`). This introduced substantial friction:

- 12 `@capacitor/*` and `@capawesome/*` dependencies.
- Divergent OAuth code paths (custom URL scheme handlers vs. web callback).
- Divergent sharing and haptic code paths.
- Reliance on Netlify-specific database wrappers (`@netlify/neon`).

To support frictionless deployment across both Vercel and Netlify while dramatically simplifying the codebase, Capacitor was removed and the database layer was standardized.

## Key Changes

1. **Capacitor Mobile Shell Removal**:
   - Deleted `android/` Gradle project, `capacitor.config.ts`, and `src/native/`.
   - Removed 12 `@capacitor/*` dependencies and native build scripts (`cap:sync`, `cap:build:android`).
   - Cleaned all `isNativePlatform` conditionals from UI navigation ([AppBarHeader.tsx](file:///home/manas/Desktop/Course-Market/src/components/layout/AppBarHeader.tsx), [MobileNav.tsx](file:///home/manas/Desktop/Course-Market/src/components/layout/MobileNav.tsx), [NavLinks.tsx](file:///home/manas/Desktop/Course-Market/src/components/layout/NavLinks.tsx)), authentication ([AuthContext.tsx](file:///home/manas/Desktop/Course-Market/src/context/AuthContext.tsx)), and the API client ([apiClient.ts](file:///home/manas/Desktop/Course-Market/src/services/apiClient.ts)).

2. **Web-Standard Replacements**:
   - Replaced native share plugin with standard Web Share API (`navigator.share`, `navigator.canShare`) and clipboard fallback in [src/utils/share.ts](file:///home/manas/Desktop/Course-Market/src/utils/share.ts).
   - Replaced native haptic feedback with standard Web Vibration API (`navigator.vibrate`) in [src/utils/haptics.ts](file:///home/manas/Desktop/Course-Market/src/utils/haptics.ts).

3. **Portable Database Driver**:
   - Replaced `@netlify/neon` with standard `@neondatabase/serverless` in [db/index.ts](file:///home/manas/Desktop/Course-Market/db/index.ts).
   - Upgraded Drizzle CLI scripts in [package.json](file:///home/manas/Desktop/Course-Market/package.json) to eliminate `netlify dev:exec` wrapper, utilizing standard `dotenv` configuration.
   - The app now operates seamlessly on both Vercel, Netlify, and standard Node.js/Docker runtimes.

## Verification

- **Linting & Formatting**: `pnpm run lint:biome` passed (119 files).
- **TypeScript**: `pnpm run typecheck` passed with 0 errors across app, node, and netlify configs.
- **Unit Tests**: `pnpm run test` passed (15 test files, 149 tests).
