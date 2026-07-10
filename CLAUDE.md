# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this product is

**Jam3ty / Jamiati (جامعتي)** — a university platform for Mauritania (MRU currency, Bankily/Masrvi/Sedad/cash-agent payments, default city Nouakchott).

- **Admin Web** (`admin-web/`) is the content-management side: super-admins create universities → faculties → departments → levels → groups, courses, files, announcements, timetables, assignments, exams, events, clubs, opportunities, subscription plans, activation codes, agents, and review payment proofs.
- **Mobile** (`artifacts/mobile/`) is the student-facing product: an Expo app (native Android/iOS **and** exported to web, where it is served as the "student web app"). Students consume everything Admin creates, plus community posts, AI chat, and subscriptions.
- **API server** (`artifacts/api-server/`) is the only backend; Postgres via Drizzle is the only datastore. Admin and Mobile are thin clients over the same `/api` surface.
- Users/roles: `userRoleEnum` has 10 values but **only `super_admin` is enforced** (guards `routes/admin.ts`); everyone else is effectively `student`. Languages: Arabic (RTL, default) and French; the DB enum also has `en` but no UI ships English.

## Commands

Package manager is **pnpm** (enforced — a `preinstall` script blocks non-pnpm installs). Run from the repo root unless noted.

```bash
pnpm install                       # install all workspace packages

# Typecheck (no test suite exists in this repo — there is no test command)
pnpm run typecheck                 # typecheck:libs + every artifacts/* and scripts package (EXCLUDES artifacts/mobile)
pnpm run typecheck:libs            # tsc --build for lib/db, lib/api-client-react, lib/api-zod only
pnpm --dir <package> exec tsc --noEmit    # typecheck one package directly (see Windows gotcha below)
pnpm --dir artifacts/mobile exec tsc -p tsconfig.json --noEmit   # typecheck mobile (not covered by root script)

# Dev servers (separate terminals; admin-web dev port 3000 conflicts with api-server default)
cd artifacts/api-server && pnpm run dev   # builds once, then starts on $PORT (needs .env)
cd artifacts/mobile && pnpm run dev       # expo start (native + web dev)
cd admin-web && pnpm run dev              # vite, hardcoded port 3000

# Build
pnpm run build                     # typecheck + build every package (excludes artifacts/mobile)
pnpm run build:student-web         # cd artifacts/mobile && npx expo export -p web  → artifacts/mobile/dist
pnpm run build:admin-web           # admin-web vite build → admin-web/dist/public
pnpm run build:all                 # build:api + build:web (mobile web + admin) + copy:builds
pnpm run copy:builds               # copy artifacts/mobile/dist → api-server/public/student
                                   #  and admin-web/dist/public → api-server/public/admin

# Production run (after build:all)
pnpm run start:prod                # cd artifacts/api-server && NODE_ENV=production node dist/index.mjs

# Database (drizzle-kit push, no migration files — schema is source of truth)
pnpm run db:migrate                # push schema in lib/db to DATABASE_URL
pnpm run db:seed / db:seed:dev     # seed scripts

# Regenerate the API client from the OpenAPI spec (after editing openapi.yaml)
cd lib/api-spec && pnpm run codegen   # orval --config ./orval.config.ts && pnpm -w run typecheck:libs
```

Linting: no package in the workspace has a lint script — don't assume one exists. (The legacy `student-web/` package, which had oxlint, was permanently removed; the root script name `build:student-web` survives only as the name for the mobile web export.)

## Architecture

pnpm workspace monorepo (`pnpm-workspace.yaml`), three deployable surfaces + generated shared libraries.

```
artifacts/mobile/      Expo (~54) + expo-router (~6) student app — THE student-facing product.
                       Exported to web (`expo export -p web`) and served at `/` in production.
                       Has its own CLAUDE.md — read it before touching mobile code.
admin-web/             React+Vite+TS admin dashboard SPA (wouter, shadcn/ui, Tailwind 4, React Query)
artifacts/api-server/  Express API — the only backend; serves /api/* AND (in production) the built
                       student (mobile-web) and admin SPAs as static files
lib/db/                Drizzle ORM schema + Postgres client (@workspace/db) — single source of truth for the data model
lib/api-spec/          openapi.yaml (hand-maintained, single file) + orval.config.ts — generates the two packages below
lib/api-client-react/  Generated (orval) React Query hooks + fetch client, consumed by admin-web AND artifacts/mobile
lib/api-zod/           Generated (orval) zod validators, consumed by api-server
scripts/               One-off/DB seed scripts (tsx), @workspace/db consumer
```

