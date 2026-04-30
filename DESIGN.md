```markdown
# Design System Specification

## 1. Overview & Creative North Star: "The Ethereal Tactile"
This design system follows **Material Design 3 (MUI3)** principles with a distinctive dark aesthetic. We call this philosophy **The Ethereal Tactile**.

The goal is to create a digital environment composed of soft, matte physical layers with clear tonal hierarchy. By prioritizing **intentional asymmetry**, **extreme corner radii**, and **MUI3 tonal elevation** over structural lines, we achieve an aesthetic that is both "fun" and sophisticated. We do not use borders to separate ideas; we use space and subtle shifts in surface color. The result is a UI that feels "light and airy" despite its deep charcoal foundations.

**MUI3 Alignment:** This design system strictly follows Material 3 color roles and elevation patterns.

---

## 2. Colors & Surface Architecture
Our palette is rooted in a monochromatic charcoal base, punctuated by a "crisp" citrus accent. We utilize the Material 3 tonal slotting system but apply it with editorial restraint.

### The Palette (Core Tokens)
- **Surface/Background:** `#0e0e0e` (The Void)
- **Primary (Neutral Soft):** `#c6c6c6` (Used for high-contrast utility)
- **Tertiary (The Accent):** `#ffb148` (Our signature orange, used sparingly)
- **Error:** `#fa746f` (Softened coral)

### Surface Hierarchy & Nesting
Think of the UI as a series of nested trays. 
- **Level 0 (Base):** `surface` (`#0e0e0e`)
- **Level 1 (Sections):** `surface-container-low` (`#131313`)
- **Level 2 (Cards/Modules):** `surface-container-high` (`#1f2020`)
- **Level 3 (Interactive/Floating):** `surface-bright` (`#2c2c2c`)

### The "Tonal Elevation" Rule (MUI3)
Elevation is achieved through surface color tonal shifts, not shadows or blur:
- **Level 0 (Base):** `surface` - The void background
- **Level 1:** `surfaceContainerLow` - Slightly elevated sections
- **Level 2:** `surfaceContainer` - Cards and contained areas
- **Level 3:** `surfaceContainerHigh` - Elevated cards, navigation bars
- **Level 4:** `surfaceContainerHighest` - Inputs, highest contained surfaces
- **Level 5:** `surfaceBright` - Interactive elements, dialogs, menus

**Note:** No backdrop-filter, blur effects, or glassmorphism. Elevation is purely expressed through surface color value changes.

---

## 3. Typography: The Editorial Voice
We use **Plus Jakarta Sans** as our sole typeface. Its geometric foundations provide "fun" energy, while its open apertures maintain high readability.

| Level | Size | Weight | Tracking | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Display-LG** | 3.5rem | 700 | -0.02em | Hero statements/Brand moments |
| **Headline-MD** | 1.75rem | 600 | -0.01em | Section entry points |
| **Title-SM** | 1.0rem | 600 | 0 | Sub-headers and Card titles |
| **Body-LG** | 1.0rem | 400 | 0 | Long-form reading |
| **Label-MD** | 0.75rem | 500 | 0.05em | Micro-copy and Tags |

**Editorial Contrast:** Always pair a `Display-LG` header with `Body-MD` or `Label-MD` in close proximity to create a high-fashion, high-contrast typographic rhythm.

---

## 4. Elevation & Depth: MUI3 Tonal System
Following Material 3, elevation is expressed through surface color changes (tonal elevation), not shadows or blur effects.

- **The Tonal Elevation Principle:** Each elevation level has a specific surface container color. Higher elevation = lighter surface tint against the dark background.
- **MUI3 Elevation Levels:**
  - **Surface (Level 0):** `#0e0e0e` - The void, background default
  - **Surface Container Low (Level 1):** `#131313` - Lowest containers
  - **Surface Container (Level 2):** `#1a1a1a` - Standard containers
  - **Surface Container High (Level 3):** `#1f2020` - Elevated containers, navigation bars
  - **Surface Container Highest (Level 4):** `#252626` - Inputs, highest contained surfaces
  - **Surface Bright (Level 5):** `#2c2c2c` - Interactive elements, dialogs
- **Ambient Shadows (Minimal Use):** Only for dialogs/modals that truly "float" above all content:
  - `box-shadow: 0px 24px 48px rgba(0, 0, 0, 0.4);`
- **The "Ghost Border" Fallback:** If accessibility requires a container edge, use `outline-variant` (`#484848`) at **15% opacity**. It should be felt, not seen.
- **Corner Radii:** MUI3 large corner radius for "Fun" aesthetic.
  - **Cards:** `rounded-lg` (2rem / 32px)
  - **Buttons/Chips:** `rounded-full` (9999px)
  - **Inner Nested Elements:** `rounded-md` (1.5rem / 24px)

---

## 5. Component Strategies

### Buttons
- **Primary:** `primary-container` background with `on-primary-container` text. Large padding (`spacing-4` horizontal).
- **Accent (The Orange):** Only used for the most critical action on a screen (e.g., "Submit" or "Buy"). Use `tertiary` (`#ffb148`) with `on-tertiary` (`#573500`) text.
- **Tertiary:** Ghost style. No background, `primary` text.

### Cards & Lists
- **No Dividers:** Forbid the use of horizontal lines.
- **Separation:** Use `spacing-6` (2rem) between list items. If the list is dense, use a alternating background shift between `surface-container-low` and `surface-container-lowest`.

### Input Fields
- **Styling:** Use `surface-container-highest` as the background. 
- **Focus State:** Do not use a blue ring. Use a `1px` ghost border of `tertiary` (Orange) and a subtle inner glow.

### Signature Component: The "Active Indicator"
For status indicators, use a small 8px circle of `tertiary` color with a subtle opacity ring behind it. This creates an "alive" feel without blur effects.

---

## 6. Do’s and Don’ts

### Do
- **Do** use asymmetrical layouts (e.g., a card that takes up 7/12 of the grid next to a card that takes up 4/12).
- **Do** embrace the `rounded-xl` (3rem) for large hero containers.
- **Do** use `on-surface-variant` (`#acabaa`) for secondary text to keep the "airy" feel.

### Don't
- **Don't** use 100% white (#FFFFFF). It is too harsh. Use `primary-fixed` (`#e2e2e2`) for high-contrast text.
- **Don't** use "Drop Shadows" on cards that are already resting on a container. Only use shadows for elements that physically move over others.
- **Don't** over-use the orange. If more than 5% of the screen is orange, the "crisp" effect is lost.

---

## 7. Spacing Scale (The Breath)
Space is our primary tool for organization.
- **Micro-adjustments:** `0.35rem` (1)
- **Component Internal:** `1rem` (3)
- **Section Gaps:** `4rem` (12)
- **Hero Margins:** `7rem` (20)

*Always favor "too much" space over "not enough." Air is luxury.*```