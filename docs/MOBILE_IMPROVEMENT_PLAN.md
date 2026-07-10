# Jamiati Mobile — Improvement Proposal

Analysis date: 2026-07-10. Every claim below is grounded in a file path. Legend: **[V]** verified in code · **[L]** likely (inferred, not executed) · **[R]** recommendation.

The mobile app (`artifacts/mobile/`) is now the student-facing product on **both** native and web (commit `f5f9bd0` replaced student-web with the Expo web export; root `package.json` `build:student-web` runs `expo export -p web` and `copy:builds` ships `artifacts/mobile/dist` to `api-server/public/student`). Fixing mobile fixes the deployed student web app too.

---

## A. Critical issues (break function, data consistency, or core flows)

| # | Issue | Evidence | Fix direction |
|---|-------|----------|---------------|
| A1 | **Files cannot be opened/downloaded** — the core "get my lecture PDF" job dies at the list. | `app/files/index.tsx` renders title/favorite only; `fileUrl` never used. Backend returns it (`routes/files.ts`). | Tap-to-open via `expo-web-browser` / `Linking`, plus share; count view/download. [V] |
| A2 | **Opportunities Apply button never renders** — field mismatch. | Screen reads `item.applyUrl`/`item.company` (`app/opportunities/index.tsx:76,93`); API returns `link`/`organization` (`lib/db/src/schema/events.ts:67-81`). | Read `link`/`organization`. [V] |
| A3 | **Event registration button never renders.** | Condition `item.requiresRegistration && !item.isRegistered` (`app/events/index.tsx:73`); `requiresRegistration` doesn't exist anywhere in schema/API. | Drop the phantom flag (or add it to schema+admin). [V] |
| A4 | **Course → "View all files" drops the course filter.** | `app/course/[id].tsx:69` pushes `params: { courseId }`; `app/files/index.tsx` never calls `useLocalSearchParams`. | Read the param, seed the filter, show a course chip. [V] |
| A5 | **Home/assignments/exams show every student global content** (data-consistency: admin creates per-department content; students in other departments see it). | `routes/dashboard.ts` (no profile filter on sessions/assignments/exams/files); `routes/assignments.ts:19` comment admits intent; `routes/exams.ts`. | Backend fix: join through `coursesTable.departmentId/levelId` against the profile (same pattern as `routes/courses.ts:27-28`). Identify consequences for admin (admin uses `/api/admin/*`, unaffected). [V] |
| A6 | **Payment proof flow incomplete** — admin review is proof-centric but mobile never uploads proof. | `app/subscription/index.tsx:163` sends only `planId/amount/method/phone`; backend accepts `proofUrl` (`routes/subscriptions.ts:100`); Admin reviews `proofUrl` (`AdminPayments.tsx`); `expo-image-picker` already installed. | Add screenshot pick + upload (needs a student-accessible upload endpoint — currently only `/api/admin/uploads` exists). [V] |
| A7 | **Guest mode silently breaks the whole app** — token `'guest'` 401s every call; user sees empty states with no explanation. | `contexts/AuthContext.tsx:254-257`; `(auth)/login.tsx:132`. | Either real read-only guest support (backend) or clearly-labeled locked states + sign-in CTA. [V] |
| A8 | **Notifications list is oldest-first** and has no per-item mark-read or deep-link. | `routes/notifications.ts:15` `orderBy(createdAt)` ascending; no `POST /notifications/:id/read`; `app/notifications/index.tsx` items aren't pressable. | `DESC` order (backend, 1 line); add per-item read + `data`-based navigation. [V] |
| A9 | **`course/[id].tsx` is untranslated hardcoded English** in an Arabic-first product, and ignores RTL. | `app/course/[id].tsx:8,25,34,35,59,70,...`. | Move all strings to `i18n/translations.ts` (ar+fr), apply isRTL patterns. [V] |
| A10 | **Phantom bilingual fields across screens** — `titleAr`/`contentAr`/`descriptionAr` don't exist on any content table, so the fallbacks are dead code implying a wrong content model; plan cards read `description`/`isFeatured` which don't exist on `plansTable` (features array is ignored). | `(tabs)/index.tsx:198,220`, `subscription/index.tsx:106,110`, `exams/`, `announcements/`, etc. vs `lib/db/src/schema/*`. | Strip phantom reads; render `plan.features[]`; if bilingual content is wanted, that's a schema+admin feature, not a frontend fallback. [V] |

