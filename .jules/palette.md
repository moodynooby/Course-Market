## 2025-05-15 - Standardizing Search and Empty States

**Learning:** Consistent search behavior and empty states significantly reduce user friction. In this application, TextField search inputs should include a 'Clear' button with a Tooltip and aria-label when text is present. Additionally, using a dedicated `EmptyState` component for both "no results" and "no data" scenarios ensures a unified visual language and provides clear calls to action (e.g., Sync Data).

**Action:** Always include a 'Clear' IconButton in `slotProps.input.endAdornment` for search TextFields. Utilize the `EmptyState` component instead of manual box/typography layouts for empty lists or search results.

## 2025-06-04 - Form Feedback and HelperText Nesting

**Learning:** Providing real-time character counts for limited inputs (like Course Codes or Descriptions) improves user confidence and prevents validation errors. However, Material UI's `FormHelperText` defaults to a `<p>` tag, which cannot validly contain block-level elements like a `Stack` or `div`. Using a `Stack` for layout in `helperText` requires setting `component="div"` on the `FormHelperText` to maintain HTML validity and prevent hydration mismatches.

**Action:** Use `slotProps.formHelperText={{ component: 'div' }}` when using complex layouts (like `Stack` for character counters) in `TextField` helper texts.
