## 2024-05-22 - Icon-only buttons accessibility
**Learning:** Icon-only buttons (like Settings and Logout) are common but often lack `aria-label`, making them inaccessible to screen reader users. The `Button` component from shadcn/ui supports `aria-label` via spread props, which is a convenient pattern to leverage.
**Action:** Always check `size="icon"` buttons for `aria-label` during reviews.

## 2026-02-04 - Hidden Icon-Only Buttons Accessibility
**Learning:** Many icon-only buttons (like delete or navigation) are styled with `opacity-0 group-hover:opacity-100` to reduce clutter. However, this makes them invisible to keyboard users even when focused.
**Action:** Always add `focus:opacity-100` to the button and `focus-within:opacity-100` to the parent container (if it's also hidden) to ensure visibility on focus. Also, ensure `aria-label` is present.
