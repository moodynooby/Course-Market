## 2025-05-15 - Standardizing Search and Empty States

**Learning:** Consistent search behavior and empty states significantly reduce user friction. In this application, TextField search inputs should include a 'Clear' button with a Tooltip and aria-label when text is present. Additionally, using a dedicated `EmptyState` component for both "no results" and "no data" scenarios ensures a unified visual language and provides clear calls to action (e.g., Sync Data).

**Action:** Always include a 'Clear' IconButton in `slotProps.input.endAdornment` for search TextFields. Utilize the `EmptyState` component instead of manual box/typography layouts for empty lists or search results.

## 2026-06-08 - Visual Consistency in Search and Empty States
**Learning:** Using consistent iconography (Search/FilterList) as start adornments for search and filter inputs provides better visual affordance. Standardizing icon sizes (e.g., 40px) within the EmptyState component across different pages creates a more cohesive visual rhythm and prevents jarring transitions between list views.
**Action:** Use TextField with 'select' prop and FilterList icon for dropdown filters. Ensure all EmptyState icons use an explicit fontSize (e.g., 40) to maintain uniform balance.
