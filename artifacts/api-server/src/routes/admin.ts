import { Router } from "express";
import {
  db,
  usersTable,
  profilesTable,
  universitiesTable,
  universityStatusEnum,
  facultiesTable,
  coursesTable,
  filesTable,
  subscriptionsTable,
  paymentsTable,
  plansTable,
  userRoleEnum,
  paymentStatusEnum,
} from "@workspace/db";
import { eq, and, gt, count, sql, ilike } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.use(requireAuth, requireRole("super_admin"));

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

const paymentMethodToSubscriptionSource = {
  bankily: "bankily_manual",
  masrvi: "masrvi_manual",
  sedad: "sedad_manual",
  cash_agent: "cash_agent",
} as const;

// GET /admin/dashboard/stats
router.get("/dashboard/stats", async (req, res) => {
  try {
    const [[totalUsers], [totalStudents], [totalUniversities], [totalCourses], [totalFiles], [activeSubscriptions]] = await Promise.all([
      db.select({ count: count() }).from(usersTable),
      db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "student")),
      db.select({ count: count() }).from(universitiesTable),
      db.select({ count: count() }).from(coursesTable),
      db.select({ count: count() }).from(filesTable).where(eq(filesTable.isDeleted, false)),
      db.select({ count: count() }).from(subscriptionsTable).where(and(eq(subscriptionsTable.status, "active"), gt(subscriptionsTable.expiresAt, new Date()))),
    ]);
    res.json({
      success: true,
      data: {
        totalUsers: totalUsers?.count ?? 0,
        totalStudents: totalStudents?.count ?? 0,
        totalUniversities: totalUniversities?.count ?? 0,
        totalCourses: totalCourses?.count ?? 0,
        totalFiles: totalFiles?.count ?? 0,
        activeSubscriptions: activeSubscriptions?.count ?? 0,
      },
    });
  } catch (err) {
    req.log.error({ err }, "AdminDashboardStats error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /admin/users
router.get("/users", async (req, res) => {
  try {
    const { role } = req.query as { role?: string };
    const validRoles = userRoleEnum.enumValues;
    if (role && !(validRoles as readonly string[]).includes(role)) {
      res.status(400).json({ success: false, error: { code: "INVALID_ROLE", message: "Unknown role filter" } });
      return;
    }
    const users = role
      ? await db.select().from(usersTable).where(eq(usersTable.role, role as (typeof validRoles)[number])).orderBy(usersTable.createdAt)
      : await db.select().from(usersTable).orderBy(usersTable.createdAt);
    res.json({ success: true, data: users.map(safeUser) });
  } catch (err) {
    req.log.error({ err }, "AdminListUsers error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// ─── UNIVERSITIES ──────────────────────────────────────────────────────────

const UNIVERSITY_STATUSES = universityStatusEnum.enumValues;
type UniversityStatus = (typeof UNIVERSITY_STATUSES)[number];

function cleanOptionalText(value: unknown): string | null | undefined {
  // undefined => field omitted (leave unchanged on PATCH); null/"" => explicit clear
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function universityWithFacultyCount(u: typeof universitiesTable.$inferSelect) {
  const [row] = await db.select({ c: count() }).from(facultiesTable).where(eq(facultiesTable.universityId, u.id));
  return { ...u, facultyCount: row?.c ?? 0 };
}

// GET /admin/universities
router.get("/universities", async (req, res) => {
  try {
    const { search, status } = req.query as { search?: string; status?: string };
    if (status && !(UNIVERSITY_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "Unknown status filter" } });
      return;
    }
    const conditions = [];
    if (search) conditions.push(ilike(universitiesTable.name, `%${search}%`));
    if (status) conditions.push(eq(universitiesTable.status, status as UniversityStatus));
    const rows = conditions.length > 0
      ? await db.select().from(universitiesTable).where(and(...conditions)).orderBy(universitiesTable.name)
      : await db.select().from(universitiesTable).orderBy(universitiesTable.name);
    const data = await Promise.all(rows.map(universityWithFacultyCount));
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "AdminListUniversities error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/universities
router.post("/universities", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "University name is required" } });
      return;
    }
    let status: UniversityStatus = "community_created";
    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !(UNIVERSITY_STATUSES as readonly string[]).includes(body.status)) {
        res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "Invalid university status" } });
        return;
      }
      status = body.status as UniversityStatus;
    }
    const city = cleanOptionalText(body.city);
    const [created] = await db.insert(universitiesTable).values({
      name,
      nameAr: cleanOptionalText(body.nameAr) ?? null,
      nameFr: cleanOptionalText(body.nameFr) ?? null,
      city: city && city.length > 0 ? city : "Nouakchott",
      logoUrl: cleanOptionalText(body.logoUrl) ?? null,
      status,
    }).returning();
    res.status(201).json({ success: true, data: await universityWithFacultyCount(created) });
  } catch (err) {
    req.log.error({ err }, "AdminCreateUniversity error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/universities/:universityId
router.patch("/universities/:universityId", async (req, res) => {
  try {
    const { universityId } = req.params as { universityId: string };
    const [existing] = await db.select().from(universitiesTable).where(eq(universitiesTable.id, universityId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "University not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        res.status(400).json({ success: false, error: { code: "INVALID_NAME", message: "University name cannot be empty" } });
        return;
      }
      update.name = name;
    }
    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !(UNIVERSITY_STATUSES as readonly string[]).includes(body.status)) {
        res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "Invalid university status" } });
        return;
      }
      update.status = body.status as UniversityStatus;
    }
    if (body.city !== undefined) {
      const city = cleanOptionalText(body.city);
      update.city = city && city.length > 0 ? city : "Nouakchott";
    }
    if (body.nameAr !== undefined) update.nameAr = cleanOptionalText(body.nameAr);
    if (body.nameFr !== undefined) update.nameFr = cleanOptionalText(body.nameFr);
    if (body.logoUrl !== undefined) update.logoUrl = cleanOptionalText(body.logoUrl);

    const [updated] = await db.update(universitiesTable).set(update).where(eq(universitiesTable.id, universityId)).returning();
    res.json({ success: true, data: await universityWithFacultyCount(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateUniversity error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/universities/:universityId
// Safe delete: refuse when the university still has faculties (which would
// cascade-wipe the whole academic tree) or is referenced by any student profile.
router.delete("/universities/:universityId", async (req, res) => {
  try {
    const { universityId } = req.params as { universityId: string };
    const [existing] = await db.select().from(universitiesTable).where(eq(universitiesTable.id, universityId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "University not found" } });
      return;
    }

    const [facultyRow] = await db.select({ c: count() }).from(facultiesTable).where(eq(facultiesTable.universityId, universityId));
    if ((facultyRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_FACULTIES", message: "Cannot delete a university that still has faculties. Remove its faculties first." } });
      return;
    }
    const [profileRow] = await db.select({ c: count() }).from(profilesTable).where(eq(profilesTable.universityId, universityId));
    if ((profileRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_MEMBERS", message: "Cannot delete a university that still has members." } });
      return;
    }

    await db.delete(universitiesTable).where(eq(universitiesTable.id, universityId));
    res.json({ success: true, data: { id: universityId } });
  } catch (err) {
    req.log.error({ err }, "AdminDeleteUniversity error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /admin/payments
router.get("/payments", async (req, res) => {
  try {
    const { status } = req.query as { status?: string };
    const validStatuses = paymentStatusEnum.enumValues;
    if (status && !(validStatuses as readonly string[]).includes(status)) {
      res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "Unknown status filter" } });
      return;
    }
    const payments = status
      ? await db.select().from(paymentsTable).where(eq(paymentsTable.status, status as (typeof validStatuses)[number])).orderBy(sql`${paymentsTable.createdAt} DESC`)
      : await db.select().from(paymentsTable).orderBy(sql`${paymentsTable.createdAt} DESC`);

    const enriched = await Promise.all(payments.map(async (p) => {
      const [plan] = await db.select({ name: plansTable.name }).from(plansTable).where(eq(plansTable.id, p.planId)).limit(1);
      const [user] = await db.select({ email: usersTable.email, fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, p.userId)).limit(1);
      return { ...p, planName: plan?.name ?? "Plan", userEmail: user?.email ?? null, userFullName: user?.fullName ?? null };
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    req.log.error({ err }, "AdminListPayments error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/payments/:paymentId/approve
router.post("/payments/:paymentId/approve", async (req, res) => {
  try {
    const { paymentId } = req.params as { paymentId: string };
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, paymentId)).limit(1);
    if (!payment) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Payment not found" } });
      return;
    }
    if (payment.status !== "pending" && payment.status !== "under_review") {
      res.status(400).json({ success: false, error: { code: "INVALID_STATE", message: `Payment already ${payment.status}` } });
      return;
    }

    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, payment.planId)).limit(1);
    if (!plan) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Plan not found" } });
      return;
    }

    const [updatedPayment] = await db.update(paymentsTable).set({
      status: "approved",
      reviewedBy: req.userId!,
      reviewedAt: new Date(),
    }).where(eq(paymentsTable.id, paymentId)).returning();

    const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
    const [subscription] = await db.insert(subscriptionsTable).values({
      userId: payment.userId,
      planId: payment.planId,
      status: "active",
      source: paymentMethodToSubscriptionSource[payment.method],
      startsAt: new Date(),
      expiresAt,
    }).returning();

    const daysRemaining = Math.max(0, Math.ceil((subscription.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      data: {
        payment: { ...updatedPayment, planName: plan.name },
        subscription: { ...subscription, planName: plan.name, daysRemaining },
      },
    });
  } catch (err) {
    req.log.error({ err }, "AdminApprovePayment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/payments/:paymentId/reject
router.post("/payments/:paymentId/reject", async (req, res) => {
  try {
    const { paymentId } = req.params as { paymentId: string };
    const { rejectionReason } = req.body as { rejectionReason?: string };
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, paymentId)).limit(1);
    if (!payment) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Payment not found" } });
      return;
    }
    if (payment.status !== "pending" && payment.status !== "under_review") {
      res.status(400).json({ success: false, error: { code: "INVALID_STATE", message: `Payment already ${payment.status}` } });
      return;
    }

    const [updatedPayment] = await db.update(paymentsTable).set({
      status: "rejected",
      reviewedBy: req.userId!,
      reviewedAt: new Date(),
      rejectionReason: rejectionReason ?? null,
    }).where(eq(paymentsTable.id, paymentId)).returning();

    const [plan] = await db.select({ name: plansTable.name }).from(plansTable).where(eq(plansTable.id, payment.planId)).limit(1);

    res.json({ success: true, data: { ...updatedPayment, planName: plan?.name ?? "Plan" } });
  } catch (err) {
    req.log.error({ err }, "AdminRejectPayment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
