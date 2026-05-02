## 2025-05-14 - [A11y for Icon Buttons]
**Learning:** In this application, many interactive elements are represented solely by icons (e.g., theme toggles, expanders). These are inaccessible to screen readers and difficult for new users to discover without visual labels.
**Action:** Always wrap `IconButton` components with a descriptive `Tooltip` and provide a corresponding `aria-label` to ensure both discoverability and screen reader compatibility.
