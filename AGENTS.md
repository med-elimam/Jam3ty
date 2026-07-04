# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (enforced — a `preinstall` script blocks non-pnpm installs). Run from the repo root unless noted.

```bash
pnpm install                       # install all workspace packages

# Typecheck (no test suite exists in this repo — there is no test command)
pnpm run typecheck                 # typecheck:libs + every artifacts/* and scripts package
pnpm run typecheck:libs            # tsc --build for lib/db, lib/api-client-react, lib/api-zod only
pnpm --dir <package> exec tsc --noEmit    # typecheck one package directly (see gotcha below)

# Dev servers (separate terminals; see "Local ports" gotcha below)
cd artifacts/api-server && pnpm run dev   # builds once, then starts on $PORT (needs .env, see below)
cd student-web && pnpm run dev            # vite, default port 5173
cd admin-web && pnpm run dev              # vite, hardcoded port 3000 (conflicts with api-server)

# Build
pnpm run build                     # typecheck + build every package (excludes artifacts/mobile)
pnpm run build:all                 # build:api + build:web (student+admin) + copy:builds
pnpm run copy:builds               # copy student-web/dist and admin-web/dist/public into artifacts/api-server/public/{student,admin}

# Production run (after build:all)
pnpm run start:prod                # cd artifacts/api-server && NODE_ENV=production node dist/index.mjs

# Database (drizzle-kit push, no migration files — schema is source of truth)
pnpm run db:migrate                # push schema in lib/db to DATABASE_URL
pnpm run db:migrate:force          # force push (destructive, dev only)
pnpm run db:seed / db:seed:dev     # tsx scripts/src/seed.ts

# Regenerate the API client from the OpenAPI spec (after editing openapi.yaml)
cd lib/api-spec && pnpm run codegen   # orval --config ./orval.config.ts && pnpm -w run typecheck:libs
```

Linting: only `student-web` has a lint script (`pnpm --dir student-web run lint`, uses `oxlint`). `admin-web` and the rest of the workspace have no lint script — don't assume one exists.

## Architecture

This is a pnpm workspace monorepo (`pnpm-workspace.yaml`) with three deployable apps and a set of shared, code-generated libraries.

```
student-web/          React+Vite+TS student-facing SPA
admin-web/             React+Vite+TS admin dashboard SPA
artifacts/api-server/  Express API — the only backend; serves /api/* AND (in production) the built student/admin SPAs as static files
artifacts/mobile/      Expo/React Native app — excluded from the root build/typecheck filters, built and typechecked independently
lib/db/                Drizzle ORM schema + Postgres client (@workspace/db) — single source of truth for the data model
lib/api-spec/          openapi.yaml (hand-maintained, single file) + orval.config.ts — the source that generates the two packages below
lib/api-client-react/  Generated (orval) React Query hooks + fetch client, consumed by student-web and admin-web
lib/api-zod/           Generated (orval) zod validators, consumed by api-server
scripts/               One-off/DB seed scripts (tsx), @workspace/db consumer
```

**Request flow**: `student-web`/`admin-web` call generated hooks from `@workspace/api-client-react` (e.g. `useGetMe`, `useListUniversities`) → `custom-fetch.ts`'s `customFetch` (module-level `_baseUrl`/`_authTokenGetter` set once in each app's `main.tsx`) → `artifacts/api-server` routes (`src/routes/*.ts`, all mounted under `/api` in `src/app.ts`) → `@workspace/db` (Drizzle) → Postgres.

**API route conventions** (every route file in `artifacts/api-server/src/routes/`):
- Response shape is always `{ success: true, data }` or `{ success: false, error: { code, message } }`.
- `requireAuth` middleware (in `middlewares/auth.ts`) sets `req.userId`/`req.userRole` from the JWT; `requireRole(...roles)` gates by `req.userRole`.
- **Double-prefix trap**: routers mounted with a prefix in `routes/index.ts` (e.g. `router.use("/community", communityRouter)`) must use *relative* handler paths (`/posts`, not `/community/posts`) — Express concatenates mount path + handler path, so duplicating the segment 404s silently. Routers mounted with no prefix (`router.use(filesRouter)`) must spell out the full path in the handler.
- `userRoleEnum` has 10 values (`student, professor, club_manager, department_admin, faculty_admin, university_admin, moderator, agent, finance_admin, super_admin`), but only `super_admin` is currently wired to any route guard (`artifacts/api-server/src/routes/admin.ts`) — there's no fine-grained permission matrix yet.
- Don't guess DB column names — check `lib/db/src/schema/*.ts` first. Several tables have non-obvious shapes, e.g. `universitiesTable` has no `country`/`isVerified` (only `name/nameAr/city/status`), `plansTable` has no `description`/`isFeatured`, `opportunitiesTable.deadline` is `text` not a timestamp, `announcementsTable.priority` enum is `normal/important/urgent` (not high/medium/low).

