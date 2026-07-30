## 2025-05-15 - Standardizing Search and Empty States

**Learning:** Consistent search behavior and empty states significantly reduce user friction. In this application, TextField search inputs should include a 'Clear' button with a Tooltip and aria-label when text is present. Additionally, using a dedicated `EmptyState` component for both "no results" and "no data" scenarios ensures a unified visual language and provides clear calls to action (e.g., Sync Data).

**Action:** Always include a 'Clear' IconButton in `slotProps.input.endAdornment` for search TextFields. Utilize the `EmptyState` component instead of manual box/typography layouts for empty lists or search results.

## 2025-06-20 - Standardized Input Visuals and Interactive Empty States

**Learning:** Adding visual cues like `Search` or `FilterList` icons to `startAdornment` of inputs significantly improves scanability of forms. Furthermore, adding a subtle pulse animation to `EmptyState` backgrounds prevents "empty" screens from feeling like dead ends, especially when combined with a clear call-to-action button.

**Action:** Standardize all search and filter inputs with appropriate icons in `startAdornment` using `color="action"`. Use `EmptyState` with its built-in pulse animation for all null-data states.
