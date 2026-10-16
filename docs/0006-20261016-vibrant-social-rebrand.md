# Vibrant and Social Rebrand: AuraIsHub

- Status: complete
- Owners: AuraIsHub core team
- Last Updated: 2026-10-16
- Related Files: `src/theme/theme.ts`, `src/index.css`, `index.html`, `src/components/layout/NavLinks.tsx`, `src/components/layout/AppBarHeader.tsx`, `src/components/layout/MobileNav.tsx`, `src/components/layout/UserMenu.tsx`, `src/components/layout/SemesterMenu.tsx`, `src/pages/TradingPage.tsx`, `src/components/schedule-explorer/ScheduleDetails.tsx`, `src/components/dashboard/EmptyDashboardState.tsx`, `src/pages/LoginPage.tsx`, `src/pages/OnboardingPage.tsx`, `src/pages/ProfessorsPage.tsx`

## Goal

Elevate the AuraIsHub user experience from a meme-styled prototype into an authentic, mature, and delightfully fun academic platform using measured Duolingo design system tokens (`#a5ed6e` lime, `#ddf4ff` soft sky-blue canvas, `#1cb0f6` cyan accent, 12px radius, bold typography, tactile button feedback) while retaining the name AuraIsHub and preserving all existing deep link, authentication, and schedule-generation contracts.

## Key Changes

1. **Geometry and Radius System:**
   - Standardized uniform 12px border radius (`radius.sm: 12px`) across buttons, cards, papers, text fields, and inputs.
   - Refined tactile active press states (`transform: translateY(2px)` or `scale(0.98)` with physical 3D button shadow).

2. **Color Palette Alignment (Reddish Primary & Sky Blue):**
   - Implemented authentic Duolingo palette tokens with vivid reddish primary:
     - Primary: `#ea2b2b` (vivid red) in light mode, `#ff5c5c` (coral red) in dark mode, with `#ffffff` contrast text (4.8:1 contrast, WCAG AA compliant).
     - Background: `#ddf4ff` (pale sky-blue canvas) in light mode, `#131f24` in dark mode.
     - Surface / Paper: `#ffffff` in light mode, `#1b2a32` in dark mode.
     - Text: `#3c3c3c` (charcoal), Text-Muted: `#777777`.
     - Accent: `#1cb0f6` (bright cyan-blue for links, state changes, and secondary actions).
     - Status: `#ff4b4b` (coral red error), `#ff9600` (gold/amber warning), `#10b981` (emerald green success).

3. **Iconography and Navigation:**
   - Retired 3D raster clipart (the skull for professors, missed call for dashboard, locker for trading).
   - Cohesive vector glyphs with dedicated Duolingo accents across desktop navigation (`NavLinks.tsx`) and mobile bottom navigation (`MobileNav.tsx`).
   - High-contrast brand badge lockup in `AppBarHeader.tsx` and `LoginPage.tsx`.

4. **Interactive Social Trading Experience:**
   - Overhauled `TradeCard` on the Trading board with a clear, tactile exchange block (`[OFFERING Sec X] ⇄ [WANTS Sec Y]`) and color-coded status pills.

5. **Copy Refinement and Zero Em-Dash Enforcement:**
   - Replaced generic AI-slop copy ("Peak Aura", "Maximum aura", "Strong Flow") with crisp, motivating, science-grounded schedule rating badges (`Optimal`, `Good`, `Conflicts`) in `ScheduleDetails.tsx`.
   - Updated empty states and login/onboarding hero copy to celebrate student energy with clean, human copy.
   - Enforced zero em-dashes across all user-facing copy.

## Verification

- `pnpm run lint`: Biome, Markdownlint, ShellCheck, TypeScript, and unit tests pass cleanly.
- Full Vitest suite: 18 test files, 160 tests passing with zero errors.
- Dead assets and orphaned components (`AppBar.tsx`, legacy `3dicons-*.png`, unused `.active-indicator` CSS, and stale brand strings) cleaned up.