**Changing the API surface** — always in this order:
1. Add/edit the route in `artifacts/api-server/src/routes/*.ts`.
2. Add the matching path/schema to `lib/api-spec/openapi.yaml` (one big file, `operationId` in camelCase — orval turns it into the `use<PascalOperationId>` hook name).
3. Run `pnpm run codegen` from `lib/api-spec` to regenerate `lib/api-client-react` and `lib/api-zod`, then use the new hook from the frontend.
4. **Zod codegen gotcha**: `pnpm-workspace.yaml`'s catalog pins `zod: ^3.25.76`, but orval's zod generator defaults to emitting Zod-4-only syntax (e.g. `zod.email()`) whenever it can't parse a `"catalog:"` version string — this breaks `api-server`'s typecheck (it depends on `@workspace/api-zod`). `lib/api-spec/orval.config.ts` pins `output.override.zod.version: 3` to force v3-compatible output; don't remove that override without upgrading the zod catalog version everywhere.

**Frontend API base URL** (`main.tsx` in both `student-web` and `admin-web`): the generated client's paths already include `/api/...`, so `VITE_API_BASE_URL` must be the **root domain only, never `/api`** — setting it with a trailing `/api` produces `/api/api/...` 404s. In production, student-web and admin-web are served from the *same origin* as the API (see below), so the correct production value is an **empty string** (falls back to relative fetches that resolve against the current page's origin) — set via a `.env.production` override, since Vite's `.env` files for a specific mode take priority over the base `.env`. Local dev still needs an explicit `http://localhost:<api-port>` in the base `.env` because there is no dev-server proxy configured in either `vite.config.ts`.

**Static file serving in production** (`artifacts/api-server/src/app.ts`, only active when `NODE_ENV=production`): serves `public/admin` at `/admin` and `public/student` at `/`, each with its own SPA-fallback regex route registered *after* `express.static`, and student's catch-all (`/^(?!\/api).*/`) is intentionally broad — any path under `/admin` that doesn't resolve to a real file inside `public/admin` will silently fall through and get served the *student* app's `index.html` instead of a 404. `public/student` and `public/admin` are **committed to git** (Railway does not run `copy:builds` during its build — it only runs `pnpm run build`, which typechecks and builds each package but never copies output into `artifacts/api-server/public`). This means: after any admin-web/student-web change destined for production, you must locally run `build:web` + `copy:builds` and commit the resulting `artifacts/api-server/public/**` changes yourself.
- `admin-web`'s own Vite build outputs to `dist/public/` (not flat `dist/`, because `admin-web/server/index.ts` is a second, standalone Express static server for admin-web's own independent deploy path) — `copy:builds` must source from `admin-web/dist/public/*`, not `admin-web/dist/*`, or you get a doubly-nested `public/admin/public/...` and stale/mismatched assets.
- `admin-web/vite.config.ts` sets `base: "/admin/"` (required so built asset URLs are `/admin/assets/...`); `student-web/vite.config.ts` has no `base` (serves from `/`).

**Windows/Codex gotcha**: in this environment, `pnpm run <script>` (and `pnpm --filter <pkg> run <script>`) invocations can silently no-op — printing only a `cmd.exe`/Windows banner with **exit code 0** and doing nothing. This has produced false "all clean" typecheck/build results. Prefer direct invocation to get real output/exit codes: `pnpm --dir <pkg> exec tsc --noEmit`, `npx vite build`, `npx orval --config ./orval.config.ts`, or running the underlying `node`/binary directly — don't trust a bare `pnpm run` exit code without also checking for actual expected output (files on disk, non-empty logs).
