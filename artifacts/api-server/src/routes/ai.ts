import { Router } from "express";
import { db, aiUsageLogsTable, subscriptionsTable, plansTable } from "@workspace/db";
import { eq, and, gt, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const AI_LIMITS = { free: 5, plus: 50, premium_ai: 200 };

async function getUserPlan(userId: string): Promise<"free" | "plus" | "premium_ai"> {
  const [sub] = await db.select({ planId: subscriptionsTable.planId }).from(subscriptionsTable).where(
    and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.status, "active"), gt(subscriptionsTable.expiresAt, new Date()))
  ).limit(1);
  if (!sub) return "free";
  const [plan] = await db.select({ name: plansTable.name }).from(plansTable).where(eq(plansTable.id, sub.planId)).limit(1);
  if (plan?.name?.toLowerCase().includes("premium")) return "premium_ai";
  if (plan?.name?.toLowerCase().includes("plus")) return "plus";
  return "free";
}

// POST /ai/chat
router.post("/chat", requireAuth, async (req, res) => {
  try {
    const { message, context } = req.body as { message?: string; context?: string };
    if (!message?.trim()) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "Message is required" } });
      return;
    }

    const AI_API_KEY = process.env["OPENAI_API_KEY"] || process.env["ANTHROPIC_API_KEY"];
    if (!AI_API_KEY) {
      res.status(503).json({ success: false, error: { code: "AI_NOT_CONFIGURED", message: "AI features are not configured yet. Please check back later." } });
      return;
    }

    const userPlan = await getUserPlan(req.userId!);
    const limit = AI_LIMITS[userPlan];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [usageRow] = await db.select({ count: count() }).from(aiUsageLogsTable).where(and(eq(aiUsageLogsTable.userId, req.userId!), gt(aiUsageLogsTable.createdAt, today)));
    const used = usageRow?.count ?? 0;

    if (used >= limit) {
      res.status(403).json({ success: false, error: { code: "USAGE_LIMIT_REACHED", message: `Daily AI limit reached (${limit} requests). Upgrade your plan for more.` } });
      return;
    }

    // Log usage
    await db.insert(aiUsageLogsTable).values({ userId: req.userId!, feature: "chat", inputSize: String(message.length), planAtTime: userPlan, status: "success" });

    res.json({
      success: true,
      data: {
        reply: "AI responses require an API key configuration. The infrastructure is ready — please configure OPENAI_API_KEY or ANTHROPIC_API_KEY in environment secrets.",
        usageRemaining: limit - used - 1,
      },
    });
  } catch (err) {
    req.log.error({ err }, "AIChat error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /ai/usage
router.get("/usage", requireAuth, async (req, res) => {
  try {
    const userPlan = await getUserPlan(req.userId!);
    const limit = AI_LIMITS[userPlan];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [usageRow] = await db.select({ count: count() }).from(aiUsageLogsTable).where(and(eq(aiUsageLogsTable.userId, req.userId!), gt(aiUsageLogsTable.createdAt, today)));
    const used = usageRow?.count ?? 0;
    res.json({ success: true, data: { used, limit, plan: userPlan } });
  } catch (err) {
    req.log.error({ err }, "GetAIUsage error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
