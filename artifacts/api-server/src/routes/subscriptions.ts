import { Router } from "express";
import { db, plansTable, subscriptionsTable, paymentsTable, activationCodesTable, codeRedemptionsTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /subscriptions/plans
router.get("/plans", async (req, res) => {
  try {
    const plans = await db.select().from(plansTable).where(eq(plansTable.isActive, true)).orderBy(plansTable.priceMru);
    res.json({ success: true, data: plans });
  } catch (err) {
    req.log.error({ err }, "ListPlans error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /subscriptions/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [sub] = await db.select().from(subscriptionsTable).where(
      and(eq(subscriptionsTable.userId, req.userId!), eq(subscriptionsTable.status, "active"), gt(subscriptionsTable.expiresAt, new Date()))
    ).orderBy(sql`${subscriptionsTable.expiresAt} DESC`).limit(1);

    if (!sub) {
      res.json({ success: true, data: null });
      return;
    }

    const [plan] = await db.select({ name: plansTable.name }).from(plansTable).where(eq(plansTable.id, sub.planId)).limit(1);
    const daysRemaining = Math.max(0, Math.ceil((sub.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    res.json({ success: true, data: { ...sub, planName: plan?.name ?? "Free", daysRemaining } });
  } catch (err) {
    req.log.error({ err }, "GetMySubscription error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /subscriptions/redeem
router.post("/redeem", requireAuth, async (req, res) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "Activation code is required" } });
      return;
    }

    const [activationCode] = await db.select().from(activationCodesTable).where(
      and(eq(activationCodesTable.code, code.toUpperCase()), eq(activationCodesTable.status, "active"))
    ).limit(1);

    if (!activationCode) {
      res.status(400).json({ success: false, error: { code: "INVALID_CODE", message: "Invalid or expired activation code" } });
      return;
    }

    if (activationCode.expiresAt && activationCode.expiresAt < new Date()) {
      res.status(400).json({ success: false, error: { code: "CODE_EXPIRED", message: "Activation code has expired" } });
      return;
    }

    if (activationCode.usedCount >= activationCode.maxUses) {
      res.status(400).json({ success: false, error: { code: "CODE_EXHAUSTED", message: "Activation code has been fully used" } });
      return;
    }

    // Check if already redeemed by this user
    const [existingRedemption] = await db.select().from(codeRedemptionsTable).where(and(eq(codeRedemptionsTable.codeId, activationCode.id), eq(codeRedemptionsTable.userId, req.userId!))).limit(1);
    if (existingRedemption) {
      res.status(400).json({ success: false, error: { code: "ALREADY_REDEEMED", message: "You have already redeemed this code" } });
      return;
    }

    const expiresAt = new Date(Date.now() + activationCode.durationDays * 24 * 60 * 60 * 1000);
    const [subscription] = await db.insert(subscriptionsTable).values({
      userId: req.userId!,
      planId: activationCode.planId,
      status: "active",
      source: "activation_code",
      startsAt: new Date(),
      expiresAt,
    }).returning();

    await db.insert(codeRedemptionsTable).values({ codeId: activationCode.id, userId: req.userId!, subscriptionId: subscription.id });
    await db.update(activationCodesTable).set({ usedCount: activationCode.usedCount + 1, status: activationCode.usedCount + 1 >= activationCode.maxUses ? "exhausted" : "active" }).where(eq(activationCodesTable.id, activationCode.id));

    const [plan] = await db.select({ name: plansTable.name }).from(plansTable).where(eq(plansTable.id, subscription.planId)).limit(1);
    res.json({ success: true, data: { ...subscription, planName: plan?.name ?? "Plus", daysRemaining: activationCode.durationDays } });
  } catch (err) {
    req.log.error({ err }, "RedeemCode error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /subscriptions/payment
router.post("/payment", requireAuth, async (req, res) => {
  try {
    const { planId, amountMru, method, phoneNumber, transactionRef, proofUrl } = req.body as Record<string, string | number>;
    if (!planId || !amountMru || !method || !phoneNumber) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "planId, amountMru, method, and phoneNumber are required" } });
      return;
    }
    const [payment] = await db.insert(paymentsTable).values({
      userId: req.userId!,
      planId: planId as string,
      amountMru: Number(amountMru),
      method: method as "bankily" | "masrvi" | "sedad" | "cash_agent",
      status: "pending",
      phoneNumber: phoneNumber as string,
      transactionRef: transactionRef as string || null,
      proofUrl: proofUrl as string || null,
    }).returning();
    const [plan] = await db.select({ name: plansTable.name }).from(plansTable).where(eq(plansTable.id, planId as string)).limit(1);
    res.status(201).json({ success: true, data: { ...payment, planName: plan?.name ?? "Plan" } });
  } catch (err) {
    req.log.error({ err }, "SubmitPayment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /subscriptions/payments
router.get("/payments", requireAuth, async (req, res) => {
  try {
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.userId, req.userId!)).orderBy(sql`${paymentsTable.createdAt} DESC`);
    const enriched = await Promise.all(payments.map(async (p) => {
      const [plan] = await db.select({ name: plansTable.name }).from(plansTable).where(eq(plansTable.id, p.planId)).limit(1);
      return { ...p, planName: plan?.name ?? "Plan" };
    }));
    res.json({ success: true, data: enriched });
  } catch (err) {
    req.log.error({ err }, "ListMyPayments error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
