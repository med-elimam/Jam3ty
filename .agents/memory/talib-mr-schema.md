---
name: Talib MR schema facts
description: Actual DB column names that differ from intuitive names; prevents seed/route/screen bugs
---

**Why:** Multiple seed and screen bugs were caused by guessing column names instead of checking the schema.

**How to apply:** When writing any insert, query, or screen field access, verify against the actual schema first.

## Column facts by table

| Table | Does NOT exist | Does exist |
|-------|---------------|------------|
| universitiesTable | country, isVerified | name, nameAr, city, status (community_created/verified/official_partner) |
| departmentsTable | code | name, nameAr, nameFr, facultyId |
| levelsTable | nameAr, degree | name, yearNumber, departmentId |
| studentGroupsTable | nameAr, maxSize | name, levelId |
| plansTable | description, descriptionAr, maxAiRequests, isFeatured | name, nameAr, priceMru, durationDays, features (text[] array), isActive |
| coursesTable | creditHours | name, nameAr, code, description, departmentId, levelId, semester, professorId |
| usersTable | isVerified | emailVerified, isActive |
| announcementsTable | titleAr, contentAr, isPinned | title, content, priority (normal/important/urgent), scope |
| eventsTable | hackathon type, requiresRegistration, maxAttendees, titleAr | type enum: university/club/training/competition/workshop/conference/other |
| opportunitiesTable | company, applyUrl | organization, link, deadline (text not timestamp) |

## Enum values

- `announcement_priority`: normal, important, urgent (NOT high/medium/low)
- `announcement_scope`: global, university, faculty, department, level, group, course
- `event_type`: university, club, training, competition, workshop, conference, other (NO hackathon)
- `opportunity_type`: internship, job, training, scholarship, competition, hackathon, freelance, volunteering
- `university_status`: community_created, verified, official_partner
- `session_type`: lecture, td, tp
