# Palette's Journal - Critical UX/Accessibility Learnings

## 2025-05-14 - Standardizing Icon Button Accessibility
**Learning:** Icon-only buttons without tooltips and ARIA labels are inaccessible to screen readers and difficult for new users to discover.
**Action:** Always wrap `IconButton` with a `Tooltip` and provide a descriptive `aria-label`. Use dynamic tooltip text for stateful buttons (e.g., theme toggle) to indicate the action that will be taken.
