## 2025-05-15 - Standardizing Search and Empty States

**Learning:** Consistent search behavior and empty states significantly reduce user friction. In this application, TextField search inputs should include a 'Clear' button with a Tooltip and aria-label when text is present. Additionally, using a dedicated `EmptyState` component for both "no results" and "no data" scenarios ensures a unified visual language and provides clear calls to action (e.g., Sync Data).

**Action:** Always include a 'Clear' IconButton in `slotProps.input.endAdornment` for search TextFields. Utilize the `EmptyState` component instead of manual box/typography layouts for empty lists or search results.

## 2025-05-20 - Centralized UI Logic in Shared Components

**Learning:** Manual overrides (like `fontSize` on icons) across multiple call sites lead to visual drift and maintenance overhead. Centralizing this logic within the shared component (e.g., using `& svg` selectors in `EmptyState`) ensures perfect consistency and a cleaner API for consumers. Adding subtle animations like a "pulse" to empty states makes the UI feel more responsive and high-quality.

**Action:** Avoid manual `sx` overrides on children passed to shared components; instead, bake the intended styling into the parent component's logic.
