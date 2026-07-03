import { Router } from "express";
import { db, coursesTable, usersTable, profilesTable, filesTable, announcementsTable, assignmentsTable, examsTable, assignmentSubmissionsTable, fileFavoritesTable } from "@workspace/db";
import { eq, and, count, sql, ilike } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /courses
router.get("/courses", requireAuth, async (req, res) => {
  try {
    const { search } = req.query as { search?: string };
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);

    let coursesQuery = db.select({
      id: coursesTable.id,
      name: coursesTable.name,
      nameAr: coursesTable.nameAr,
      code: coursesTable.code,
      description: coursesTable.description,
      semester: coursesTable.semester,
      professorId: coursesTable.professorId,
      departmentId: coursesTable.departmentId,
      levelId: coursesTable.levelId,
    }).from(coursesTable);

    const conditions = [];
    if (profile?.departmentId) conditions.push(eq(coursesTable.departmentId, profile.departmentId));
    if (profile?.levelId) conditions.push(eq(coursesTable.levelId, profile.levelId));
    if (search) conditions.push(ilike(coursesTable.name, `%${search}%`));

    const courses = conditions.length > 0
      ? await coursesQuery.where(and(...conditions)).orderBy(coursesTable.name)
      : await coursesQuery.orderBy(coursesTable.name).limit(50);

    const coursesWithDetails = await Promise.all(courses.map(async (course) => {
      const professorName = course.professorId
        ? (await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, course.professorId)).limit(1))[0]?.fullName ?? null
        : null;
      const [fileCount] = await db.select({ count: count() }).from(filesTable).where(and(eq(filesTable.courseId, course.id), eq(filesTable.approvalStatus, "approved")));
      const [assignmentCount] = await db.select({ count: count() }).from(assignmentsTable).where(eq(assignmentsTable.courseId, course.id));
      return { ...course, professorName, fileCount: fileCount?.count ?? 0, assignmentCount: assignmentCount?.count ?? 0 };
    }));

    res.json({ success: true, data: coursesWithDetails });
  } catch (err) {
    req.log.error({ err }, "ListCourses error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /courses/:courseId
router.get("/courses/:courseId", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params as { courseId: string };
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!course) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Course not found" } });
      return;
    }
    const professorName = course.professorId
      ? (await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, course.professorId)).limit(1))[0]?.fullName ?? null
      : null;

    const favoritedFileIds = await db.select({ fileId: fileFavoritesTable.fileId }).from(fileFavoritesTable).where(eq(fileFavoritesTable.userId, req.userId!));
    const favSet = new Set(favoritedFileIds.map((f) => f.fileId));

    const recentFiles = await db.select().from(filesTable).where(and(eq(filesTable.courseId, courseId), eq(filesTable.approvalStatus, "approved"))).orderBy(sql`${filesTable.createdAt} DESC`).limit(5);
    const recentAnnouncements = await db.select().from(announcementsTable).where(and(eq(announcementsTable.courseId, courseId))).orderBy(sql`${announcementsTable.createdAt} DESC`).limit(5);
    const upcomingAssignments = await db.select().from(assignmentsTable).where(and(eq(assignmentsTable.courseId, courseId), sql`${assignmentsTable.deadline} > NOW()`)).orderBy(assignmentsTable.deadline).limit(5);
    const upcomingExams = await db.select().from(examsTable).where(and(eq(examsTable.courseId, courseId), sql`${examsTable.date} >= CURRENT_DATE`)).orderBy(examsTable.date).limit(5);

    const [fileCount] = await db.select({ count: count() }).from(filesTable).where(and(eq(filesTable.courseId, courseId), eq(filesTable.approvalStatus, "approved")));
    const [assignmentCount] = await db.select({ count: count() }).from(assignmentsTable).where(eq(assignmentsTable.courseId, courseId));

    res.json({
      success: true,
      data: {
        ...course,
        professorName,
        fileCount: fileCount?.count ?? 0,
        assignmentCount: assignmentCount?.count ?? 0,
        recentFiles: recentFiles.map((f) => ({ ...f, isFavorited: favSet.has(f.id), uploaderName: "Unknown" })),
        recentAnnouncements: recentAnnouncements.map((a) => ({ ...a, createdByName: "Admin", isRead: false })),
        upcomingAssignments: upcomingAssignments.map((a) => ({ ...a, courseName: course.name, submissionStatus: null })),
        upcomingExams: upcomingExams.map((e) => ({ ...e, courseName: course.name })),
      },
    });
  } catch (err) {
    req.log.error({ err }, "GetCourse error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
