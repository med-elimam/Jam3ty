import { Router } from "express";
import { db, filesTable, usersTable, coursesTable, fileFavoritesTable, profilesTable } from "@workspace/db";
import { eq, and, or, isNull, inArray, ilike, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { requireEntitlement } from "../middlewares/entitlements";

const router = Router();

// GET /files
// Scoping rule: without an explicit courseId, the list contains general files
// (courseId null) plus files of courses matching the student's profile
// departmentId + levelId (same rule as GET /courses). No academic placement →
// general files only. An explicit courseId is honored as-is.
router.get("/files", requireAuth, requireEntitlement("files.view"), async (req, res) => {
  try {
    const { courseId, type, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(filesTable.approvalStatus, "approved"), eq(filesTable.isDeleted, false)];
    if (courseId) {
      conditions.push(eq(filesTable.courseId, courseId));
    } else {
      const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);
      if (profile?.departmentId && profile?.levelId) {
        const scopedCourseIds = db
          .select({ id: coursesTable.id })
          .from(coursesTable)
          .where(and(eq(coursesTable.departmentId, profile.departmentId), eq(coursesTable.levelId, profile.levelId)));
        conditions.push(or(isNull(filesTable.courseId), inArray(filesTable.courseId, scopedCourseIds))!);
      } else {
        conditions.push(isNull(filesTable.courseId));
      }
    }
    if (type) conditions.push(eq(filesTable.fileType, type as "lecture" | "td" | "tp" | "summary" | "exam" | "correction" | "book" | "other"));
    if (search) conditions.push(ilike(filesTable.title, `%${search}%`));

    const files = await db.select().from(filesTable).where(and(...conditions)).orderBy(sql`${filesTable.createdAt} DESC`).limit(limitNum).offset(offset);
    const [totalRow] = await db.select({ count: count() }).from(filesTable).where(and(...conditions));
    const total = totalRow?.count ?? 0;

    const favoritedFileIds = await db.select({ fileId: fileFavoritesTable.fileId }).from(fileFavoritesTable).where(eq(fileFavoritesTable.userId, req.userId!));
    const favSet = new Set(favoritedFileIds.map((f) => f.fileId));

    const filesWithDetails = await Promise.all(files.map(async (file) => {
      const [uploader] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, file.uploadedBy)).limit(1);
      const courseName = file.courseId
        ? (await db.select({ name: coursesTable.name }).from(coursesTable).where(eq(coursesTable.id, file.courseId)).limit(1))[0]?.name ?? null
        : null;
      return { ...file, uploaderName: uploader?.fullName ?? "Unknown", courseName, isFavorited: favSet.has(file.id) };
    }));

    res.json({
      success: true,
      data: filesWithDetails,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    req.log.error({ err }, "ListFiles error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /files/:fileId — single approved file, enriched like the list rows.
router.get("/files/:fileId", requireAuth, requireEntitlement("files.view"), async (req, res) => {
  try {
    const { fileId } = req.params as { fileId: string };
    const [file] = await db
      .select()
      .from(filesTable)
      .where(and(eq(filesTable.id, fileId), eq(filesTable.approvalStatus, "approved"), eq(filesTable.isDeleted, false)))
      .limit(1);
    if (!file) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "File not found" } });
      return;
    }

    const [uploader] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, file.uploadedBy)).limit(1);
    const courseName = file.courseId
      ? (await db.select({ name: coursesTable.name }).from(coursesTable).where(eq(coursesTable.id, file.courseId)).limit(1))[0]?.name ?? null
      : null;
    const [favorite] = await db
      .select({ id: fileFavoritesTable.id })
      .from(fileFavoritesTable)
      .where(and(eq(fileFavoritesTable.fileId, file.id), eq(fileFavoritesTable.userId, req.userId!)))
      .limit(1);

    res.json({
      success: true,
      data: { ...file, uploaderName: uploader?.fullName ?? "Unknown", courseName, isFavorited: !!favorite },
    });
  } catch (err) {
    req.log.error({ err }, "GetFile error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /files/:fileId/view — increment the view counter (fire-and-forget from clients).
router.post("/files/:fileId/view", requireAuth, requireEntitlement("files.view"), async (req, res) => {
  try {
    const { fileId } = req.params as { fileId: string };
    const [updated] = await db
      .update(filesTable)
      .set({ viewCount: sql`${filesTable.viewCount} + 1` })
      .where(and(eq(filesTable.id, fileId), eq(filesTable.approvalStatus, "approved"), eq(filesTable.isDeleted, false)))
      .returning({ viewCount: filesTable.viewCount });
    if (!updated) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "File not found" } });
      return;
    }
    res.json({ success: true, data: { viewCount: updated.viewCount } });
  } catch (err) {
    req.log.error({ err }, "RecordFileView error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /files/:fileId/favorite
router.post("/files/:fileId/favorite", requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params as { fileId: string };
    const [existing] = await db.select().from(fileFavoritesTable).where(and(eq(fileFavoritesTable.fileId, fileId), eq(fileFavoritesTable.userId, req.userId!))).limit(1);
    if (existing) {
      await db.delete(fileFavoritesTable).where(eq(fileFavoritesTable.id, existing.id));
      res.json({ success: true, data: { isFavorited: false } });
    } else {
      await db.insert(fileFavoritesTable).values({ fileId, userId: req.userId! });
      res.json({ success: true, data: { isFavorited: true } });
    }
  } catch (err) {
    req.log.error({ err }, "ToggleFileFavorite error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