## B. High-priority UX improvements

1. **No detail screens anywhere** — announcement/assignment/exam/event/club/notification taps either do nothing or jump to a generic list ([V] `app/_layout.tsx` route table; Home cards `router.push('/announcements')` etc.). Long announcement content is `numberOfLines={3}`-truncated with no way to read it (`app/announcements/index.tsx:66-71`). Add detail routes (`announcements/[id]`, `assignments/[id]`, `events/[id]`, `clubs/[id]`) or expandable cards for simple entities.
2. **No assignment submission** — backend has full `assignment_submissions` lifecycle + grades/comments; mobile shows a status badge only ([V] schema `content.ts:122-132` vs `app/assignments/index.tsx`). Needs detail screen + file upload + grade/feedback display.
3. **Announcement mark-read is invisible** — tapping a card marks it read with zero visual feedback or content reveal (`app/announcements/index.tsx:53`).
4. **Community is read/post/like only** — comment button is a dead `TouchableOpacity` (`app/(tabs)/community.tsx:109-112`); no comments endpoints for students exist (only admin moderation ones); no report action despite `reportsTable`; reaction has no optimistic update (full list invalidation, [L] feels laggy on 3G).
5. **Clubs join state is misleading** — join creates a *pending request* (`routes/clubs.ts:23-38`) but UI only knows `isMember`; after requesting, the button still says "Join" ([V]). Show pending state.
6. **French mode renders Arabic-aligned** — dozens of `textAlign: 'right'`, `justifyContent: 'flex-end'`, hardcoded `chevron-left` ([V] Home, files, exams, announcements, clubs, profile menu; `events/index.tsx:70` even hardcodes `toLocaleDateString('ar')`). Fully direction-aware styling pass.
7. **Loading = centered spinner, error = nothing** — no skeletons; a failed query shows the *empty* state (misleading "no data") because screens never check `isError` ([V] every list screen). Add skeleton rows + error state with retry.
8. **Search is Home-absent and per-screen inconsistent** — courses and files have search; announcements/opportunities/events/clubs don't; backend supports `search` on files/courses only. No global search ([V]).
9. **Settings dead-ends**: change password + delete account are "disabled" alerts (`app/settings/index.tsx:79-92`); no forgot-password screen though `POST /auth/forgot-password` exists; notification/privacy prefs never reach the backend (privacy enum mismatch `'university'` vs `'same_university'`, `contexts/PreferencesContext.tsx:14` vs `schema/users.ts:18-22`).
10. **Profile screen shows no payments history** though `GET /subscriptions/payments` exists and pending payments have no visibility ([V]).

## C. Visual & design-system improvements

- **Iconography**: emoji (📅 📢 🏫 📍 ⏰ 🤖 💎) mixed with Feather icons ([V] Home section titles, exams meta, subscription, AI avatar). Pick Feather everywhere; emoji only as intentional brand moments.
- **Card accent = colored left border** (`components/ui/Card.tsx:35`, calendar session cards) — always on the left even in RTL, and a weak affordance; replace with background tint/leading icon; if kept, make it direction-aware.
- **Typography**: Inter is loaded (`app/_layout.tsx`) but **never applied** — no `fontFamily` anywhere, so Arabic/Latin render in system fonts and the Inter download is dead weight ([V]). Either apply a font stack (and add an Arabic-capable font, e.g. IBM Plex Sans Arabic / Cairo) or drop the load. Add lineHeight to Arabic body text (tokens exist in `constants/theme.ts:45-49` but are mostly unused).
- **Color**: navy+gold palette is committed and consistent — keep it. But dark mode has gaps: `subscription` featured tag text `#fff` on gold ([L] low contrast), `notifBadgeText: '#000'` hardcoded, `mutedForeground #6B7280` on `#F4F6FA` is borderline for small text ([L] verify 4.5:1). Admin uses a different blue (Tailwind blue-700) — acceptable divergence (different surface), but document it in DESIGN.md.
- **Buttons/touch**: `Button` has no pressed/haptic feedback (expo-haptics installed, unused); sm size ~32pt height < 44pt target ([V] `components/ui/Button.tsx:68`).
- **Tab bar**: iOS blur + Android solid is fine; but reversing the tab array for RTL (`(tabs)/_layout.tsx:40`) re-mounts/reorders routes ([L] fragile — index stays 'index' so initial tab is far-right in Arabic, verify intended) and label fontSize 10 is tiny.
- **Headers**: solid navy with white text everywhere is coherent; course header duplicates it as an in-screen hero — fine. `headerBackTitle: ' '` hack ([V]).
- **Empty states**: good component (`ui/EmptyState`), used consistently — preserve; add action buttons in more places (e.g. Files empty → "Browse courses").
- **Skeletons**: none — add a `ui/Skeleton` and per-screen list skeletons.
- **Spacing rhythm**: tokens exist and are mostly used; stray literals in `course/[id].tsx`, `subscription/index.tsx`, `ai/index.tsx` (whole styles hardcoded) — migrate to tokens.
- **Motion**: zero animations; reanimated is installed. Add micro-motion only for state (press feedback, list-item enter on refresh, tab transitions) at 150–250 ms; honor reduced motion.

