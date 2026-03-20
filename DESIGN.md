```markdown
# Design System Specification

## 1. Overview & Creative North Star: "The Ethereal Tactile"
This design system moves away from the rigid, grid-locked structures of traditional Material Design toward a philosophy we call **The Ethereal Tactile**. 

The goal is to create a digital environment that feels as though it is composed of soft, matte physical layers floating in a pressurized void. By prioritizing **intentional asymmetry**, **extreme corner radii**, and **tonal depth** over structural lines, we achieve an aesthetic that is both "fun" and sophisticated. We do not use borders to separate ideas; we use space and subtle shifts in light. The result is a UI that feels "light and airy" despite its deep charcoal foundations.

---

## 2. Colors & Surface Architecture
Our palette is rooted in a monochromatic charcoal base, punctuated by a "crisp" citrus accent. We utilize the Material 3 tonal slotting system but apply it with editorial restraint.

### The Palette (Core Tokens)
- **Surface/Background:** `#0e0e0e` (The Void)
- **Primary (Neutral Soft):** `#c6c6c6` (Used for high-contrast utility)
- **Tertiary (The Accent):** `#ffb148` (Our signature orange, used sparingly)
- **Error:** `#fa746f` (Softened coral)

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Boundary definition must be achieved through:
1.  **Background Shifts:** Placing a `surface-container-high` (`#1f2020`) element on top of a `surface` (`#0e0e0e`) background.
2.  **Negative Space:** Utilizing the scale (e.g., `spacing-8` or `spacing-10`) to create a cognitive break between content blocks.

### Surface Hierarchy & Nesting
Think of the UI as a series of nested trays. 
- **Level 0 (Base):** `surface` (`#0e0e0e`)
- **Level 1 (Sections):** `surface-container-low` (`#131313`)
- **Level 2 (Cards/Modules):** `surface-container-high` (`#1f2020`)
- **Level 3 (Interactive/Floating):** `surface-bright` (`#2c2c2c`)

### The "Glass & Gradient" Rule
To inject "soul" into the dark mode:
- **Glassmorphism:** For floating headers or navigation bars, use `surface-container` colors at 70% opacity with a `20px` backdrop-blur.
- **Signature Textures:** Main CTAs should use a subtle linear gradient from `primary` (`#c6c6c6`) to `primary-dim` (`#b8b9b9`) at a 135° angle to create a "milled metal" feel.

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

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are too heavy for an "airy" feel. We achieve lift through light, not darkness.

- **The Layering Principle:** Depth is achieved by "stacking." A `surface-container-highest` (`#252626`) card floating over a `surface` background creates immediate hierarchy without a single shadow pixel.
- **Ambient Shadows:** When a component must "float" (e.g., a Modal), use an extra-diffused shadow:
  - `box-shadow: 0px 24px 48px rgba(0, 0, 0, 0.4);`
- **The "Ghost Border" Fallback:** If accessibility requires a container edge, use `outline-variant` (`#484848`) at **15% opacity**. It should be felt, not seen.
- **Corner Radii:** Our signature "Fun" attribute. 
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

### Signature Component: The "Floating Orb"
For status indicators, use a small 8px circle of `tertiary` with a `blur(4px)` glow behind it. This feels "alive" and modern.

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