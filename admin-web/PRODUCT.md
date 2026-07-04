# Product

## Register

product

## Users

A small internal admin team (currently the `super_admin` role; the underlying role system also defines `department_admin`, `faculty_admin`, `university_admin`, `moderator`, `finance_admin`, and others for future rollout) at Jam3ty, a university student platform serving Mauritania. They use this dashboard intensively, for long stretches every day, on a desktop/laptop screen, to run the platform: managing universities, academic structure, users, courses, files, content moderation, and payment/subscription approvals. The job on any given screen is a concrete operation — list, create, edit, approve, reject, delete — not passive browsing.

## Product Purpose

The real, working control plane for the Jam3ty platform. Every screen must reflect the live database and every visible action must actually do something — no placeholder screens, no dead buttons, no "not implemented yet" messages. Success looks like: an admin can find what they need, act on it, and trust that what they see is real, current data, with minimal friction for tasks they repeat many times a day.

## Brand Personality

Modern, confident, efficient. Visually attractive without being decorative — the personality serves fast, repeat, high-trust daily use by a small operations team, not a first impression for outside visitors. No fixed Jam3ty brand constraints apply here (admin-web is free to establish its own visual identity, distinct from the student-facing app); the room this frees up should go toward clarity and craft, not decoration.

## Anti-references

No specific named product. Avoid: dated/cluttered 2010s-style admin templates, dense unstyled data tables, decorative elements (gradients, icons, shadows) that don't aid comprehension or slow down a user who is here to get a task done quickly.

## Design Principles

1. **Real over decorative.** Every screen reflects live data and every visible action works end to end. This is the platform's founding constraint, not just a launch checklist item.
2. **Optimize for the repeat, not the first visit.** These are the same few people, all day, every day — minimize clicks and friction for the operations they perform most.
3. **Bilingual-native, not RTL-retrofitted.** Arabic (RTL) is the primary reading direction, French (LTR) is secondary. Layouts must feel equally native mirrored either way, not designed LTR-first with RTL bolted on.
4. **Clarity over cleverness.** Data and destructive actions (delete, reject) must be unambiguous at a glance — this is an ops tool, not a showcase.
5. **Free visual identity.** No legacy brand constraints to preserve; use that freedom for confidence and polish, not novelty for its own sake.

## Accessibility & Inclusion

No formal WCAG level mandated by the team, but strong color contrast and correct RTL/LTR behavior are explicitly called out as priorities — treat them as required baselines (≥4.5:1 body text contrast, full RTL mirroring correctness) even without a formal compliance target.
