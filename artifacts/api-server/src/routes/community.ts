import { Router } from "express";
import { db, postsTable, usersTable, reactionsTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /community/posts
router.get("/community/posts", requireAuth, async (req, res) => {
  try {
    const { page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const posts = await db.select().from(postsTable).where(eq(postsTable.moderationStatus, "visible")).orderBy(sql`${postsTable.isPinned} DESC, ${postsTable.createdAt} DESC`).limit(limitNum).offset(offset);
    const [totalRow] = await db.select({ count: count() }).from(postsTable).where(eq(postsTable.moderationStatus, "visible"));
    const total = totalRow?.count ?? 0;

    const enriched = await Promise.all(posts.map(async (post) => {
      const [author] = await db.select({ fullName: usersTable.fullName, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, post.authorId)).limit(1);
      const [userReactionRow] = await db.select({ reaction: reactionsTable.reaction }).from(reactionsTable).where(eq(reactionsTable.postId, post.id)).limit(1);
      return {
        ...post,
        authorName: author?.fullName ?? "Unknown",
        authorAvatarUrl: author?.avatarUrl ?? null,
        userReaction: userReactionRow?.reaction ?? null,
      };
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    req.log.error({ err }, "ListPosts error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /community/posts
router.post("/community/posts", requireAuth, async (req, res) => {
  try {
    const { content, visibility = "same_university" } = req.body as { content: string; visibility?: string };
    if (!content?.trim()) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "Content is required" } });
      return;
    }
    const [post] = await db.insert(postsTable).values({ content, authorId: req.userId!, visibility: visibility as "public" | "same_university" | "same_department" | "same_course" | "same_group" }).returning();
    const [author] = await db.select({ fullName: usersTable.fullName, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    res.status(201).json({ success: true, data: { ...post, authorName: author?.fullName ?? "Unknown", authorAvatarUrl: author?.avatarUrl ?? null, userReaction: null } });
  } catch (err) {
    req.log.error({ err }, "CreatePost error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /community/posts/:postId/react
router.post("/community/posts/:postId/react", requireAuth, async (req, res) => {
  try {
    const { postId } = req.params as { postId: string };
    const { reaction } = req.body as { reaction: string };
    const [existing] = await db.select().from(reactionsTable).where(eq(reactionsTable.postId, postId)).limit(1);
    if (existing) {
      await db.delete(reactionsTable).where(eq(reactionsTable.id, existing.id));
      await db.update(postsTable).set({ reactionCount: sql`${postsTable.reactionCount} - 1` }).where(eq(postsTable.id, postId));
    } else {
      await db.insert(reactionsTable).values({ postId, userId: req.userId!, reaction });
      await db.update(postsTable).set({ reactionCount: sql`${postsTable.reactionCount} + 1` }).where(eq(postsTable.id, postId));
    }
    res.json({ success: true, message: "Reaction updated" });
  } catch (err) {
    req.log.error({ err }, "ReactToPost error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
