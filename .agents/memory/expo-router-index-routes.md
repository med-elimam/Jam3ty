---
name: Expo Router index routes
description: Navigation to index.tsx files uses the folder name, not folder/index
---

**Why:** Expo Router maps `app/notifications/index.tsx` to the route `/notifications`, not `/notifications/index`. Using `/notifications/index` may work at runtime but breaks TypeScript typed routes and is unconventional.

**How to apply:**
- `router.push('/notifications')` — correct for `app/notifications/index.tsx`
- `router.push('/notifications/index')` — avoid; cast `as any` if used
- Stack.Screen `name="notifications"` — correct (not `name="notifications/index"`)
- For typed routes, use `as any` cast when the type system doesn't recognise the path
