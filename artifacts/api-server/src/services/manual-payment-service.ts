import { randomBytes } from "crypto";
import {
  auditLogsTable,
  db,
  manualPaymentEvidenceTable,
  manualPaymentMethodsTable,
  manualPaymentReviewEventsTable,
  paymentOrdersTable,
  plansTable,
} from "@workspace/db";
import { and, desc, eq, inArray } from "drizzle-orm";

const REVIEWABLE = ["under_review", "needs_more_information"];

export async function createManualPaymentOrder(userId: string, planId: string, method: "bankily" | "masrvi" | "sedad" | "other", language: "ar" | "fr") {
  if (!["bankily", "masrvi", "sedad", "other"].includes(method)) throw new Error("UNSUPPORTED_MANUAL_PAYMENT_METHOD");
  const [[plan], [configuration], pending] = await Promise.all([
    db.select().from(plansTable).where(and(eq(plansTable.id, planId), eq(plansTable.isActive, true))).limit(1),
    db.select().from(manualPaymentMethodsTable).where(and(eq(manualPaymentMethodsTable.method, method), eq(manualPaymentMethodsTable.isEnabled, true))).limit(1),
    db.select({ id: paymentOrdersTable.id }).from(paymentOrdersTable).where(and(
      eq(paymentOrdersTable.userId, userId),
      eq(paymentOrdersTable.paymentMode, "manual"),
      inArray(paymentOrdersTable.status, ["created", "pending", "processing"]),
    )).limit(3),
  ]);
  if (!plan || plan.priceMru <= 0) throw new Error("PLAN_NOT_FOUND");
  if (!configuration) throw new Error("PAYMENT_METHOD_UNAVAILABLE");
  if (pending.length >= 3) throw new Error("TOO_MANY_PENDING_PAYMENT_ORDERS");
  if (configuration.minimumAmountMru != null && plan.priceMru < configuration.minimumAmountMru) throw new Error("AMOUNT_BELOW_METHOD_MINIMUM");
  if (configuration.maximumAmountMru != null && plan.priceMru > configuration.maximumAmountMru) throw new Error("AMOUNT_ABOVE_METHOD_MAXIMUM");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const clientReference = `JMT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(5).toString("hex").toUpperCase()}`;
  const [order] = await db.insert(paymentOrdersTable).values({
    userId,
    planId: plan.id,
    amountMru: plan.priceMru,
    currency: "MRU",
    provider: "manual",
    paymentMode: "manual",
    manualPaymentMethod: method,
    manualReviewStatus: "awaiting_evidence",
    clientReference,
    status: "pending",
    expiresAt,
    metadata: { recipientAccount: configuration.recipientAccount, configurationId: configuration.id },
  }).returning();
  return {
    ...order,
    planName: language === "fr" ? (plan.nameFr || plan.name) : (plan.nameAr || plan.name),
    recipientName: configuration.recipientDisplayName,
    recipientAccount: configuration.recipientAccount,
    instructions: language === "fr" ? configuration.instructionsFr : configuration.instructionsAr,
    evidenceRequired: configuration.evidenceRequired,
    transactionReferenceRequired: configuration.transactionReferenceRequired,
  };
}

export async function attachManualEvidence(userId: string, paymentOrderId: string, stored: { storageKey: string; mimeType: string; sizeBytes: number; sha256: string; originalName: string }) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.id, paymentOrderId)).for("update").limit(1);
    if (!order || order.userId !== userId) throw new Error("PAYMENT_ORDER_NOT_FOUND");
    if (order.paymentMode !== "manual" || order.status !== "pending") throw new Error("PAYMENT_ORDER_NOT_UPLOADABLE");
    if (!(["awaiting_evidence", "needs_more_information"] as string[]).includes(order.manualReviewStatus)) throw new Error("EVIDENCE_REPLACEMENT_NOT_ALLOWED");
    if (order.expiresAt <= new Date()) throw new Error("PAYMENT_ORDER_EXPIRED");
    const duplicate = await tx.select({ id: manualPaymentEvidenceTable.id, paymentOrderId: manualPaymentEvidenceTable.paymentOrderId }).from(manualPaymentEvidenceTable).where(eq(manualPaymentEvidenceTable.sha256, stored.sha256)).limit(1);
    const [evidence] = await tx.insert(manualPaymentEvidenceTable).values({
      paymentOrderId: order.id,
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      sha256: stored.sha256,
      originalName: stored.originalName,
      submittedBy: userId,
    }).returning();
    await tx.update(paymentOrdersTable).set({ evidenceStorageKey: stored.storageKey, evidenceMimeType: stored.mimeType, evidenceUploadedAt: new Date(), evidenceHash: stored.sha256, updatedAt: new Date(), metadata: { ...(order.metadata as object), duplicateEvidence: duplicate.length > 0 } }).where(eq(paymentOrdersTable.id, order.id));
    return { evidenceId: evidence.id, duplicateEvidence: duplicate.length > 0 };
  });
}

