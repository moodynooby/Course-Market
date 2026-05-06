## 2025-05-15 - [A11y/UX] Enhanced discoverability with dynamic tooltips
**Learning:** Icon-only buttons (theme toggle, expand/collapse) require both `aria-label` for screen readers and `Tooltip` for sighted users to ensure full accessibility and discoverability. Dynamic tooltips that describe the *next* state (e.g., "Switch to dark mode") are more helpful than static labels.
**Action:** Always wrap `IconButton` with a `Tooltip` and provide a descriptive `aria-label`. Use dynamic titles for stateful buttons.
