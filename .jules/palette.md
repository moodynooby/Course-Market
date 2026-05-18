## 2025-05-15 - Dynamic Tooltips for Stateful Buttons
**Learning:** Icon buttons that cycle through multiple states (like a theme toggle) should have dynamic `aria-label` and `Tooltip` values that describe the *result* of the next click, rather than the current state, to improve discoverability and clarity.
**Action:** Always calculate the next state's label when implementing state-cycling components.

## 2025-05-15 - Accessibility for Icon-Only Buttons
**Learning:** Material UI `IconButton` components are often missing descriptive `aria-label` attributes, making them inaccessible to screen readers. Pair them with a `Tooltip` to provide visual and non-visual hints simultaneously.
**Action:** Audit all `IconButton` usages and ensure they have both `aria-label` and a wrapping `Tooltip`.
