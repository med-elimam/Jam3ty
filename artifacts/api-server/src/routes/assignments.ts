import { Router } from "express";
import { db, assignmentsTable, assignmentSubmissionsTable, coursesTable, profilesTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { requireEntitlement } from "../middlewares/entitlements";

const router = Router();

// GET /assignments
// Scoping rule: without an explicit courseId, assignments are limited to courses
// matching the student's profile departmentId + levelId (same rule as GET /courses).
// No academic placement → no assignments. An explicit courseId is honored as-is
// (course pages are reachable by id).
router.get("/assignments", requireAuth, requireEntitlement("assignments.view"), async (req, res) => {
  try {
    const { courseId, status } = req.query as Record<string, string>;
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);

    let assignments: (typeof assignmentsTable.$inferSelect)[];
    if (courseId) {
      assignments = await db.select().from(assignmentsTable).where(eq(assignmentsTable.courseId, courseId)).orderBy(assignmentsTable.deadline);
    } else if (profile?.departmentId && profile?.levelId) {
      const scopedCourseIds = db
        .select({ id: coursesTable.id })
        .from(coursesTable)
        .where(and(eq(coursesTable.departmentId, profile.departmentId), eq(coursesTable.levelId, profile.levelId)));
      assignments = await db.select().from(assignmentsTable).where(inArray(assignmentsTable.courseId, scopedCourseIds)).orderBy(assignmentsTable.deadline).limit(50);
    } else {
      assignments = [];
    }

    const enriched = await Promise.all(assignments.map(async (a) => {
      const [course] = await db.select({ name: coursesTable.name }).from(coursesTable).where(eq(coursesTable.id, a.courseId)).limit(1);
      const [submission] = await db.select().from(assignmentSubmissionsTable).where(and(eq(assignmentSubmissionsTable.assignmentId, a.id), eq(assignmentSubmissionsTable.studentId, req.userId!))).limit(1);
      return {
        ...a,
        courseName: course?.name ?? "Unknown",
        submissionStatus: submission?.status ?? "not_submitted",
      };
    }));

    const filtered = status ? enriched.filter((a) => a.submissionStatus === status) : enriched;
    res.json({ success: true, data: filtered });
  } catch (err) {
    req.log.error({ err }, "ListAssignments error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /assignments/:assignmentId
router.get("/assignments/:assignmentId", requireAuth, requireEntitlement("assignments.view"), async (req, res) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const [assignment] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, assignmentId)).limit(1);
    if (!assignment) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Assignment not found" } });
      return;
    }
    const [course] = await db.select({ name: coursesTable.name }).from(coursesTable).where(eq(coursesTable.id, assignment.courseId)).limit(1);
    const [submission] = await db.select().from(assignmentSubmissionsTable).where(and(eq(assignmentSubmissionsTable.assignmentId, assignmentId), eq(assignmentSubmissionsTable.studentId, req.userId!))).limit(1);
    res.json({
      success: true,
      data: {
        ...assignment,
        courseName: course?.name ?? "Unknown",
        submissionStatus: submission?.status ?? "not_submitted",
        submission: submission ?? null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "GetAssignment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
