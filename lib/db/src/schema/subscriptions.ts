import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { universitiesTable } from "./academic";

// ─── PLANS ────────────────────────────────────────────────────────────────────
export const plansTable = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  nameFr: text("name_fr"),
  priceMru: integer("price_mru").notNull().default(0),
  durationDays: integer("duration_days").notNull().default(30),
  features: text("features").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active", "expired", "cancelled",
]);

export const subscriptionSourceEnum = pgEnum("subscription_source", [
  "free", "activation_code", "bankily_manual", "masrvi_manual", "sedad_manual",
  "cash_agent", "admin_manual", "b2b_university", "promo", "future_api_provider",
]);

export const subscriptionsTable = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => plansTable.id),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  source: subscriptionSourceEnum("source").notNull().default("free"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
