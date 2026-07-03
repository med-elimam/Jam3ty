import { Router } from "express";
import { db, opportunitiesTable } from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /opportunities
router.get("/opportunities", requireAuth, async (req, res) => {
  try {
    const { type, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(opportunitiesTable.status, "active")];
    if (type) conditions.push(eq(opportunitiesTable.type, type as "internship" | "job" | "training" | "scholarship" | "competition" | "hackathon" | "freelance" | "volunteering"));

    const opportunities = await db.select().from(opportunitiesTable).where(and(...conditions)).orderBy(sql`${opportunitiesTable.isFeatured} DESC, ${opportunitiesTable.createdAt} DESC`).limit(limitNum).offset(offset);
    const [totalRow] = await db.select({ count: count() }).from(opportunitiesTable).where(and(...conditions));
    const total = totalRow?.count ?? 0;

    res.json({
      success: true,
      data: opportunities,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    req.log.error({ err }, "ListOpportunities error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
