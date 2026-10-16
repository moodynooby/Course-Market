# Vibrant and Social Rebrand: AuraIsHub

- Status: complete
- Owners: AuraIsHub core team
- Last Updated: 2026-10-16
- Related Files: `src/theme/theme.ts`, `src/index.css`, `src/components/layout/NavLinks.tsx`, `src/components/layout/AppBarHeader.tsx`, `src/components/layout/MobileNav.tsx`, `src/components/layout/UserMenu.tsx`, `src/components/layout/SemesterMenu.tsx`, `src/pages/TradingPage.tsx`, `src/components/schedule-explorer/ScheduleDetails.tsx`, `src/components/dashboard/EmptyDashboardState.tsx`, `src/pages/LoginPage.tsx`, `src/pages/OnboardingPage.tsx`, `src/pages/ProfessorsPage.tsx`

## Goal

Elevate the AuraIsHub user experience from a meme-styled prototype into a mature, credible, and delightfully fun ("Vibrant & Social" fintech/Duolingo-grade) academic platform while retaining the name AuraIsHub and preserving all existing deep link, authentication, and schedule-generation contracts.

## Key Changes

1. **Geometry & Component Radius Normalization:**
   - Rationalized button, card, dialog, input, and chip radii away from 32px hyper-bubbles and 9999px pills into a disciplined 10px–14px geometry with subtle 1px border strokes.
   - Refined active press states (`transform: scale(0.98)`).

2. **Color Palette Modernization:**
   - Upgraded default Material 3 palette to an Electric Indigo primary (`#4f46e5` light / `#818cf8` dark) with rich slate/obsidian foundations (`#0f172a` light / `#0b0f19` dark) and punchy status accents (Amber `#f59e0b`, Emerald `#10b981`).

3. **Iconography & Micro-Badges:**
   - Retired 3D raster clipart (the skull for professors, missed call for dashboard, locker for trading).
   - Replaced with cohesive SVG vector glyphs encased in subtle squircle micro-badges across navigation bars (`NavLinks.tsx`, `MobileNav.tsx`).

4. **Interactive Social Trading Experience:**
   - Overhauled `TradeCard` on the Trading board with a clear, tactile exchange block (`[OFFERING Sec X] ⇄ [WANTS Sec Y]`) and color-coded status pills.

5. **Aura Metrics & Playful Tone:**
   - Added fun "✨ Peak Aura" and "⚡ Strong Flow" schedule rating badges in `ScheduleDetails.tsx`.
   - Updated empty states and login/onboarding hero copy to celebrate student energy without juvenile slang.

## Verification

- `pnpm run lint:biome`: passed without errors.
- `pnpm run lint:markdown`: passed without errors.
- `pnpm run lint:shell`: passed without errors.
- `pnpm run typecheck`: passed across app, node, and netlify configs.
- Full Vitest suite: 15 test files, 149 tests passing.
