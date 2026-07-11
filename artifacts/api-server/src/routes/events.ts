import { Router } from "express";
import { db, eventsTable, eventRegistrationsTable, profilesTable } from "@workspace/db";
import { eq, and, or, isNull, sql, count } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../middlewares/auth";

const router = Router();

// GET /events
// Scoping rule: platform-wide events (no universityId) are visible to everyone —
// including anonymous visitors (guest mode); university-bound events only to
// students of that university.
router.get("/events", optionalAuth, async (req, res) => {
  try {
    const { page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const [profile] = req.userId
      ? await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId)).limit(1)
      : [undefined];
    const events = await db.select().from(eventsTable).where(and(
      sql`${eventsTable.startDate} >= NOW()`,
      or(isNull(eventsTable.universityId), profile?.universityId ? eq(eventsTable.universityId, profile.universityId) : sql`false`),
    )).orderBy(eventsTable.startDate).limit(limitNum).offset(offset);
    const regIds = req.userId
      ? await db.select({ eventId: eventRegistrationsTable.eventId }).from(eventRegistrationsTable).where(eq(eventRegistrationsTable.userId, req.userId))
      : [];
    const regSet = new Set(regIds.map((r) => r.eventId));
    const enriched = events.map((e) => ({ ...e, isRegistered: regSet.has(e.id) }));
    res.json({ success: true, data: enriched });
  } catch (err) {
    req.log.error({ err }, "ListEvents error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /events/:eventId/register
router.post("/events/:eventId/register", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params as { eventId: string };
    const [existing] = await db.select().from(eventRegistrationsTable).where(and(eq(eventRegistrationsTable.eventId, eventId), eq(eventRegistrationsTable.userId, req.userId!))).limit(1);
    if (!existing) {
      await db.insert(eventRegistrationsTable).values({ eventId, userId: req.userId! });
      await db.update(eventsTable).set({ registrationCount: sql`${eventsTable.registrationCount} + 1` }).where(eq(eventsTable.id, eventId));
    }
    res.json({ success: true, message: "Registered for event" });
  } catch (err) {
    req.log.error({ err }, "RegisterForEvent error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
