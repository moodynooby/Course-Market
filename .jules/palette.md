## 2025-05-15 - Standardizing Search and Empty States

**Learning:** Consistent search behavior and empty states significantly reduce user friction. In this application, TextField search inputs should include a 'Clear' button with a Tooltip and aria-label when text is present. Additionally, using a dedicated `EmptyState` component for both "no results" and "no data" scenarios ensures a unified visual language and provides clear calls to action (e.g., Sync Data).

**Action:** Always include a 'Clear' IconButton in `slotProps.input.endAdornment` for search TextFields. Utilize the `EmptyState` component instead of manual box/typography layouts for empty lists or search results.

## 2025-05-20 - Decoupling Component logic from Consumer overrides

**Learning:** Component consumers should not be responsible for internal layout details like icon sizing. Refactoring `EmptyState` to handle icon scaling via a CSS selector (`& .MuiSvgIcon-root`) based on its `variant` prop ensures visual consistency across the app and reduces developer friction by removing the need for manual `sx` overrides at every call site.

**Action:** When creating shared UI components that wrap icons or other sub-elements, manage their dimensions internally based on the parent's state or variants rather than relying on consumer-passed props.
