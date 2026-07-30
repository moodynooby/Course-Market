## 2025-05-15 - Standardizing Search and Empty States

**Learning:** Consistent search behavior and empty states significantly reduce user friction. In this application, TextField search inputs should include a 'Clear' button with a Tooltip and aria-label when text is present. Additionally, using a dedicated `EmptyState` component for both "no results" and "no data" scenarios ensures a unified visual language and provides clear calls to action (e.g., Sync Data).

**Action:** Always include a 'Clear' IconButton in `slotProps.input.endAdornment` for search TextFields. Utilize the `EmptyState` component instead of manual box/typography layouts for empty lists or search results.

## 2026-06-21 - Automated Icon Scaling in Shared UI Components

**Learning:** Centralizing icon scaling logic within a shared component (like `EmptyState`) using CSS selectors (e.g., `& svg`) eliminates the need for manual `fontSize` overrides at every call site. This prevents visual regressions and ensures icons always maintain a consistent proportion relative to their container across different component variants (compact, default, fullscreen).

**Action:** When creating or updating shared UI components that wrap icons, implement automatic scaling via CSS child selectors rather than relying on props or manual overrides by the consumer.
