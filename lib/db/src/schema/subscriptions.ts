import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  pgEnum,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { universitiesTable } from "./academic";

// ─── PLANS ────────────────────────────────────────────────────────────────────
export const plansTable = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  nameFr: text("name_fr"),
  descriptionAr: text("description_ar"),
  descriptionFr: text("description_fr"),
  priceMru: integer("price_mru").notNull().default(0),
  durationDays: integer("duration_days").notNull().default(30),
  features: text("features").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planEntitlementsTable = pgTable("plan_entitlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => plansTable.id, { onDelete: "cascade" }),
  entitlementKey: text("entitlement_key").notNull(),
  limitValue: integer("limit_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("plan_entitlements_plan_key_unique").on(table.planId, table.entitlementKey),
]);

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "pending", "active", "grace_period", "expired", "cancelled", "revoked",
]);

export const subscriptionSourceEnum = pgEnum("subscription_source", [
  "free", "activation_code", "bankily_manual", "masrvi_manual", "sedad_manual",
  "cash_agent", "admin_manual", "b2b_university", "promo", "future_api_provider",
  "online_payment", "admin_grant", "agent_sale", "migration",
  "verified_provider_payment", "verified_manual_payment", "admin_complimentary_grant",
]);

export const subscriptionsTable = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => plansTable.id),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  source: subscriptionSourceEnum("source").notNull().default("free"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  gracePeriodEndsAt: timestamp("grace_period_ends_at", { withTimezone: true }),
  autoRenew: boolean("auto_renew").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentOrderStatusEnum = pgEnum("payment_order_status", ["created", "pending", "processing", "paid", "failed", "cancelled", "expired", "refunded"]);
export const paymentModeEnum = pgEnum("payment_mode", ["provider", "manual"]);
export const manualPaymentMethodEnum = pgEnum("manual_payment_method", ["bankily", "masrvi", "sedad", "other"]);
export const manualReviewStatusEnum = pgEnum("manual_review_status", ["not_required", "awaiting_evidence", "under_review", "needs_more_information", "verified", "rejected", "expired"]);

export const paymentOrdersTable = pgTable("payment_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  planId: uuid("plan_id").notNull().references(() => plansTable.id),
  amountMru: integer("amount_mru").notNull(),
  currency: text("currency").notNull().default("MRU"),
  provider: text("provider").notNull(),
  paymentMode: paymentModeEnum("payment_mode").notNull().default("provider"),
  manualPaymentMethod: manualPaymentMethodEnum("manual_payment_method"),
  manualReviewStatus: manualReviewStatusEnum("manual_review_status").notNull().default("not_required"),
  providerReference: text("provider_reference"),
  clientReference: text("client_reference").notNull().unique(),
  status: paymentOrderStatusEnum("status").notNull().default("created"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  submittedSenderName: text("submitted_sender_name"),
  submittedSenderPhone: text("submitted_sender_phone"),
  submittedTransactionReference: text("submitted_transaction_reference"),
  submittedPaymentDate: timestamp("submitted_payment_date", { withTimezone: true }),
  evidenceStorageKey: text("evidence_storage_key"),
  evidenceMimeType: text("evidence_mime_type"),
  evidenceUploadedAt: timestamp("evidence_uploaded_at", { withTimezone: true }),
  evidenceHash: text("evidence_hash"),
  reviewedBy: uuid("reviewed_by").references(() => usersTable.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  verificationNote: text("verification_note"),
  verifiedReceivedAmountMru: integer("verified_received_amount_mru"),
  verifiedTransactionReference: text("verified_transaction_reference"),
  verifiedRecipientAccount: text("verified_recipient_account"),
  manualVerificationSource: text("manual_verification_source"),
  failureCode: text("failure_code"),
  failureMessage: text("failure_message"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("payment_orders_provider_reference_unique").on(table.provider, table.providerReference),
  index("payment_orders_user_status_idx").on(table.userId, table.status),
  uniqueIndex("payment_orders_manual_verified_reference_unique").on(table.manualPaymentMethod, table.verifiedTransactionReference),
  index("payment_orders_manual_review_idx").on(table.paymentMode, table.manualReviewStatus),
]);

export const manualPaymentMethodsTable = pgTable("manual_payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  method: text("method").notNull().unique(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  recipientDisplayName: text("recipient_display_name").notNull(),
  recipientAccount: text("recipient_account").notNull(),
  instructionsAr: text("instructions_ar").notNull(),
  instructionsFr: text("instructions_fr").notNull(),
  minimumAmountMru: integer("minimum_amount_mru"),
  maximumAmountMru: integer("maximum_amount_mru"),
  evidenceRequired: boolean("evidence_required").notNull().default(true),
  transactionReferenceRequired: boolean("transaction_reference_required").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  maintenanceMessageAr: text("maintenance_message_ar"),
  maintenanceMessageFr: text("maintenance_message_fr"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const manualPaymentEvidenceTable = pgTable("manual_payment_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentOrderId: uuid("payment_order_id").notNull().references(() => paymentOrdersTable.id),
  storageKey: text("storage_key").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256").notNull(),
  originalName: text("original_name").notNull(),
  submittedBy: uuid("submitted_by").notNull().references(() => usersTable.id),
  submittedSenderName: text("submitted_sender_name"),
  submittedSenderPhone: text("submitted_sender_phone"),
  submittedTransactionReference: text("submitted_transaction_reference"),
  submittedPaymentDate: timestamp("submitted_payment_date", { withTimezone: true }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("manual_payment_evidence_order_idx").on(table.paymentOrderId),
  index("manual_payment_evidence_hash_idx").on(table.sha256),
]);

export const manualPaymentReviewEventsTable = pgTable("manual_payment_review_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentOrderId: uuid("payment_order_id").notNull().references(() => paymentOrdersTable.id),
  actorId: uuid("actor_id").notNull().references(() => usersTable.id),
  action: text("action").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  reason: text("reason"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("manual_payment_review_events_order_idx").on(table.paymentOrderId)]);

export const paymentTransactionsTable = pgTable("payment_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentOrderId: uuid("payment_order_id").notNull().references(() => paymentOrdersTable.id),
  provider: text("provider").notNull(),
  providerTransactionId: text("provider_transaction_id").notNull(),
  transactionType: text("transaction_type").notNull(),
  amountMru: integer("amount_mru").notNull(),
  status: text("status").notNull(),
  providerPayloadRedacted: jsonb("provider_payload_redacted").notNull().default({}),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("payment_transactions_provider_id_unique").on(table.provider, table.providerTransactionId),
]);

export const paymentWebhookEventsTable = pgTable("payment_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  externalEventId: text("external_event_id").notNull(),
  eventType: text("event_type").notNull(),
  signatureValid: boolean("signature_valid").notNull(),
  payloadHash: text("payload_hash").notNull(),
  processingStatus: text("processing_status").notNull().default("received"),
  failureReason: text("failure_reason"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("payment_webhook_events_provider_event_unique").on(table.provider, table.externalEventId),
]);

export const subscriptionEventsTable = pgTable("subscription_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscriptionsTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  paymentOrderId: uuid("payment_order_id").references(() => paymentOrdersTable.id),
  eventType: text("event_type").notNull(),
  actorType: text("actor_type").notNull(),
  actorId: uuid("actor_id").references(() => usersTable.id),
  oldState: jsonb("old_state"),
  newState: jsonb("new_state").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("subscription_events_payment_activation_unique").on(table.paymentOrderId, table.eventType),
]);

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export const paymentMethodEnum = pgEnum("payment_method", [
  "bankily", "masrvi", "sedad", "cash_agent",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending", "under_review", "approved", "rejected", "expired", "refunded",
]);

export const paymentsTable = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  planId: uuid("plan_id").notNull().references(() => plansTable.id),
  amountMru: integer("amount_mru").notNull(),
  method: paymentMethodEnum("method").notNull(),
  status: paymentStatusEnum("payment_status").notNull().default("pending"),
  phoneNumber: text("phone_number"),
  transactionRef: text("transaction_ref"),
  proofUrl: text("proof_url"),
  reviewedBy: uuid("reviewed_by").references(() => usersTable.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── ACTIVATION CODES ─────────────────────────────────────────────────────────
export const codeStatusEnum = pgEnum("code_status", [
  "active", "exhausted", "expired", "revoked",
]);

export const activationCodesTable = pgTable("activation_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  planId: uuid("plan_id").notNull().references(() => plansTable.id),
  durationDays: integer("duration_days").notNull(),
  maxUses: integer("max_uses").notNull().default(1),
  usedCount: integer("used_count").notNull().default(0),
  status: codeStatusEnum("status").notNull().default("active"),
  agentId: uuid("agent_id"),
  universityId: uuid("university_id").references(() => universitiesTable.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdBy: uuid("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const codeRedemptionsTable = pgTable("code_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  codeId: uuid("code_id").notNull().references(() => activationCodesTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  subscriptionId: uuid("subscription_id").references(() => subscriptionsTable.id),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── AGENTS ───────────────────────────────────────────────────────────────────
export const agentStatusEnum = pgEnum("agent_status", ["active", "suspended", "inactive"]);

export const agentsTable = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  universityId: uuid("university_id").references(() => universitiesTable.id),
  city: text("city").notNull().default("Nouakchott"),
  commissionRate: integer("commission_rate").notNull().default(20),
  status: agentStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentCommissionsTable = pgTable("agent_commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => agentsTable.id),
  codeRedemptionId: uuid("code_redemption_id").notNull().references(() => codeRedemptionsTable.id),
  amountMru: integer("amount_mru").notNull(),
  status: text("status").notNull().default("pending"),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlanSchema = createInsertSchema(plansTable).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export const insertActivationCodeSchema = createInsertSchema(activationCodesTable).omit({ id: true, createdAt: true });

export type Plan = typeof plansTable.$inferSelect;
export type Subscription = typeof subscriptionsTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
export type ActivationCode = typeof activationCodesTable.$inferSelect;
export type Agent = typeof agentsTable.$inferSelect;
