---
name: Jamiati Phase 3 seed design
description: Idempotency strategy, levelId linkage quirk, and reaction auth fix introduced in Phase 3.
---

## Idempotency strategy

- **Academic hierarchy** (universities, faculties, departments, levels, groups): find-by-(universityId+nameAr), insert if not found — NOT upsert.
- **Courses**: find-by-code; if found, **UPDATE levelId + departmentId + professorId** — critical because previous seed runs used English-named levels which created separate level rows. Without the update step, courses remain linked to old level IDs and the courses route (which filters by `departmentId AND levelId` from profile) returns wrong results.
- **Content tables** (timetable, files, announcements, assignments, exams, posts, events, opportunities, clubs): `tableIsEmpty` guard — insert only if zero rows exist. Sufficient for demo seed; not fully convergent for partial seeds.
- **Plans**: same `tableIsEmpty` guard; 15 plans exist from pre-Phase-3 seed runs (5 runs × 3 plans). This is harmless but a future cleanup should dedupe.

**Why:** `levelsTable` has NO `nameAr` column — Arabic names must go in the `name` field. Phase 3 seed switched from English to Arabic level names which created new level rows, breaking the foreign-key chain between courses and profiles.

## Reaction auth bug (fixed)

Original community.ts reaction toggle queried by `postId` only:
```ts
// WRONG — any user toggled any reaction on a post
where(eq(reactionsTable.postId, postId))
```
Fixed to:
```ts
// CORRECT — scoped to the current user
where(and(eq(reactionsTable.postId, postId), eq(reactionsTable.userId, req.userId!)))
```

**Why:** Missing userId scope meant one user could silently delete/replace another user's reaction and corrupt `reactionCount`.

## Demo accounts after Phase 3

| Email | Password | Profile |
|---|---|---|
| student@jamiati.mr | Student@1234 | UAN > CST > علوم الحاسوب > L2 > Group A |
| student2@jamiati.mr | Student@1234 | ISCAE > إدارة الأعمال > L1 > Group A |
| prof@jamiati.mr | Prof@1234 | Professor (UAN > CST > CS) |
| admin@jamiati.mr | Admin@1234 | Super Admin |
