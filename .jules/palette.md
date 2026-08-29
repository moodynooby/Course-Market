## 2025-05-15 - Standardizing Search and Empty States

**Learning:** Consistent search behavior and empty states significantly reduce user friction. In this application, TextField search inputs should include a 'Clear' button with a Tooltip and aria-label when text is present. Additionally, using a dedicated `EmptyState` component for both "no results" and "no data" scenarios ensures a unified visual language and provides clear calls to action (e.g., Sync Data).

**Action:** Always include a 'Clear' IconButton in `slotProps.input.endAdornment` for search TextFields. Utilize the `EmptyState` component instead of manual box/typography layouts for empty lists or search results.

## 2025-05-16 - Accessible Form Helper Text with Complex Layouts

**Learning:** When using complex layouts like `Stack` or `Box` within MUI's `FormHelperText` (e.g., for character counters alongside helper text), it is necessary to set `slotProps.formHelperText={{ component: 'div' }}`. This prevents invalid HTML nesting, as `FormHelperText` defaults to a `<p>` tag which cannot contain block-level elements, and avoids React hydration mismatches.

**Action:** Use `component="div"` for `FormHelperText` whenever the `helperText` prop contains non-phrasing content.
