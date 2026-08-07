## 2025-05-15 - Standardizing Search and Empty States

**Learning:** Consistent search behavior and empty states significantly reduce user friction. In this application, TextField search inputs should include a 'Clear' button with a Tooltip and aria-label when text is present. Additionally, using a dedicated `EmptyState` component for both "no results" and "no data" scenarios ensures a unified visual language and provides clear calls to action (e.g., Sync Data).

**Action:** Always include a 'Clear' IconButton in `slotProps.input.endAdornment` for search TextFields. Utilize the `EmptyState` component instead of manual box/typography layouts for empty lists or search results.

## 2025-05-16 - Form Input Validation and Feedback

**Learning:** Real-time character counts and explicit `maxLength` constraints provide immediate feedback, preventing submission errors. For complex helper text (e.g., using `Stack` for alignment), `FormHelperText` must be set to `component="div"` to maintain valid HTML (as it defaults to `<p>`).

**Action:** Implement character counters in `helperText` using a `Stack` with `justifyContent: 'space-between'`. Always set `slotProps.formHelperText={{ component: 'div' }}` when using non-phrasing content like `Stack`.