## D. Architecture & code quality

1. **`(data as any)?.data` + `item: any` in every screen** ([V] all list screens) — the orval hooks return typed responses; create tiny `useData<T>` unwrap or use the generated types directly. Highest-leverage safety fix.
2. **Duplicated helpers**: `timeAgo` in 3 files (`community.tsx`, `announcements/index.tsx`, `notifications/index.tsx`), `daysUntil/daysLeft` in 3 (`(tabs)/index.tsx`, `assignments/`, `exams/`), `formatTime`/`slice(0,5)` scattered — extract `lib/format.ts` (or `utils/date.ts`).
3. **Duplicated auth fetch logic**: login.tsx and register.tsx repeat the same raw-fetch + parse + error dance ([V]) — extract an `authApi.ts`; better, add login/register to openapi.yaml so the generated client covers them.
4. **Filter-chip row implemented 4×** (files, assignments, opportunities, course tabs) — extract `ui/FilterChips`.
5. **Search bar implemented 2×** (courses, files) — extract `ui/SearchBar` with debounce (currently every keystroke refires the query, [V] `courses.tsx:25` — add `useDeferredValue` or debounce).
6. **Two styling idioms**: module-level `StyleSheet` + inline color overrides vs `styles(colors)` factories (`course/[id]`, `subscription`, `ai`) — pick one (factory or theme-aware tokens) for consistency.
7. **Modals for create-post and payment** are inline in screens — fine at this size, but payment modal should become a screen (`subscription/pay.tsx`) when proof upload lands (camera/picker + form state).
8. **react-hook-form + @hookform/resolvers + zod are dependencies but unused** ([V] no imports in app/) — either use them for login/register/payment validation or remove.
9. **Backend N+1 patterns** ([V] `routes/courses.ts:35-42`, `dashboard.ts`, `files.ts` per-row lookups) — [L] slow at scale; move to joins. (Backend change; flag only.)
10. **PreferencesContext value churn** — `value` memo depends on whole `prefs` object; fine, but `t` recreation per language is OK. Minor.
11. **Dead/legacy code**: `student-web/` entire package no longer built ([V] root package.json) — decide: archive or delete; `attached_assets/`, `artifacts/mockup-sandbox` referenced in README but absent; README badly stale (paths `/home/ubuntu/...`, claims React Query in student-web, trilingual support).

## E. Missing product features (all backend/Admin-supported — no invention)

| Feature | Backend support | Admin support |
|---|---|---|
| Open/download/share files (+ per-course file browser) | `files.fileUrl`, `downloadCount` | AdminFiles uploads & approves |
| Assignment detail + submission upload + grade view | `assignment_submissions` (status/grade/comment), `GET /assignments/:id` | AdminAssignments creates, attaches files |
| Exam detail incl. past-exam files & corrections | `filesTable` fileType `exam`/`correction` + `courseId` | Admin uploads exam/devoir files (recent commits) |
| Payment proof upload + payment history + status tracking | `paymentsTable.proofUrl/status`, `GET /subscriptions/payments` | AdminPayments approve/reject with reasons |
| Notification deep-links + push registration | `notificationsTable.data` jsonb, `push_tokens` | n/a |
| Profile editing (bio, skills, links, avatar) | `PUT /profile`, profiles columns | AdminUsers edits users |
| Language/privacy sync to profile | `profiles.language/privacy` | visible in AdminUsers |
| Club detail (members, join-request status) | `club_members`, `club_join_requests` | AdminClubs manages |
| Comments on posts (needs new student endpoints) | `commentsTable` exists; only admin moderation routes today | AdminCommunity moderates comments |
| Report post/file | `reportsTable` (needs student POST endpoint) | AdminCommunity reviews reports |
| Forgot password | `POST /auth/forgot-password` exists | n/a |

