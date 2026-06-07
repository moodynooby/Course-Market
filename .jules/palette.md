## 2025-05-15 - Standardizing Search and Empty States

**Learning:** Consistent search behavior and empty states significantly reduce user friction. In this application, TextField search inputs should include a 'Clear' button with a Tooltip and aria-label when text is present. Additionally, using a dedicated `EmptyState` component for both "no results" and "no data" scenarios ensures a unified visual language and provides clear calls to action (e.g., Sync Data).

**Action:** Always include a 'Clear' IconButton in `slotProps.input.endAdornment` for search TextFields. Utilize the `EmptyState` component instead of manual box/typography layouts for empty lists or search results.

## 2025-05-16 - Visibility Toggles for Sensitive Inputs

**Learning:** Sensitive inputs like API keys should always have a visibility toggle to allow users to verify their input while maintaining privacy by default. This reduces input errors and improves the overall user confidence in the interface.

**Action:** Implement a visibility toggle using a state-controlled 'type' (text/password) and an 'endAdornment' with an 'IconButton' showing 'Visibility' or 'VisibilityOff' icons. Always include a 'Tooltip' and 'aria-label' for accessibility.
