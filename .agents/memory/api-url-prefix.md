---
name: API URL double-prefix bug
description: EXPO_PUBLIC_API_BASE_URL must be root domain only; orval-generated client already includes /api in every path
---

**Why:** The orval-generated API client (lib/api-client-react) uses paths like `/api/auth/login`. The custom-fetch.ts prepends `_baseUrl` to these relative paths. If EXPO_PUBLIC_API_BASE_URL includes `/api`, all requests become `/api/api/...`.

**How to apply:**
- `EXPO_PUBLIC_API_BASE_URL` = `https://<replit-dev-domain>` (NO trailing /api)
- In AuthContext manual fetches, always include `/api/` in the path: `${API_BASE_URL}/api/auth/me`
- This is set as a shared environment variable in Replit

**Also:** AuthContext uses `Buffer.from(base64, 'base64').toString('utf8')` for JWT decode — NOT `atob()`, which is unreliable in React Native.

**Metro cache gotcha:** `EXPO_PUBLIC_*` vars are inlined at bundle time and Metro caches them. After changing the value, a plain workflow restart is NOT enough — clear caches (`rm -rf artifacts/mobile/.expo node_modules/.cache /tmp/metro-* /tmp/haste-map-*`) then restart the expo workflow, and reload the app on the device.

**Symptom of wrong value:** "Registration failed" / generic errors in the app while `curl https://<dev-domain>/api/auth/register` returns 201 means the client base URL is wrong (points elsewhere or has doubled `/api`), not an API bug.
