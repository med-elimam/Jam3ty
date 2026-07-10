import { Router } from "express";
import { db, timetableSessionsTable, coursesTable, usersTable, profilesTable, studentGroupsTable } from "@workspace/db";
import { eq, and, or, isNull, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /timetable
// Scoping rule: sessions are limited to courses matching the student's profile
// departmentId + levelId (same rule as GET /courses), and within those to sessions
// with no group or the student's group. No academic placement → empty timetable.
router.get("/timetable", requireAuth, async (req, res) => {
  try {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);

    let sessions: (typeof timetableSessionsTable.$inferSelect)[] = [];
    if (profile?.departmentId && profile?.levelId) {
      const scopedCourseIds = db
        .select({ id: coursesTable.id })
        .from(coursesTable)
        .where(and(eq(coursesTable.departmentId, profile.departmentId), eq(coursesTable.levelId, profile.levelId)));
      sessions = await db.select().from(timetableSessionsTable).where(and(
        inArray(timetableSessionsTable.courseId, scopedCourseIds),
        or(
          isNull(timetableSessionsTable.groupId),
          profile.groupId ? eq(timetableSessionsTable.groupId, profile.groupId) : isNull(timetableSessionsTable.groupId),
        ),
      )).orderBy(timetableSessionsTable.dayOfWeek, timetableSessionsTable.startTime);
    }

    const enriched = await Promise.all(sessions.map(async (session) => {
      const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, session.courseId)).limit(1);
      const professorName = course?.professorId
        ? (await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, course.professorId)).limit(1))[0]?.fullName ?? null
        : null;
      const groupName = session.groupId
        ? (await db.select({ name: studentGroupsTable.name }).from(studentGroupsTable).where(eq(studentGroupsTable.id, session.groupId)).limit(1))[0]?.name ?? null
        : null;
      return {
        ...session,
        courseName: course?.name ?? "Unknown Course",
        courseCode: course?.code ?? null,
        professorName,
        groupName,
      };
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    req.log.error({ err }, "GetTimetable error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
