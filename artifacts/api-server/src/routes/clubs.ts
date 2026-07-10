import { Router } from "express";
import { db, clubsTable, clubMembersTable, clubJoinRequestsTable, profilesTable } from "@workspace/db";
import { eq, and, or, isNull, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /clubs
// Scoping rule: platform-wide clubs (no universityId) are visible to everyone;
// university-bound clubs only to students of that university.
router.get("/clubs", requireAuth, async (req, res) => {
  try {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);
    const clubs = await db.select().from(clubsTable).where(and(
      eq(clubsTable.status, "active"),
      or(isNull(clubsTable.universityId), profile?.universityId ? eq(clubsTable.universityId, profile.universityId) : sql`false`),
    )).orderBy(clubsTable.name);
    const memberClubs = await db.select({ clubId: clubMembersTable.clubId }).from(clubMembersTable).where(eq(clubMembersTable.userId, req.userId!));
    const memberSet = new Set(memberClubs.map((m) => m.clubId));
    const enriched = clubs.map((c) => ({ ...c, isMember: memberSet.has(c.id) }));
    res.json({ success: true, data: enriched });
  } catch (err) {
    req.log.error({ err }, "ListClubs error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /clubs/:clubId/join
router.post("/clubs/:clubId/join", requireAuth, async (req, res) => {
  try {
    const { clubId } = req.params as { clubId: string };
    const [existing] = await db.select().from(clubJoinRequestsTable).where(and(eq(clubJoinRequestsTable.clubId, clubId), eq(clubJoinRequestsTable.userId, req.userId!))).limit(1);
    if (!existing) {
      await db.insert(clubJoinRequestsTable).values({ clubId, userId: req.userId!, status: "pending" });
    }
    res.json({ success: true, message: "Join request submitted" });
  } catch (err) {
    req.log.error({ err }, "JoinClub error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
