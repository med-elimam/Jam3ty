import { Router } from "express";
import { db, examsTable, coursesTable, profilesTable } from "@workspace/db";
import { eq, and, gte, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /exams
// Scoping rule: without an explicit courseId, exams are limited to courses matching
// the student's profile departmentId + levelId (same rule as GET /courses).
// No academic placement → no exams. An explicit courseId is honored as-is.
router.get("/exams", requireAuth, async (req, res) => {
  try {
    const { courseId, upcoming } = req.query as Record<string, string>;
    const conditions = [];
    if (courseId) {
      conditions.push(eq(examsTable.courseId, courseId));
    } else {
      const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);
      if (profile?.departmentId && profile?.levelId) {
        const scopedCourseIds = db
          .select({ id: coursesTable.id })
          .from(coursesTable)
          .where(and(eq(coursesTable.departmentId, profile.departmentId), eq(coursesTable.levelId, profile.levelId)));
        conditions.push(inArray(examsTable.courseId, scopedCourseIds));
      } else {
        conditions.push(sql`false`);
      }
    }
    if (upcoming === "true") conditions.push(gte(examsTable.date, new Date().toISOString().split("T")[0]!));

    const exams = await db.select().from(examsTable).where(and(...conditions)).orderBy(examsTable.date).limit(50);

    const enriched = await Promise.all(exams.map(async (e) => {
      const [course] = await db.select({ name: coursesTable.name }).from(coursesTable).where(eq(coursesTable.id, e.courseId)).limit(1);
      return { ...e, courseName: course?.name ?? "Unknown" };
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    req.log.error({ err }, "ListExams error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
