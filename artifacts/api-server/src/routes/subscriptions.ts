import { Router, type Request, type RequestHandler, type Response } from "express";
import { db, plansTable, subscriptionsTable, paymentsTable, paymentOrdersTable, activationCodesTable, codeRedemptionsTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { resolveEntitlements } from "../services/subscription-service";
import { attachManualEvidence, createManualPaymentOrder, submitManualEvidenceDetails } from "../services/manual-payment-service";
import { storeManualPaymentEvidence } from "../lib/manual-payment-evidence";
import { UploadError } from "../lib/admin-upload";
import { rateLimit } from "express-rate-limit";

const router = Router();
const evidenceUploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 6, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => req.userId ?? req.ip ?? "anonymous" }) as unknown as RequestHandler;

function paymentError(req: Request, res: Response, err: unknown, context: string) {
  const code = err instanceof Error ? err.message : "SERVER_ERROR";
  const status = code.endsWith("NOT_FOUND") ? 404 : code.includes("TOO_MANY") ? 429 : code.includes("EXPIRED") || code.includes("NOT_") || code.includes("REPLACEMENT") ? 409 : 400;
  req.log?.warn?.({ err, code }, context);
  res.status(status).json({ success: false, error: { code, message: code.replace(/_/g, " ").toLowerCase() } });
}

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

router.post("/manual-payment-orders", requireAuth, async (req, res) => {
  try {
    const { planId, method, language } = req.body as { planId?: string; method?: string; language?: "ar" | "fr" };
    if (!planId || !method) throw new Error("MISSING_FIELDS");
    const order = await createManualPaymentOrder(req.userId!, planId, method as "bankily" | "masrvi" | "sedad" | "other", language === "fr" ? "fr" : "ar");
    res.status(201).json({ success: true, data: order });
  } catch (err) { paymentError(req, res, err, "CreateManualPaymentOrder error"); }
});

router.post("/manual-payment-orders/:paymentOrderId/evidence", requireAuth, evidenceUploadLimiter, async (req, res) => {
  try {
    if (!req.is("multipart/form-data")) throw new UploadError(415, "UNSUPPORTED_MEDIA_TYPE", "Expected multipart/form-data");
    const [ownedOrder] = await db.select({ id: paymentOrdersTable.id }).from(paymentOrdersTable).where(and(eq(paymentOrdersTable.id, String(req.params.paymentOrderId)), eq(paymentOrdersTable.userId, req.userId!), eq(paymentOrdersTable.paymentMode, "manual"), eq(paymentOrdersTable.status, "pending"))).limit(1);
    if (!ownedOrder) throw new Error("PAYMENT_ORDER_NOT_FOUND");
    const stored = await storeManualPaymentEvidence(req);
    const result = await attachManualEvidence(req.userId!, String(req.params.paymentOrderId), stored);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof UploadError) { res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } }); return; }
    paymentError(req, res, err, "UploadManualPaymentEvidence error");
  }
});

router.post("/manual-payment-orders/:paymentOrderId/submit", requireAuth, async (req, res) => {
  try {
    const body = req.body as { evidenceId?: string; senderName?: string; senderPhone?: string; transactionReference?: string; paymentDate?: string; note?: string };
    if (!body.evidenceId || !body.senderPhone) throw new Error("MISSING_FIELDS");
    const order = await submitManualEvidenceDetails(req.userId!, String(req.params.paymentOrderId), { evidenceId: body.evidenceId, senderName: body.senderName, senderPhone: body.senderPhone, transactionReference: body.transactionReference, paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined, note: body.note });
    res.status(202).json({ success: true, data: order, message: "Evidence submitted for verification. The subscription is not activated yet." });
  } catch (err) { paymentError(req, res, err, "SubmitManualPaymentEvidence error"); }
});

router.get("/manual-payment-orders", requireAuth, async (req, res) => {
  try {
    const orders = await db.select().from(paymentOrdersTable).where(and(eq(paymentOrdersTable.userId, req.userId!), eq(paymentOrdersTable.paymentMode, "manual"))).orderBy(sql`${paymentOrdersTable.createdAt} DESC`);
    res.json({ success: true, data: orders.map(({ evidenceStorageKey: _key, ...order }) => order) });
  } catch (err) { paymentError(req, res, err, "ListManualPaymentOrders error"); }
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
    const { entitlements } = await resolveEntitlements(req.userId!);
    const daysRemaining = Math.max(0, Math.ceil((sub.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    res.json({ success: true, data: { ...sub, planName: plan?.name ?? "Free", daysRemaining, entitlements } });
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
  res.status(410).json({ success: false, error: { code: "LEGACY_PAYMENT_FLOW_DISABLED", message: "Use server-created manual payment orders and private evidence submission." } });
  return;
  /* legacy compatibility code retained temporarily for database migration reference
  try {
    const { planId, method, phoneNumber, transactionRef, proofUrl } = req.body as Record<string, string | number>;
    if (!planId || !method || !phoneNumber) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "planId, method, and phoneNumber are required" } });
      return;
    }
    const allowedMethods = ["bankily", "masrvi", "sedad", "cash_agent"] as const;
    if (!allowedMethods.includes(method as (typeof allowedMethods)[number])) {
      res.status(400).json({ success: false, error: { code: "INVALID_PAYMENT_METHOD", message: "Unsupported payment method" } });
      return;
    }
    const [plan] = await db.select().from(plansTable).where(and(eq(plansTable.id, String(planId)), eq(plansTable.isActive, true))).limit(1);
    if (!plan || plan.priceMru <= 0) {
      res.status(404).json({ success: false, error: { code: "PLAN_NOT_FOUND", message: "Active paid plan not found" } });
      return;
    }
    const [payment] = await db.insert(paymentsTable).values({
      userId: req.userId!,
      planId: plan.id,
      // This legacy row is an unverified manual claim. Client amount is ignored.
      amountMru: plan.priceMru,
      method: method as "bankily" | "masrvi" | "sedad" | "cash_agent",
      status: "pending",
      phoneNumber: phoneNumber as string,
      transactionRef: transactionRef as string || null,
      proofUrl: proofUrl as string || null,
    }).returning();
    res.status(202).json({
      success: true,
      data: { ...payment, planName: plan.name, paymentVerified: false },
      message: "Payment claim received for review. No payment has been verified and no subscription has been activated.",
    });
  } catch (err) {
    req.log.error({ err }, "SubmitPayment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
  */
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
