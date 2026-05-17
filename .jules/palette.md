## 2025-05-14 - Consistency in Search UX
**Learning:** Standardizing search components with 'Clear' buttons and descriptive 'EmptyState' components significantly improves UI consistency and provides better feedback to users when no results are found.
**Action:** When implementing search functionality, always include a 'Clear' IconButton with an 'aria-label' in 'slotProps.input.endAdornment' (for MUI TextField) and use the reusable 'EmptyState' component for 'no results' states.
