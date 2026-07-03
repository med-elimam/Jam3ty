---
name: Jamiati Phase 3A seed dedup & reset safety
description: Why the seed uses non-cascading plan canonicalization but truncate-cascade for content, and how dedup works
---

# Seed dedup / reset strategy

The seed (`scripts/src/seed.ts`) is a **dev/demo fixture**, not a migration. Earlier runs (before find-or-create guards existed) left duplicate rows AND stale English/"Talib MR" demo content. The `tableIsEmpty` guard was actively harmful: it skipped re-seeding non-empty tables, so old English data persisted and the Arabic content never loaded.

## Rules

- **Content tables** (events, opportunities, announcements, files, posts, timetable_sessions, assignments, exams, clubs): reset via `TRUNCATE ... RESTART IDENTITY CASCADE` then insert. CASCADE intentionally clears demo interaction rows (favorites/reactions/reads/submissions/registrations). Refused when `NODE_ENV === "production"`.
- **Plans**: NEVER truncate-cascade — plans are FK-referenced by `subscriptions`, `payments`, `activation_codes`; a cascade would wipe billing history. Use `canonicalizePlans()`: deactivate all → upsert the 4 canonical plans by stable `name` → delete only leftover plan rows that have zero dependent references.
- **Universities**: dedup by `name_ar`, keep oldest, repoint EVERY table with a `university_id` column (discovered via `information_schema.columns`) to the kept row, then delete dupes. Wrapped in a transaction so repoint+delete is atomic.

**Why:** a code reviewer flagged the original `resetTable("plans")` as a destructive blast radius. The distinction is: content = disposable demo data (cascade OK in dev); plans = referenced financial entities (must preserve, canonicalize instead).

**How to apply:** when adding a new seeded table, if it is referenced by user/financial data use the canonicalize pattern; if it is pure demo content, use `resetTable`. Any new destructive path must honor the `IS_PRODUCTION` guard.

## Canonical plans (Phase 3A)
Free (0 / 36500d), جامعتي بلس شهري (100 MRU / 30d), سداسي (400 / 120d), سنوي (800 / 365d). Currency label shown in UI is أوقية. Note: `plans` table has no `isFeatured`/`descriptionAr` columns, so the subscription screen's references to them are always undefined (harmless).
