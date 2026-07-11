import {
  db,
  auditLogsTable,
  manualPaymentReviewEventsTable,
  paymentOrdersTable,
  paymentTransactionsTable,
  planEntitlementsTable,
  plansTable,
  subscriptionEventsTable,
  subscriptionsTable,
} from "@workspace/db";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { isManualOrderReviewable, normalizeManualTransactionReference, validateManualSettlement } from "./manual-payment-validation";

const DAY_MS = 24 * 60 * 60 * 1000;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type LockedOrder = typeof paymentOrdersTable.$inferSelect;
type Plan = typeof plansTable.$inferSelect;

export type VerifiedPaymentEvidence = {
  provider: string;
  providerReference: string;
  providerTransactionId: string;
  amountMru: number;
  currency: string;
  merchantId: string;
  expectedMerchantId: string;
  occurredAt: Date;
  redactedPayload: Record<string, unknown>;
};

export async function getEffectiveSubscription(userId: string) {
  const now = new Date();
  const [subscription] = await db.select().from(subscriptionsTable).where(and(
    eq(subscriptionsTable.userId, userId),
    inArray(subscriptionsTable.status, ["active", "grace_period"]),
    gt(subscriptionsTable.expiresAt, now),
  )).orderBy(desc(subscriptionsTable.expiresAt)).limit(1);
  return subscription ?? null;
}

export async function resolveEntitlements(userId: string) {
  const subscription = await getEffectiveSubscription(userId);
  if (!subscription) return {
    subscription: null,
    entitlements: [] as Array<{ key: string; limitValue: number | null }>,
  };

  const entitlements = await db.select({
    key: planEntitlementsTable.entitlementKey,
    limitValue: planEntitlementsTable.limitValue,
  }).from(planEntitlementsTable).where(eq(planEntitlementsTable.planId, subscription.planId));
  return { subscription, entitlements };
}

export async function canAccess(userId: string, entitlementKey: string) {
  const resolved = await resolveEntitlements(userId);
  return {
    ...resolved,
    allowed: resolved.entitlements.some((entitlement) => entitlement.key === entitlementKey),
  };
}

async function activatePaidOrder(
  tx: Transaction,
  order: LockedOrder,
  plan: Plan,
  input: {
    paidAt: Date;
    source: "verified_provider_payment" | "verified_manual_payment";
    eventType: string;
    actorType: "payment_provider" | "admin";
    actorId?: string;
  },
) {
  const now = new Date();
  const [current] = await tx.select().from(subscriptionsTable).where(and(
    eq(subscriptionsTable.userId, order.userId),
    eq(subscriptionsTable.status, "active"),
    gt(subscriptionsTable.expiresAt, now),
  )).orderBy(desc(subscriptionsTable.expiresAt)).for("update").limit(1);
  const startsAt = current?.startsAt ?? now;
  const expiresAt = new Date((current?.expiresAt ?? now).getTime() + plan.durationDays * DAY_MS);
  const [subscription] = current
    ? await tx.update(subscriptionsTable).set({ planId: plan.id, expiresAt, source: input.source, updatedAt: now }).where(eq(subscriptionsTable.id, current.id)).returning()
    : await tx.insert(subscriptionsTable).values({ userId: order.userId, planId: plan.id, status: "active", source: input.source, startsAt, expiresAt }).returning();

  const [paidOrder] = await tx.update(paymentOrdersTable).set({ status: "paid", paidAt: input.paidAt, updatedAt: now }).where(and(
    eq(paymentOrdersTable.id, order.id),
    inArray(paymentOrdersTable.status, ["created", "pending", "processing"]),
  )).returning();
  if (!paidOrder) throw new Error("PAYMENT_ORDER_ALREADY_SETTLED");

  await tx.insert(subscriptionEventsTable).values({
    subscriptionId: subscription.id,
    userId: order.userId,
    paymentOrderId: order.id,
    eventType: input.eventType,
    actorType: input.actorType,
    actorId: input.actorId,
    oldState: current ?? null,
    newState: subscription,
  });
  return subscription;
}

export type VerifyManualPaymentInput = {
  paymentOrderId: string;
  actorId: string;
  receivedAmountMru: number;
  verifiedTransactionReference: string;
  recipientAccount: string;
  receivedAt: Date;
  verificationNote: string;
  paymentMethod: "bankily" | "masrvi" | "sedad" | "other";
  verificationSource: string;
  ipAddress?: string;
};

