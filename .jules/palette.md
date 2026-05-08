## 2025-05-15 - [Consistent Empty States & Search Accessibility]
**Learning:** Reusing the specialized `EmptyState` component across different pages (like Professors) provides a more cohesive visual language than ad-hoc typography. Additionally, icon-only buttons in search fields must always have explicit `aria-label` attributes to ensure screen reader compatibility, even if their function seems obvious visually.
**Action:** Always check if a search field has a "clear" button and if that button has an `aria-label`. Prefer `EmptyState` for all "no results" scenarios.