**Request flow**: admin-web / mobile call generated hooks from `@workspace/api-client-react` (e.g. `useGetDashboardHome`, `useListCourses`) → `custom-fetch.ts`'s `customFetch` (module-level `_baseUrl`/`_authTokenGetter`, set in admin-web's `main.tsx` and in mobile's `contexts/AuthContext.tsx`) → api-server routes (`src/routes/*.ts`, all mounted under `/api` in `src/app.ts`) → `@workspace/db` (Drizzle) → Postgres.

**Auth**: JWT access + refresh tokens (`/api/auth/*`). Mobile stores them in SecureStore (native) / localStorage (web) and refreshes on expiry inside the token getter. Admin has its own login page/context (`AdminAuthContext`). `requireAuth` sets `req.userId`/`req.userRole`; `requireRole("super_admin")` guards the whole `/api/admin` router.

**Database — main entities** (`lib/db/src/schema/*.ts`): users + profiles (academic placement: university/faculty/department/level/group, privacy, language, onboardingComplete) · academic hierarchy · courses · files (type: lecture/td/tp/summary/exam/correction/book/other; approvalStatus pending/approved/rejected) · announcements (priority normal/important/urgent; scope global→course) · timetable_sessions (dayOfWeek 0=Sunday, lecture/td/tp) · assignments + submissions (pending/submitted/late/reviewed) · exams (midterm/final/makeup/test/other) · posts/comments/reactions/reports (moderationStatus pending/visible/hidden/removed) · events + registrations · clubs + members + join_requests · opportunities (8 types; `organization`, `link`, `deadline` is **text**) · plans/subscriptions/payments/activation_codes/agents/commissions · notifications + push_tokens + ai_usage_logs.

**API route conventions** (every route file in `artifacts/api-server/src/routes/`):
- Response shape is always `{ success: true, data }` or `{ success: false, error: { code, message } }` (list endpoints may add `pagination`).
- **Double-prefix trap**: routers mounted with a prefix in `routes/index.ts` (e.g. `router.use("/community", communityRouter)`) must use *relative* handler paths (`/posts`, not `/community/posts`) — duplicating the segment 404s silently. Routers mounted with no prefix must spell out the full path.
- Don't guess DB column names — check `lib/db/src/schema/*.ts` first. Known traps: `universitiesTable` has no `country`/`isVerified` (only `name/nameAr/nameFr/city/status`), `plansTable` has no `description`/`isFeatured`, `opportunitiesTable` has `organization`/`link` (NOT `company`/`applyUrl`), `examsTable` has `room` (NOT `location`) and no `maxScore`, `eventsTable` has no `requiresRegistration`, `announcementsTable.priority` is `normal/important/urgent` (not high/medium/low), and no content table has `titleAr`/`contentAr` variants (bilingual columns exist only as `nameAr`/`nameFr` on universities/faculties/departments/courses/plans).

**Changing the API surface** — always in this order:
1. Add/edit the route in `artifacts/api-server/src/routes/*.ts`.
2. Add the matching path/schema to `lib/api-spec/openapi.yaml` (one big file, `operationId` in camelCase — orval turns it into the `use<PascalOperationId>` hook name).
3. Run `pnpm run codegen` from `lib/api-spec` to regenerate `lib/api-client-react` and `lib/api-zod`, then use the new hook from the frontend.
4. **Zod codegen gotcha**: the workspace catalog pins `zod: ^3.25.76`, but orval's zod generator emits Zod-4-only syntax when it can't parse `"catalog:"` versions — `lib/api-spec/orval.config.ts` pins `output.override.zod.version: 3`; don't remove that override without upgrading zod everywhere.

