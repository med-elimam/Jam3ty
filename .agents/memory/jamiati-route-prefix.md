---
name: Jamiati route double-prefix pattern
description: Four API routers were mounted with a prefix in routes/index.ts AND duplicated that prefix in their own handler paths, causing 404s.
---

## The rule

When a router is mounted with a prefix in `routes/index.ts` (e.g. `router.use("/community", communityRouter)`), its handler paths must be **relative** — strip the prefix from the handler path.

| Mounted at | Handler must use | NOT |
|---|---|---|
| `/community` | `/posts` | `/community/posts` |
| `/dashboard` | `/home` | `/dashboard/home` |
| `/subscriptions` | `/me`, `/plans`, `/redeem` | `/subscriptions/me`, etc. |
| `/ai` | `/chat`, `/usage` | `/ai/chat`, `/ai/usage` |

Routers mounted **without** a prefix (e.g. `router.use(filesRouter)`) must include the full path in their handler (`/files`).

**Why:** Express concatenates mount path + handler path. If both include the same segment, you get `/community/community/posts` which is never matched.

**How to apply:** Before adding a new route file, grep for `router.use("/X",` in `routes/index.ts` — if that pattern exists, the handler inside must start with `/` (not `/X/`).
