# Jam3ty / Jamiati (جامعتي)

A university platform for Mauritania: students get their courses, files, timetable, assignments, exams, announcements, events, clubs, opportunities, community and AI assistant in one Arabic-first app; administrators manage all of that content plus subscriptions, payments (Bankily / Masrvi / Sedad / cash agents, MRU) and sales agents from a web dashboard.

## Repository layout

```
artifacts/mobile/      Student app — Expo (React Native). THE student-facing product:
                       runs natively on Android/iOS AND is exported to web
                       (`expo export -p web`) and served at `/` in production.
admin-web/             Admin dashboard — React + Vite + shadcn/ui + Tailwind 4 (wouter, React Query).
                       Served at `/admin` in production.
artifacts/api-server/  Express API — the only backend. Serves /api/* and, in production,
                       the two built SPAs as static files.
lib/db/                Drizzle ORM schema + Postgres client (single source of truth for the data model).
lib/api-spec/          Hand-maintained openapi.yaml + orval config (generates the two packages below).
lib/api-client-react/  Generated React Query hooks + fetch client (used by admin-web AND mobile).
lib/api-zod/           Generated zod validators (used by api-server).
scripts/               DB seed scripts.
```

The legacy `student-web/` Vite SPA was removed — the Expo web export replaced it (the root script name `build:student-web` now builds the mobile web export).

## Requirements

- Node.js 22+, **pnpm** 9+ (enforced — npm/yarn installs are blocked)
- PostgreSQL

## Setup & development

```bash
pnpm install

# API server (terminal 1) — needs artifacts/api-server/.env (see Environment)
cd artifacts/api-server && pnpm run dev        # listens on $PORT

# Student app (terminal 2)
cd artifacts/mobile && pnpm run dev            # expo start (native + web)

# Admin dashboard (terminal 3)
cd admin-web && pnpm run dev                   # vite on port 3000
```

Database:

```bash
pnpm run db:migrate     # drizzle-kit push of lib/db schema to DATABASE_URL (no migration files)
pnpm run db:seed:dev    # demo data — creates admin@jamiati.mr / Admin@1234 and student@jamiati.mr / Student@1234
```

Typecheck (there is no test suite and no lint script):

```bash
pnpm run typecheck                                            # everything except artifacts/mobile
pnpm --dir artifacts/mobile exec tsc -p tsconfig.json --noEmit  # mobile
```

## Environment

**API server** (`artifacts/api-server/.env`): `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, optional `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.

**Frontends** — the generated API client already prefixes paths with `/api`, so the base URL must be the **root origin only, never ending in `/api`**:

- Mobile: `EXPO_PUBLIC_API_BASE_URL` — `http://localhost:<api-port>` in dev, **empty** in production (same-origin).
- Admin: `VITE_API_BASE_URL` — same rule.

## Build & deployment

```bash
pnpm run build:all      # build API + mobile web export + admin build + copy:builds
pnpm run start:prod     # NODE_ENV=production node artifacts/api-server/dist/index.mjs
```

Production serves everything from the API server: student app at `/`, admin at `/admin`, API at `/api/*`.

Deployment (Railway): the build command is `pnpm run build:all`, which rebuilds the API, the mobile web export and the admin build and copies them into `artifacts/api-server/public/{student,admin}` — so **pushing source changes is enough**; the `public/` folders are produced at build time. See `RAILWAY_DEPLOYMENT.md`.

## Changing the API

Always in this order: edit the route in `artifacts/api-server/src/routes/` → mirror it in `lib/api-spec/openapi.yaml` → `cd lib/api-spec && pnpm run codegen` → use the regenerated hook. Never edit generated code in `lib/api-client-react` / `lib/api-zod` by hand.

## Languages & access model

- **Arabic (RTL, default) and French.** Preference is stored per device and (for language) in the user profile.
- Students self-register; academic placement (university → faculty → department → level → group) is chosen in onboarding and drives server-side content scoping.
- **Guest mode**: without an account, visitors can browse global announcements, public events and subscription plans; everything academic (courses, files, timetable, assignments, exams, community, profile) requires login.
- Only `super_admin` can access `/api/admin/*` and the admin dashboard.

## More documentation

- `CLAUDE.md` — architecture, conventions, gotchas (read before contributing)
- `artifacts/mobile/CLAUDE.md` — mobile app structure, RTL rules, current limitations
- `PRODUCT.md` — product/brand context · `docs/MOBILE_IMPROVEMENT_PLAN.md` — roadmap
- `DEPLOYMENT.md` / `RAILWAY_DEPLOYMENT.md` — deployment guides
