import { Router } from "express";
import { db, examsTable, coursesTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /exams
router.get("/exams", requireAuth, async (req, res) => {
  try {
    const { courseId, upcoming } = req.query as Record<string, string>;
    const conditions = [];
    if (courseId) conditions.push(eq(examsTable.courseId, courseId));
    if (upcoming === "true") conditions.push(gte(examsTable.date, new Date().toISOString().split("T")[0]!));

    const exams = conditions.length > 0
      ? await db.select().from(examsTable).where(and(...conditions)).orderBy(examsTable.date).limit(50)
      : await db.select().from(examsTable).orderBy(examsTable.date).limit(50);

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
