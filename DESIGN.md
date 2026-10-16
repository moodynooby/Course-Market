# AuraIsHub Design System Specification

> Authoritative visual guidelines, token dictionary, and design contracts for all agents and engineers contributing to AuraIsHub.

---

## 1. Core Identity & Philosophy

AuraIsHub is an academic scheduling and course-section trading platform built for university students. Its aesthetic is **approachable mastery** (inspired by Duolingo): clean, energetic, playful, yet disciplined and functional.

### Brand Rules & Invariants

1. **Brand Name:** Always maintain the exact brand name **AuraIsHub**. Never rename to "AuraHub", "CourseMarket", or generic aliases.
2. **Brand Lockup:** Rendered as `AuraIs` with an attached high-contrast primary badge `[HUB]`.
3. **Anti-Slop Mandate:** Generic LLM design tropes are forbidden:
   - No electric indigo gradients or arbitrary purple drop shadows.
   - No meme / cringe buzzwords in UI copy (e.g. "✨ Peak Aura", "⚡ Strong Flow", "Maximum aura").
   - No div-based fake screenshot mockups or clipart.
4. **Zero Em-Dash Enforcement:** Never use em-dashes (`—`) or en-dashes (`–`) in visible UI copy. Use a period, a colon, parentheses, or a regular hyphen (`-`).

---

## 2. Color System

### Primary & Accent Palette

| Token | Light Mode Value | Dark Mode Value | Contrast Ratio & Usage |
| :--- | :--- | :--- | :--- |
| `primary.main` | `#ea2b2b` (Vivid Red) | `#ff5c5c` (Coral Red) | Primary CTAs, active badge, key actions |
| `primary.contrastText` | `#ffffff` | `#ffffff` | 4.8:1 against `#ea2b2b` (WCAG AA compliant) |
| `primary.light` | `#f87171` | `#ff8585` | Hover tints, subtle states |
| `primary.dark` | `#b91c1c` | `#c52222` | 3D button shadow, active borders |
| `secondary.main` | `#1cb0f6` (Cyan) | `#1cb0f6` (Cyan) | Secondary CTAs, links, tabs, highlights |
| `secondary.contrastText` | `#ffffff` | `#ffffff` | High contrast on cyan |
| `background.default` | `#ddf4ff` (Sky Blue) | `#131f24` (Dark Slate) | App canvas background |
| `background.paper` | `#ffffff` (Pure White) | `#1b2a32` (Surface Slate) | Card, modal, and drawer containers |
| `text.primary` | `#3c3c3c` (Charcoal) | `#f7f7f7` (Off-white) | 18:1 contrast on `#ddf4ff` (WCAG AAA) |
| `text.secondary` | `#777777` (Muted) | `#9fb4c0` (Slate Muted) | Labels, timestamps, secondary copy |
| `divider` | `#cde4f0` | `#283b46` | Card borders, table dividers |

### Semantic Status Tokens

- **Error:** `#ff4b4b` (coral red)
- **Warning:** `#ff9600` (gold/amber)
- **Success:** `#10b981` (emerald green)
- **Info:** `#1cb0f6` (cyan blue)

### Domain & Module Color Accents

For icons, navigation tabs, and module identifiers:

- **Dashboard / Schedule:** `#ea2b2b` (Red)
- **Course Trading:** `#1cb0f6` (Cyan)
- **Rate My Prof:** `#ff9600` (Gold)
- **Course Browser:** `#af70ff` (Purple)

---

## 3. Typography

- **Font Family:** `"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  - Self-hosted in `/fonts/PlusJakartaSans-VariableFont_wght.woff2`
- **Weighting:**
  - Headings (`h1`-`h6`): `fontWeight: 700` or `800`, with `letterSpacing: 0.8px` for scannability on mobile screens.
  - Subtitles (`subtitle1`, `subtitle2`): `fontWeight: 600`, with `letterSpacing: 0.6px`.
  - Body Text (`body1`, `body2`): `fontWeight: 600` (body1) and `500` (body2), line height 1.5.
  - Button Text: `fontWeight: 700`, `letterSpacing: 0.6px`, text transform `none`.

---

## 4. Component Geometry & Elevation

### 12px Radius Standard

All primary UI elements adhere to a uniform **12px** radius scale (`radius.sm: 12px`):

- **Buttons:** `borderRadius: 12px`
- **Cards & Paper:** `borderRadius: 12px` (mobile) / `14px` (desktop), border `2px solid divider`
- **Dialogs & Modals:** `borderRadius: 16px`, border `2px solid divider`
- **Text Inputs & Selects:** `borderRadius: 12px`, outline fieldset `2px solid`
- **Chips & Badges:** `borderRadius: 10px`, `fontWeight: 700`

### Tactile 3D Feedback

Buttons and interactive cards feature physical push feedback rather than flat transitions:

- **Contained Primary Button:**

  ```css
  background-color: #ea2b2b;
  color: #ffffff;
  box-shadow: 0 3px 0 #b91c1c;
  border-radius: 12px;
  font-weight: 700;
  ```

  - **Hover:** `background-color: #dc2626; box-shadow: 0 3px 0 #991b1b;`
  - **Active (Press):** `transform: translateY(2px); box-shadow: 0 1px 0 #991b1b;`

- **Contained Secondary Button:**

  ```css
  background-color: #1cb0f6;
  color: #ffffff;
  box-shadow: 0 3px 0 #028ce0;
  border-radius: 12px;
  font-weight: 700;
  ```

  - **Hover:** `background-color: #189edc; box-shadow: 0 3px 0 #027bc4;`
  - **Active (Press):** `transform: translateY(2px); box-shadow: 0 1px 0 #027bc4;`

---

## 5. Layout & Navigation Conventions

- **Desktop Navigation ([`src/components/layout/NavLinks.tsx`](file:///home/manas/Desktop/Course-Market/src/components/layout/NavLinks.tsx)):**
  - Height: 40px per item, single line overflow scrollable.
  - Active links use a 12px squircle with `border: 2px solid`, subtle tinted background, and bold text.
- **Mobile Navigation ([`src/components/layout/MobileNav.tsx`](file:///home/manas/Desktop/Course-Market/src/components/layout/MobileNav.tsx)):**
  - Fixed bottom navigation bar with `pb: env(safe-area-inset-bottom)`.
  - Selected actions styled in their respective module color.
- **Header Bar ([`src/components/layout/AppBarHeader.tsx`](file:///home/manas/Desktop/Course-Market/src/components/layout/AppBarHeader.tsx)):**
  - Sticky at top, `zIndex: 50`, max width 1280px centered.
  - Includes theme toggle (light / dark / system) and semester selector.

---

## 6. Pre-Flight Checklist for Agents

Before completing any UI or styling task, verify:

- [ ] **Color Fidelity:** Did you use the official red primary (`#ea2b2b` light, `#ff5c5c` dark), cyan accent (`#1cb0f6`), and sky blue canvas (`#ddf4ff`)?
- [ ] **Contrast Compliance:** Is all text readable against its background (WCAG AA min 4.5:1 for body, 3:1 for large)?
- [ ] **Shape Consistency:** Do all buttons and inputs use 12px radius with 2px borders?
- [ ] **Zero Em-Dashes:** Did you scan and eliminate any `—` or `–` characters from user-facing copy?
- [ ] **Copy Register:** Is copy clear, helpful, and free from AI buzzwords?
- [ ] **Anti-Regression:** Are schedule generation algorithms, deterministic sorting, and auth callbacks untouched?
- [ ] **Quality Gate:** Did `pnpm run lint` pass completely (Biome, Markdownlint, ShellCheck, TypeScript, Vitest)?
