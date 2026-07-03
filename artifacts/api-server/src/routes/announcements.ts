import { Router } from "express";
import { db, announcementsTable, usersTable, profilesTable, announcementReadsTable, coursesTable } from "@workspace/db";
import { eq, and, or, sql, count, isNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /announcements
router.get("/announcements", requireAuth, async (req, res) => {
  try {
    const { page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);

    // Get announcements relevant to this student
    const conditions = [
      or(
        eq(announcementsTable.scope, "global"),
        and(eq(announcementsTable.scope, "university"), profile?.universityId ? eq(announcementsTable.universityId, profile.universityId) : sql`false`),
        and(eq(announcementsTable.scope, "faculty"), profile?.facultyId ? eq(announcementsTable.facultyId, profile.facultyId) : sql`false`),
        and(eq(announcementsTable.scope, "department"), profile?.departmentId ? eq(announcementsTable.departmentId, profile.departmentId) : sql`false`),
        and(eq(announcementsTable.scope, "level"), profile?.levelId ? eq(announcementsTable.levelId, profile.levelId) : sql`false`),
        and(eq(announcementsTable.scope, "group"), profile?.groupId ? eq(announcementsTable.groupId, profile.groupId) : sql`false`),
      ),
      or(isNull(announcementsTable.expiresAt), sql`${announcementsTable.expiresAt} > NOW()`),
    ];

    const announcements = await db.select().from(announcementsTable).where(and(...conditions)).orderBy(sql`${announcementsTable.createdAt} DESC`).limit(limitNum).offset(offset);
    const [totalRow] = await db.select({ count: count() }).from(announcementsTable).where(and(...conditions));
    const total = totalRow?.count ?? 0;

    const readIds = await db.select({ announcementId: announcementReadsTable.announcementId }).from(announcementReadsTable).where(eq(announcementReadsTable.userId, req.userId!));
    const readSet = new Set(readIds.map((r) => r.announcementId));

    const enriched = await Promise.all(announcements.map(async (a) => {
      const [creator] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, a.createdBy)).limit(1);
      const courseName = a.courseId ? (await db.select({ name: coursesTable.name }).from(coursesTable).where(eq(coursesTable.id, a.courseId)).limit(1))[0]?.name ?? null : null;
      return { ...a, createdByName: creator?.fullName ?? "Admin", courseName, isRead: readSet.has(a.id) };
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    req.log.error({ err }, "ListAnnouncements error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /announcements/:announcementId/read
router.post("/announcements/:announcementId/read", requireAuth, async (req, res) => {
  try {
    const { announcementId } = req.params as { announcementId: string };
    const [existing] = await db.select().from(announcementReadsTable).where(and(eq(announcementReadsTable.announcementId, announcementId), eq(announcementReadsTable.userId, req.userId!))).limit(1);
    if (!existing) {
      await db.insert(announcementReadsTable).values({ announcementId, userId: req.userId! });
    }
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    req.log.error({ err }, "MarkAnnouncementRead error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
