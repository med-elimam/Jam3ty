import { Router } from "express";
import { db, usersTable, profilesTable, subscriptionsTable, plansTable, timetableSessionsTable, coursesTable, announcementsTable, announcementReadsTable, assignmentsTable, assignmentSubmissionsTable, examsTable, filesTable, eventsTable, opportunitiesTable, notificationsTable } from "@workspace/db";
import { eq, and, gt, sql, count, isNull, or, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /dashboard/home
router.get("/dashboard/home", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } }); return; }
    const { passwordHash: _, ...safeUser } = user;

    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);

    // Subscription
    const [sub] = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.userId, req.userId!), eq(subscriptionsTable.status, "active"), gt(subscriptionsTable.expiresAt, new Date()))).orderBy(sql`${subscriptionsTable.expiresAt} DESC`).limit(1);
    let subscription = null;
    if (sub) {
      const [plan] = await db.select({ name: plansTable.name }).from(plansTable).where(eq(plansTable.id, sub.planId)).limit(1);
      const daysRemaining = Math.max(0, Math.ceil((sub.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      subscription = { ...sub, planName: plan?.name ?? "Plus", daysRemaining };
    }

    // Today's sessions
    const todayDow = new Date().getDay();
    const allSessions = await db.select().from(timetableSessionsTable).where(eq(timetableSessionsTable.dayOfWeek, todayDow)).orderBy(timetableSessionsTable.startTime).limit(10);
    const todaysSessions = await Promise.all(allSessions.map(async (s) => {
      const [course] = await db.select({ name: coursesTable.name, code: coursesTable.code }).from(coursesTable).where(eq(coursesTable.id, s.courseId)).limit(1);
      return { ...s, courseName: course?.name ?? "Unknown", courseCode: course?.code ?? null, professorName: null, groupName: null };
    }));

    // Latest announcements (up to 5)
    const latestAnnouncements = await db.select().from(announcementsTable).where(or(isNull(announcementsTable.expiresAt), gt(announcementsTable.expiresAt, new Date()))).orderBy(sql`${announcementsTable.createdAt} DESC`).limit(5);
    const readIds = await db.select({ id: announcementReadsTable.announcementId }).from(announcementReadsTable).where(eq(announcementReadsTable.userId, req.userId!));
    const readSet = new Set(readIds.map((r) => r.id));
    const latestAnnouncementsEnriched = latestAnnouncements.map((a) => ({ ...a, createdByName: "Admin", isRead: readSet.has(a.id), courseName: null }));

    // Upcoming assignments
    const upcomingAssignments = await db.select().from(assignmentsTable).where(gt(assignmentsTable.deadline, new Date())).orderBy(assignmentsTable.deadline).limit(5);
    const upcomingAssignmentsEnriched = await Promise.all(upcomingAssignments.map(async (a) => {
      const [course] = await db.select({ name: coursesTable.name }).from(coursesTable).where(eq(coursesTable.id, a.courseId)).limit(1);
      const [sub] = await db.select({ status: assignmentSubmissionsTable.status }).from(assignmentSubmissionsTable).where(and(eq(assignmentSubmissionsTable.assignmentId, a.id), eq(assignmentSubmissionsTable.studentId, req.userId!))).limit(1);
      return { ...a, courseName: course?.name ?? "Unknown", submissionStatus: sub?.status ?? "not_submitted" };
    }));

    // Upcoming exams
    const today = new Date().toISOString().split("T")[0]!;
    const upcomingExams = await db.select().from(examsTable).where(gte(examsTable.date, today)).orderBy(examsTable.date).limit(5);
    const upcomingExamsEnriched = await Promise.all(upcomingExams.map(async (e) => {
      const [course] = await db.select({ name: coursesTable.name }).from(coursesTable).where(eq(coursesTable.id, e.courseId)).limit(1);
      return { ...e, courseName: course?.name ?? "Unknown" };
    }));

    // Recent files
    const recentFiles = await db.select().from(filesTable).where(and(eq(filesTable.approvalStatus, "approved"), eq(filesTable.isDeleted, false))).orderBy(sql`${filesTable.createdAt} DESC`).limit(5);
    const recentFilesEnriched = recentFiles.map((f) => ({ ...f, uploaderName: "Unknown", courseName: null, isFavorited: false }));

    // Upcoming events
    const upcomingEvents = await db.select().from(eventsTable).where(gt(eventsTable.startDate, new Date())).orderBy(eventsTable.startDate).limit(5);

    // Featured opportunities
    const featuredOpportunities = await db.select().from(opportunitiesTable).where(and(eq(opportunitiesTable.isFeatured, true), eq(opportunitiesTable.status, "active"))).orderBy(sql`${opportunitiesTable.createdAt} DESC`).limit(5);

    // Unread notifications count
    const [unreadRow] = await db.select({ count: count() }).from(notificationsTable).where(and(eq(notificationsTable.userId, req.userId!), isNull(notificationsTable.readAt)));
    const unreadNotificationsCount = unreadRow?.count ?? 0;

    res.json({
      success: true,
      data: {
        student: { ...safeUser, profile: profile || null },
        subscription,
        todaysSessions,
        latestAnnouncements: latestAnnouncementsEnriched,
        upcomingAssignments: upcomingAssignmentsEnriched,
        upcomingExams: upcomingExamsEnriched,
        recentFiles: recentFilesEnriched,
        upcomingEvents: upcomingEvents.map((e) => ({ ...e, isRegistered: false })),
        featuredOpportunities,
        unreadNotificationsCount,
      },
    });
  } catch (err) {
    req.log.error({ err }, "DashboardHome error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
