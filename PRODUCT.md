# Product

## Register

product

## Users

- **Students** at Mauritanian universities (default city: Nouakchott). Primary language Arabic (RTL); French is the secondary academic language. They use the **Jamiati (جامعتي) mobile app** (Expo — native Android/iOS and web export) on mid-range Android phones, often on unstable mobile data, to check today's schedule, download course files (lectures, TD, TP, summaries, past exams and corrections), track assignments and exams, follow announcements, join clubs/events, find opportunities, and chat with an AI study assistant.
- **University staff / platform operators** (super_admin today; finer roles exist in the DB enum but are not yet enforced) use the **Admin Web dashboard** (React + Vite, desktop) to create all the content students consume: academic structure, courses, files, announcements, timetables, assignments, exams, events, clubs, opportunities, plans, payments, agents.
- **Sales agents** sell activation codes for paid subscriptions in cash (managed in Admin; no agent-facing app yet).

## Product Purpose

Jam3ty/Jamiati is a university companion platform for Mauritania: the Admin dashboard is the content-management system, the mobile app is the student-facing product, and a single Express API + Postgres database connects them. Monetization is a freemium subscription (MRU pricing) paid through local channels — Bankily, Masrvi, Sedad, cash agents, and activation codes — with manual payment review in Admin. Success = students reliably find their schedule, files and deadlines in Arabic on day one, and paid plans activate without friction.

## Brand Personality

Trustworthy, studious, local. Navy blue (#1E3A5F) + gold (#D4A853) carry the identity in the mobile app; the tone is helpful and institutional without being bureaucratic. Arabic-first: the interface should feel natively RTL, not translated.

## Anti-references

- Generic Silicon-Valley SaaS dashboards — this serves low-bandwidth mobile users, not desktop analysts.
- LTR-first apps with mirrored-as-an-afterthought RTL (hardcoded `textAlign: right`, wrong chevron direction in French mode).
- Card-soup home screens where every module looks identical and nothing is actionable.

## Design Principles

1. **Arabic-first, direction-aware** — every layout must work in RTL and LTR from the same code path; no baked-in alignment.
2. **The schedule is the hero** — today's sessions, next deadline, next exam are what students open the app for; surface them before anything else.
3. **Content the admin creates must be reachable in ≤2 taps** — no dead-end lists, every list item has a detail or an action.
4. **Offline-tolerant and low-bandwidth** — cached queries, skeletons over spinners, explicit error + retry states.
5. **One component vocabulary** — the same Card, Badge, Button, EmptyState everywhere; the tool disappears into the task.

## Accessibility & Inclusion

No formal WCAG target stated (inferred). Practical bar: 4.5:1 contrast for body text in both light and dark palettes, ≥44pt touch targets, reduced-motion honored, and fully legible Arabic typography (line heights ≥1.5 for Arabic script).