export async function submitManualEvidenceDetails(userId: string, paymentOrderId: string, input: { evidenceId: string; senderName?: string; senderPhone: string; transactionReference?: string; paymentDate?: Date; note?: string }) {
  if (!input.senderPhone.trim()) throw new Error("SENDER_PHONE_REQUIRED");
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.id, paymentOrderId)).for("update").limit(1);
    if (!order || order.userId !== userId) throw new Error("PAYMENT_ORDER_NOT_FOUND");
    if (order.paymentMode !== "manual" || order.status !== "pending" || !["awaiting_evidence", "needs_more_information"].includes(order.manualReviewStatus)) throw new Error("PAYMENT_ORDER_NOT_SUBMITTABLE");
    if (order.expiresAt <= new Date()) throw new Error("PAYMENT_ORDER_EXPIRED");
    const [evidence] = await tx.select().from(manualPaymentEvidenceTable).where(and(eq(manualPaymentEvidenceTable.id, input.evidenceId), eq(manualPaymentEvidenceTable.paymentOrderId, order.id), eq(manualPaymentEvidenceTable.submittedBy, userId))).limit(1);
    if (!evidence || evidence.storageKey !== order.evidenceStorageKey) throw new Error("PAYMENT_EVIDENCE_NOT_FOUND");
    await tx.update(manualPaymentEvidenceTable).set({ submittedSenderName: input.senderName?.trim() || null, submittedSenderPhone: input.senderPhone.trim(), submittedTransactionReference: input.transactionReference?.trim() || null, submittedPaymentDate: input.paymentDate ?? null, note: input.note?.trim() || null }).where(eq(manualPaymentEvidenceTable.id, evidence.id));
    const [updated] = await tx.update(paymentOrdersTable).set({ submittedSenderName: input.senderName?.trim() || null, submittedSenderPhone: input.senderPhone.trim(), submittedTransactionReference: input.transactionReference?.trim() || null, submittedPaymentDate: input.paymentDate ?? null, manualReviewStatus: "under_review", updatedAt: new Date() }).where(eq(paymentOrdersTable.id, order.id)).returning();
    return updated;
  });
}

export async function reviewManualPayment(paymentOrderId: string, actorId: string, action: "request_more_information" | "reject", reason: string, ipAddress?: string) {
  if (!reason.trim()) throw new Error("REVIEW_REASON_REQUIRED");
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.id, paymentOrderId)).for("update").limit(1);
    if (!order) throw new Error("PAYMENT_ORDER_NOT_FOUND");
    if (order.paymentMode !== "manual" || order.status !== "pending" || !REVIEWABLE.includes(order.manualReviewStatus)) throw new Error("PAYMENT_ORDER_NOT_REVIEWABLE");
    const next = action === "reject" ? "rejected" : "needs_more_information";
    const [updated] = await tx.update(paymentOrdersTable).set({ manualReviewStatus: next, status: action === "reject" ? "failed" : "pending", reviewedBy: actorId, reviewedAt: new Date(), rejectionReason: action === "reject" ? reason.trim() : null, verificationNote: reason.trim(), updatedAt: new Date() }).where(eq(paymentOrdersTable.id, order.id)).returning();
    await tx.insert(manualPaymentReviewEventsTable).values({ paymentOrderId: order.id, actorId, action, oldStatus: order.manualReviewStatus, newStatus: next, reason: reason.trim() });
    await tx.insert(auditLogsTable).values({ userId: actorId, action: `payments.manual.${action}`, targetType: "payment_order", targetId: order.id, metadata: { oldStatus: order.manualReviewStatus, newStatus: next, reason: reason.trim() }, ipAddress });
    return updated;
  });
}
