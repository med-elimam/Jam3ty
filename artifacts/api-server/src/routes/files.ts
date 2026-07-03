import { Router } from "express";
import { db, filesTable, usersTable, coursesTable, fileFavoritesTable } from "@workspace/db";
import { eq, and, ilike, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /files
router.get("/files", requireAuth, async (req, res) => {
  try {
    const { courseId, type, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(filesTable.approvalStatus, "approved"), eq(filesTable.isDeleted, false)];
    if (courseId) conditions.push(eq(filesTable.courseId, courseId));
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
