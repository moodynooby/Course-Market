## 2025-05-14 - [Stateful Icon Button Tooltips]
**Learning:** Icon-only buttons that toggle states (like theme switchers or expand/collapse sections) should have tooltips that describe the *next* state or the *action* that will be performed, rather than just a static label. This improves both accessibility (via aria-label) and discoverability for sighted users.
**Action:** When implementing toggle buttons, use dynamic titles for Tooltips and aria-labels that reflect the state change (e.g., "Show sections" vs "Hide sections").