export async function verifyManualPayment(input: VerifyManualPaymentInput) {
  const requestedReference = normalizeManualTransactionReference(input.verifiedTransactionReference);
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.id, input.paymentOrderId)).for("update").limit(1);
    if (!order) throw new Error("PAYMENT_ORDER_NOT_FOUND");
    if (order.status === "paid" && order.manualReviewStatus === "verified" && order.verifiedTransactionReference === requestedReference) {
      const [existing] = await tx.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, order.userId)).orderBy(desc(subscriptionsTable.expiresAt)).limit(1);
      if (!existing) throw new Error("PAID_ORDER_WITHOUT_SUBSCRIPTION");
      return existing;
    }
    if (order.paymentMode !== "manual") throw new Error("PAYMENT_ORDER_NOT_MANUAL");
    if (!(order.manualPaymentMethod && ["bankily", "masrvi", "sedad", "other"].includes(order.manualPaymentMethod))) throw new Error("INVALID_MANUAL_PAYMENT_METHOD");
    if (order.manualPaymentMethod !== input.paymentMethod) throw new Error("PAYMENT_METHOD_MISMATCH");
    const expectedRecipient = (order.metadata as { recipientAccount?: unknown } | null)?.recipientAccount;
    if (typeof expectedRecipient !== "string" || expectedRecipient.trim() !== input.recipientAccount.trim()) throw new Error("RECIPIENT_ACCOUNT_MISMATCH");
    if (!isManualOrderReviewable(order.status, order.manualReviewStatus)) throw new Error("PAYMENT_ORDER_NOT_REVIEWABLE");
    if (order.expiresAt <= new Date()) throw new Error("PAYMENT_ORDER_EXPIRED");
    const normalizedReference = validateManualSettlement({ expectedAmountMru: order.amountMru, receivedAmountMru: input.receivedAmountMru, currency: order.currency, transactionReference: input.verifiedTransactionReference, recipientAccount: input.recipientAccount, verificationNote: input.verificationNote, receivedAt: input.receivedAt });
    if (!order.evidenceStorageKey) throw new Error("PAYMENT_EVIDENCE_REQUIRED");

    const [plan] = await tx.select().from(plansTable).where(eq(plansTable.id, order.planId)).limit(1);
    if (!plan) throw new Error("PAYMENT_PLAN_NOT_FOUND");
    await tx.insert(paymentTransactionsTable).values({
      paymentOrderId: order.id,
      provider: `manual:${input.paymentMethod}`,
      providerTransactionId: normalizedReference,
      transactionType: "manual_payment",
      amountMru: input.receivedAmountMru,
      status: "paid",
      providerPayloadRedacted: { verificationSource: input.verificationSource, recipientAccountLast4: input.recipientAccount.slice(-4) },
      occurredAt: input.receivedAt,
    });
    const now = new Date();
    await tx.update(paymentOrdersTable).set({
      manualReviewStatus: "verified",
      reviewedBy: input.actorId,
      reviewedAt: now,
      verificationNote: input.verificationNote.trim(),
      verifiedReceivedAmountMru: input.receivedAmountMru,
      verifiedTransactionReference: normalizedReference,
      verifiedRecipientAccount: input.recipientAccount.trim(),
      manualVerificationSource: input.verificationSource.trim(),
      updatedAt: now,
    }).where(eq(paymentOrdersTable.id, order.id));
    const subscription = await activatePaidOrder(tx, order, plan, {
      paidAt: input.receivedAt,
      source: "verified_manual_payment",
      eventType: "activated_from_verified_manual_payment",
      actorType: "admin",
      actorId: input.actorId,
    });
    await tx.insert(manualPaymentReviewEventsTable).values({
      paymentOrderId: order.id,
      actorId: input.actorId,
      action: "verify_received_payment",
      oldStatus: order.manualReviewStatus,
      newStatus: "verified",
      metadata: { receivedAmountMru: input.receivedAmountMru, transactionReference: normalizedReference, subscriptionId: subscription.id },
    });
    await tx.insert(auditLogsTable).values({
      userId: input.actorId,
      action: "payments.manual.verify",
      targetType: "payment_order",
      targetId: order.id,
      metadata: { oldStatus: order.manualReviewStatus, newStatus: "verified", receivedAmountMru: input.receivedAmountMru, transactionReference: normalizedReference },
      ipAddress: input.ipAddress,
    });
    return subscription;
  });
}

/**
 * The sole online-payment activation primitive. It is intentionally not an
 * HTTP handler: only a provider adapter that has authenticated server evidence
 * may construct the input and invoke it.
 */
export async function activateFromVerifiedPayment(paymentOrderId: string, evidence: VerifiedPaymentEvidence) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.id, paymentOrderId)).for("update").limit(1);
    if (!order) throw new Error("PAYMENT_ORDER_NOT_FOUND");
    if (order.status === "paid") {
      const [existing] = await tx.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, order.userId)).orderBy(desc(subscriptionsTable.expiresAt)).limit(1);
      if (!existing) throw new Error("PAID_ORDER_WITHOUT_SUBSCRIPTION");
      return existing;
    }
    if (!(["created", "pending", "processing"] as string[]).includes(order.status)) throw new Error("PAYMENT_ORDER_INVALID_STATE");
    if (order.expiresAt <= new Date()) throw new Error("PAYMENT_ORDER_EXPIRED");
    if (order.provider !== evidence.provider || order.providerReference !== evidence.providerReference) throw new Error("PAYMENT_REFERENCE_MISMATCH");
    if (order.amountMru !== evidence.amountMru) throw new Error("PAYMENT_AMOUNT_MISMATCH");
    if (order.currency !== "MRU" || evidence.currency !== "MRU") throw new Error("PAYMENT_CURRENCY_MISMATCH");
    if (!evidence.expectedMerchantId || evidence.merchantId !== evidence.expectedMerchantId) throw new Error("PAYMENT_MERCHANT_MISMATCH");

    const [plan] = await tx.select().from(plansTable).where(eq(plansTable.id, order.planId)).limit(1);
    if (!plan) throw new Error("PAYMENT_PLAN_NOT_FOUND");

    await tx.insert(paymentTransactionsTable).values({
      paymentOrderId: order.id,
      provider: evidence.provider,
      providerTransactionId: evidence.providerTransactionId,
      transactionType: "payment",
      amountMru: evidence.amountMru,
      status: "paid",
      providerPayloadRedacted: evidence.redactedPayload,
      occurredAt: evidence.occurredAt,
    });

    return activatePaidOrder(tx, order, plan, {
      paidAt: evidence.occurredAt,
      source: "verified_provider_payment",
      eventType: "activated_from_verified_provider_payment",
      actorType: "payment_provider",
    });
  });
}