**Frontend API base URL**: the generated client's paths already include `/api/...`, so the base URL must be the **root domain only, never `/api`** (`/api/api/...` 404s otherwise). Admin-web uses `VITE_API_BASE_URL`; mobile uses `EXPO_PUBLIC_API_BASE_URL` (read in `contexts/AuthContext.tsx` and in the auth screens). In production both are served same-origin as the API, so empty string (relative fetches) is correct; local dev needs an explicit `http://localhost:<api-port>` (no dev proxy is configured anywhere).

**Static file serving in production** (`artifacts/api-server/src/app.ts`, only when `NODE_ENV=production`): serves `public/admin` at `/admin` and `public/student` (the **mobile web export**) at `/`, each with an SPA-fallback regex registered *after* `express.static`; student's catch-all `/^(?!\/api).*/` is intentionally broad — a bad `/admin/...` path silently falls through to the student app. `public/student` and `public/admin` are **committed to git** (Railway only runs `pnpm run build`, never `copy:builds`). After any admin-web or mobile change destined for production you must locally run `build:web` + `copy:builds` and commit the resulting `artifacts/api-server/public/**` changes.
- `admin-web` builds to `dist/public/` (its `server/index.ts` is a second standalone static server) — `copy:builds` must source `admin-web/dist/public/*` or you get nested `public/admin/public/...`.
- `admin-web/vite.config.ts` sets `base: "/admin/"`; the mobile web export serves from `/`.

## Rules for safe changes

- **Read before editing; reuse the existing architecture.** No new UI libraries, no dependency upgrades, no rewrites without explicit request.
- **Never change an API response shape without checking both consumers** (admin-web pages AND mobile screens) plus `openapi.yaml` + codegen.
- **Do not edit generated code** (`lib/api-client-react/src/generated*`, `lib/api-zod` output) — regenerate via orval.
- **DB schema changes** go through `lib/db/src/schema/*.ts` + `db:migrate` (drizzle push; there are no migration files to edit).
- **Don't touch without clear reason**: `pnpm-workspace.yaml` security settings (`minimumReleaseAge`), `orval.config.ts` zod pin, `artifacts/api-server/public/**` (build artifacts — regenerate, don't hand-edit).
- Never print or commit secrets (`.env`, `DATABASE_URL`, `JWT_SECRET`).

## Windows/Claude Code gotcha

In this environment, `pnpm run <script>` (and `pnpm --filter <pkg> run <script>`) can silently no-op — printing only a `cmd.exe` banner with **exit code 0** and doing nothing. This has produced false "all clean" typecheck/build results. Prefer direct invocation: `pnpm --dir <pkg> exec tsc --noEmit`, `npx vite build`, `npx expo export -p web`, `npx orval --config ./orval.config.ts` — and verify actual output (files on disk, non-empty logs) rather than trusting a bare `pnpm run` exit code.

## Current status & known problems (updated after mobile Phase 1, 2026-07)

- Admin Web has been through a review/improvement pass (recent `fix admin ...` commits); it covers all 18 modules and is the content-model reference.
- Mobile **Phase 1 (critical fixes) is done**: files open via `lib/urls.ts`, phantom fields removed (opportunities `organization`/`link`, events `isRegistered`, exams `type`/`room`, plans `features[]`), `course/[id]` translated + RTL-aware, guests gated (`components/GuestGate.tsx`), error states with retry on list screens, notifications newest-first with type-based navigation.
- Backend academic scoping is now enforced server-side: `/dashboard/home`, `/assignments`, `/exams`, `/timetable`, `/files` limit course-bound content to courses matching the student profile's `departmentId`+`levelId` (the `GET /courses` rule); `/events` and `/clubs` limit university-bound rows to the student's university; announcements follow their scope column including course scope. No academic placement → no course-bound content. Explicit `courseId` query params are honored as-is.
- Still pending (Phase 2+): detail screens, assignment submission, payment-proof upload (needs a student upload endpoint), preference/profile sync, community comments/reports, app-wide RTL, remaining `as any` in onboarding/profile/more. See `artifacts/mobile/CLAUDE.md` → "Current limitations".
- Known contract bug: `GetProfile200` in `openapi.yaml` documents `data: Profile`, but `routes/profile.ts` actually returns the safe user object with a nested enriched profile — fix the spec + regenerate before typing the profile screen.
- `PRODUCT.md` (product/brand context) exists at the repo root; design work should follow it.