## F. Screen-by-screen

Priority: P0 critical / P1 high / P2 polish. Size: S/M/L.

| Screen (file) | Purpose | Problems (verified) | Improvements | Dependency | Prio | Size |
|---|---|---|---|---|---|---|
| Home `(tabs)/index.tsx` | Daily digest | No error state; cards link to lists not items; emoji titles; hardcoded RTL; unscoped data (A5); `as any` | Item-level deep links; skeletons + error; scoped `/home` (backend); direction-aware styles | dashboard.ts scoping | P0 | M |
| Courses `(tabs)/courses.tsx` | Enrolled course list | Search refires each keystroke; chevron hardcoded; empty state doesn't explain scoping (no profile → 50 random courses) | Debounce; direction-aware; "set your department" empty state when profile incomplete | — | P1 | S |
| Course detail `course/[id].tsx` | Course hub | English-only (A9); no RTL; tabs unlabeled i18n; files not openable; "View all files" filter dropped (A4); `creditHours` phantom | Translate; RTL; tappable files; fix param; per-tab "view all" links | files param fix | P0 | M |
| Calendar `(tabs)/calendar.tsx` | Weekly timetable | Week starts Sunday always ([L] verify Mauritania convention); rainbow accent colors by index not by course/type; side-stripe accent | Stable color per course; today jump; session detail (room/prof/group) sheet | — | P2 | M |
| Community `(tabs)/community.tsx` | Feed | Comments dead button; no report; no visibility scope picker; no pagination ([V] `routes/community.ts` has page param, screen never uses it) | Comments (needs endpoints); report; pagination/infinite scroll; optimistic like | new comments/report endpoints | P1 | L |
| Profile `(tabs)/profile.tsx` | Account hub | No edit profile; no payment history; hardcoded RTL menu; duplicate loading spinner | Edit profile screen; payments entry; direction-aware | `PUT /profile` (exists) | P1 | M |
| Files `files/index.tsx` | Resource library | A1 (can't open); A4 (courseId ignored); favorites don't filter; no pagination | Open/share/download; course filter chip; favorites tab; infinite scroll | — | P0 | M |
| Announcements `announcements/index.tsx` | News list | Truncated content, no detail; invisible mark-read; phantom `titleAr` | Detail screen/expander; read feedback; scope/course label chips | — | P1 | S |
| Assignments `assignments/index.tsx` | Deadlines | No detail/submission (E); phantom `maxScore`; filter chips ok | `assignments/[id]` with attachment open + submission upload + grade | upload endpoint for students | P0 | L |
| Exams `exams/index.tsx` | Exam schedule | Phantom `location`/`maxScore`/wrong type map (quiz/practical/oral); no detail; no link to past-exam files | Fix fields (`room`, real enum); exam detail with related `exam`/`correction` files | — | P1 | M |
| Events `events/index.tsx` | Campus events | A3 (register never shows); date locale hardcoded `'ar'`; no detail | Fix register condition; locale-aware dates; detail w/ location & count | — | P0 | S |
| Clubs `clubs/index.tsx` | Club discovery | Pending-request state missing; phantom `category`; 🎓 emoji placeholder ignores `logoUrl` | Show logo (`expo-image`); pending badge; club detail | join-requests status in list response ([R] backend add) | P1 | M |
| Opportunities `opportunities/index.tsx` | Jobs/scholarships | A2 (apply broken, org missing); deadline is free text parsed as Date ([V] schema `deadline: text` → `new Date(...)` may be Invalid) | Fix fields; guard invalid dates; detail screen with full description | — | P0 | S |
| AI `ai/index.tsx` | Study assistant | No history persistence; usage banner fields unverified vs `/ai/usage`; no upsell when limit hit | Persist thread locally; limit-reached state → subscription CTA | — | P2 | M |
| Subscription `subscription/index.tsx` | Plans & activation | A6 (no proof upload); phantom `description`/`isFeatured`; `features[]` unrendered; no payment history/status | Render features; proof upload; "payment pending" tracker; history list | student upload endpoint | P0 | L |
| Notifications `notifications/index.tsx` | Alerts | A8 (order, no per-item read, no deep-link); no push registration | Fix order (backend); tappable items → target screens; expo push token registration | notifications endpoints | P1 | M |
| Login/Register `(auth)/*` | Auth | Raw fetch duplication; no forgot-password; no field-level validation (rhf+zod unused); guest trap (A7) | Shared auth client; forgot-password screen; inline validation; honest guest states | — | P1 | M |
| Onboarding `(auth)/onboarding.tsx` | Academic placement | Solid wizard ([V] cascading resets done right — preserve); no skip/edit later path; university list unsearchable | Search in step lists; allow editing placement later from Profile | — | P2 | S |
| Settings `settings/*` | Prefs | Stubs (change pw, delete); prefs not synced; language change doesn't update `profiles.language` | Wire to `PUT /profile`; real change-password endpoint ([R] backend add); remove or implement delete | backend endpoints | P1 | M |
| More `more/index.tsx` | Module launcher | Fine; per-module colors are the one place the palette opens up — keep | Badge counts (unread announcements, due assignments) via `/home` data | — | P2 | S |

## G. Roadmap

**Phase 1 — Foundations & critical fixes** (files: the A-list)
`app/files/index.tsx` (A1, A4), `app/opportunities/index.tsx` (A2), `app/events/index.tsx` (A3), `app/course/[id].tsx` (A9, A4), `app/subscription/index.tsx` + new upload endpoint (A6, A10), `contexts/AuthContext.tsx` + `(auth)/login.tsx` (A7), backend `routes/dashboard.ts`, `routes/assignments.ts`, `routes/exams.ts` (A5), `routes/notifications.ts` (A8 order); strip phantom fields everywhere; new `lib/format.ts`; type the responses (drop `as any`).

**Phase 2 — Main navigation & Home**
`(tabs)/index.tsx` (skeletons, error states, item deep-links), new `ui/Skeleton.tsx`, `ui/FilterChips.tsx`, `ui/SearchBar.tsx`; direction-aware styling sweep (Home, profile menu, files, exams, announcements, clubs); `(tabs)/_layout.tsx` RTL review; notification deep-links + per-item read (`notifications/index.tsx`, new backend route).

**Phase 3 — Academic content**
New `announcements/[id].tsx` (or expanders), `assignments/[id].tsx` + submission upload, `exams/[id].tsx` linking `exam`/`correction` files, calendar session detail; `routes/assignments.ts` submission POST for students ([V] missing today), student uploads endpoint.

**Phase 4 — Communication & community**
`(tabs)/community.tsx` + new `post/[id].tsx` (comments), backend `routes/community.ts` comments GET/POST + report POST; pagination; optimistic reactions; `clubs/index.tsx` pending state + `clubs/[id].tsx`; `events/[id].tsx`.

**Phase 5 — Profile, subscriptions, settings**
`profile/edit.tsx` (`PUT /profile`), payments history screen, settings↔backend sync (`language`, `privacy` — fix enum mapping), forgot/change password, delete-account decision; push-token registration (`push_tokens`).

**Phase 6 — Performance, accessibility, polish**
Query pagination everywhere; backend N+1 joins; apply font family (Arabic-capable) + lineHeights; contrast audit (dark mode, muted text, gold-on-white); 44pt touch targets; haptics on primary actions; micro-motion (150–250 ms, reduced-motion aware); accessibility labels on icon-only buttons ([V] none today); README rewrite; delete/archive `student-web/`.

## Preserve (strongest parts)

- The **generated-client architecture** (orval hooks + React Query + zod) — clean, typed at the edge, one API contract for admin & mobile.
- **AuthContext** token refresh + segment-based routing — correct and tidy.
- **Onboarding wizard** cascading selection with downstream resets.
- **Design tokens** (`constants/theme.ts`, `colors.ts`) and the navy/gold identity.
- **EmptyState / Card / Button / Badge** component vocabulary and the consistent screen scaffolding (search → chips → list → empty state).
- The **tab structure** (Home / Courses / Calendar / Community / Profile + More grid) — matches the product's information architecture; don't reshuffle it.
