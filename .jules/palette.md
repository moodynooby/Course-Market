## 2025-05-14 - Tooltips on Disabled Elements in MUI
**Learning:** Material UI tooltips do not trigger on disabled elements because disabled elements do not emit pointer events. This can lead to a confusing UX where a user cannot see why a button is disabled.
**Action:** Wrap disabled interactive elements in a `span` or `div` before applying the `Tooltip` component to ensure the tooltip is displayed even when the element is disabled.

## 2025-05-14 - Accessibility for Icon-Only Buttons
**Learning:** Icon-only buttons are completely opaque to screen reader users if they lack an `aria-label`. Visual users may also be unsure of the exact function of an icon without a tooltip.
**Action:** Always provide both an `aria-label` and a `Tooltip` for `IconButton` components, ensuring the label is descriptive and reflects the current state (e.g., "Expand" vs "Collapse").
