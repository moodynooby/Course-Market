## 2025-05-15 - Standardizing Search and Empty States

**Learning:** Consistent search behavior and empty states significantly reduce user friction. In this application, TextField search inputs should include a 'Clear' button with a Tooltip and aria-label when text is present. Additionally, using a dedicated `EmptyState` component for both "no results" and "no data" scenarios ensures a unified visual language and provides clear calls to action (e.g., Sync Data).

**Action:** Always include a 'Clear' IconButton in `slotProps.input.endAdornment` for search TextFields. Utilize the `EmptyState` component instead of manual box/typography layouts for empty lists or search results.

## 2025-05-20 - Enhancing Empty States and Filter UI

**Learning:** Adding a subtle pulse animation to empty states makes the interface feel "alive" rather than static or broken. Refactoring filters from `FormControl/Select` to `TextField select` not only reduces boilerplate but also ensures visual alignment with other `TextField`-based inputs like search. Centralizing icon scaling within the `EmptyState` component via child SVG selectors allows for a cleaner API where developers can pass raw icons without manual sizing.

**Action:** Use `TextField select` for filter dropdowns. Favor automatic icon scaling in shared components. Add subtle animations to key feedback states.
