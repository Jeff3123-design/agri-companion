## 2024-05-22 - Icon-only buttons accessibility
**Learning:** Icon-only buttons (like Settings and Logout) are common but often lack `aria-label`, making them inaccessible to screen reader users. The `Button` component from shadcn/ui supports `aria-label` via spread props, which is a convenient pattern to leverage.
**Action:** Always check `size="icon"` buttons for `aria-label` during reviews.
