import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, isNull, count, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /notifications
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const { unreadOnly } = req.query as { unreadOnly?: string };
    const conditions = [eq(notificationsTable.userId, req.userId!)];
    if (unreadOnly === "true") conditions.push(isNull(notificationsTable.readAt));

    const notifications = await db.select().from(notificationsTable).where(and(...conditions)).orderBy(desc(notificationsTable.createdAt)).limit(50);
    const [unreadRow] = await db.select({ count: count() }).from(notificationsTable).where(and(eq(notificationsTable.userId, req.userId!), isNull(notificationsTable.readAt)));
    const unreadCount = unreadRow?.count ?? 0;

    res.json({ success: true, data: notifications.map((n) => ({ ...n, isRead: !!n.readAt })), unreadCount });
  } catch (err) {
    req.log.error({ err }, "ListNotifications error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /notifications/read-all
router.post("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await db.update(notificationsTable).set({ readAt: new Date() }).where(and(eq(notificationsTable.userId, req.userId!), isNull(notificationsTable.readAt)));
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    req.log.error({ err }, "MarkAllRead error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});


// POST /notifications/push-token
router.post("/notifications/push-token", requireAuth, async (req, res) => {
  try {
    const { token, platform } = req.body as { token: string; platform: string };
    if (!token || !platform) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "token and platform are required" } });
      return;
    }

    const { pushTokensTable } = await import("@workspace/db");
    const existing = await db.select().from(pushTokensTable).where(eq(pushTokensTable.token, token)).limit(1);
    if (existing.length > 0) {
      await db.update(pushTokensTable).set({ userId: req.userId!, platform }).where(eq(pushTokensTable.token, token));
    } else {
      await db.insert(pushTokensTable).values({ userId: req.userId!, token, platform });
    }

    res.json({ success: true, message: "Token registered successfully" });
  } catch (err) {
    req.log.error({ err }, "RegisterPushToken error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
