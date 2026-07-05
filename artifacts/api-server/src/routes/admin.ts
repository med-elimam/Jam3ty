import { Router, type Response } from "express";
import {
  db,
  usersTable,
  profilesTable,
  universitiesTable,
  universityStatusEnum,
  facultiesTable,
  departmentsTable,
  levelsTable,
  studentGroupsTable,
  coursesTable,
  timetableSessionsTable,
  assignmentsTable,
  assignmentSubmissionsTable,
  examsTable,
  filesTable,
  fileTypeEnum,
  fileApprovalEnum,
  announcementsTable,
  announcementPriorityEnum,
  announcementScopeEnum,
  sessionTypeEnum,
  postsTable,
  commentsTable,
  reportsTable,
  moderationStatusEnum,
  postVisibilityEnum,
  opportunitiesTable,
  opportunityTypeEnum,
  agentsTable,
  agentStatusEnum,
  activationCodesTable,
  agentCommissionsTable,
  subscriptionsTable,
  paymentsTable,
  plansTable,
  userRoleEnum,
  paymentStatusEnum,
} from "@workspace/db";
import { eq, and, gt, count, sql, ilike, inArray } from "drizzle-orm";
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

// PATCH /admin/users/:userId — update role and/or isActive.
// A super_admin cannot demote or deactivate their own account: that could
// lock the last admin out of the console with no API path back in.
router.patch("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.role !== undefined) {
      const validRoles = userRoleEnum.enumValues;
      if (typeof body.role !== "string" || !(validRoles as readonly string[]).includes(body.role)) {
        res.status(400).json({ success: false, error: { code: "INVALID_ROLE", message: "Unknown role" } });
        return;
      }
      if (userId === req.userId && body.role !== "super_admin") {
        res.status(400).json({ success: false, error: { code: "SELF_DEMOTE", message: "You cannot remove your own super_admin role" } });
        return;
      }
      update.role = body.role as (typeof validRoles)[number];
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "isActive must be a boolean" } });
        return;
      }
      if (userId === req.userId && body.isActive === false) {
        res.status(400).json({ success: false, error: { code: "SELF_DEACTIVATE", message: "You cannot deactivate your own account" } });
        return;
      }
      update.isActive = body.isActive;
    }

    const [updated] = await db.update(usersTable).set(update).where(eq(usersTable.id, userId)).returning();
    res.json({ success: true, data: safeUser(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateUser error");
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

// ─── ACADEMIC STRUCTURE (faculties → departments → levels → groups) ───────────

// A DB-level foreign-key violation (e.g. deleting a faculty/department/level
// still referenced by an announcement, post, or timetable session scope)
// surfaces as Postgres error code 23503. Turn that into a clean 409 instead
// of a raw 500 for every delete route below.
function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23503";
}

// GET /admin/academic/faculties?universityId=
router.get("/academic/faculties", async (req, res) => {
  try {
    const { universityId } = req.query as { universityId?: string };
    const rows = universityId
      ? await db.select().from(facultiesTable).where(eq(facultiesTable.universityId, universityId)).orderBy(facultiesTable.name)
      : await db.select().from(facultiesTable).orderBy(facultiesTable.name);
    res.json({ success: true, data: rows });
  } catch (err) {
    req.log.error({ err }, "AdminListFaculties error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/academic/faculties
router.post("/academic/faculties", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const universityId = typeof body.universityId === "string" ? body.universityId.trim() : "";
    if (!name || !universityId) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "universityId and name are required" } });
      return;
    }
    const [university] = await db.select({ id: universitiesTable.id }).from(universitiesTable).where(eq(universitiesTable.id, universityId)).limit(1);
    if (!university) {
      res.status(400).json({ success: false, error: { code: "INVALID_UNIVERSITY", message: "University not found" } });
      return;
    }
    const [created] = await db.insert(facultiesTable).values({
      universityId,
      name,
      nameAr: cleanOptionalText(body.nameAr) ?? null,
      nameFr: cleanOptionalText(body.nameFr) ?? null,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    req.log.error({ err }, "AdminCreateFaculty error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/academic/faculties/:facultyId
router.patch("/academic/faculties/:facultyId", async (req, res) => {
  try {
    const { facultyId } = req.params as { facultyId: string };
    const [existing] = await db.select().from(facultiesTable).where(eq(facultiesTable.id, facultyId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Faculty not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        res.status(400).json({ success: false, error: { code: "INVALID_NAME", message: "Faculty name cannot be empty" } });
        return;
      }
      update.name = name;
    }
    if (body.nameAr !== undefined) update.nameAr = cleanOptionalText(body.nameAr);
    if (body.nameFr !== undefined) update.nameFr = cleanOptionalText(body.nameFr);

    const [updated] = await db.update(facultiesTable).set(update).where(eq(facultiesTable.id, facultyId)).returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateFaculty error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/academic/faculties/:facultyId
router.delete("/academic/faculties/:facultyId", async (req, res) => {
  try {
    const { facultyId } = req.params as { facultyId: string };
    const [existing] = await db.select().from(facultiesTable).where(eq(facultiesTable.id, facultyId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Faculty not found" } });
      return;
    }
    const [deptRow] = await db.select({ c: count() }).from(departmentsTable).where(eq(departmentsTable.facultyId, facultyId));
    if ((deptRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_DEPARTMENTS", message: "Cannot delete a faculty that still has departments. Remove its departments first." } });
      return;
    }
    const [profileRow] = await db.select({ c: count() }).from(profilesTable).where(eq(profilesTable.facultyId, facultyId));
    if ((profileRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_MEMBERS", message: "Cannot delete a faculty that still has members." } });
      return;
    }
    await db.delete(facultiesTable).where(eq(facultiesTable.id, facultyId));
    res.json({ success: true, data: { id: facultyId } });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      res.status(409).json({ success: false, error: { code: "REFERENCED", message: "This faculty is still referenced elsewhere (e.g. an announcement or post scope) and cannot be deleted." } });
      return;
    }
    req.log.error({ err }, "AdminDeleteFaculty error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /admin/academic/departments?facultyId=
router.get("/academic/departments", async (req, res) => {
  try {
    const { facultyId } = req.query as { facultyId?: string };
    const rows = facultyId
      ? await db.select().from(departmentsTable).where(eq(departmentsTable.facultyId, facultyId)).orderBy(departmentsTable.name)
      : await db.select().from(departmentsTable).orderBy(departmentsTable.name);
    res.json({ success: true, data: rows });
  } catch (err) {
    req.log.error({ err }, "AdminListDepartments error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/academic/departments
router.post("/academic/departments", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const facultyId = typeof body.facultyId === "string" ? body.facultyId.trim() : "";
    if (!name || !facultyId) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "facultyId and name are required" } });
      return;
    }
    const [faculty] = await db.select({ id: facultiesTable.id }).from(facultiesTable).where(eq(facultiesTable.id, facultyId)).limit(1);
    if (!faculty) {
      res.status(400).json({ success: false, error: { code: "INVALID_FACULTY", message: "Faculty not found" } });
      return;
    }
    const [created] = await db.insert(departmentsTable).values({
      facultyId,
      name,
      nameAr: cleanOptionalText(body.nameAr) ?? null,
      nameFr: cleanOptionalText(body.nameFr) ?? null,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    req.log.error({ err }, "AdminCreateDepartment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/academic/departments/:departmentId
router.patch("/academic/departments/:departmentId", async (req, res) => {
  try {
    const { departmentId } = req.params as { departmentId: string };
    const [existing] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, departmentId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Department not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        res.status(400).json({ success: false, error: { code: "INVALID_NAME", message: "Department name cannot be empty" } });
        return;
      }
      update.name = name;
    }
    if (body.nameAr !== undefined) update.nameAr = cleanOptionalText(body.nameAr);
    if (body.nameFr !== undefined) update.nameFr = cleanOptionalText(body.nameFr);

    const [updated] = await db.update(departmentsTable).set(update).where(eq(departmentsTable.id, departmentId)).returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateDepartment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/academic/departments/:departmentId
router.delete("/academic/departments/:departmentId", async (req, res) => {
  try {
    const { departmentId } = req.params as { departmentId: string };
    const [existing] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, departmentId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Department not found" } });
      return;
    }
    const [levelRow] = await db.select({ c: count() }).from(levelsTable).where(eq(levelsTable.departmentId, departmentId));
    if ((levelRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_LEVELS", message: "Cannot delete a department that still has levels. Remove its levels first." } });
      return;
    }
    const [courseRow] = await db.select({ c: count() }).from(coursesTable).where(eq(coursesTable.departmentId, departmentId));
    if ((courseRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_COURSES", message: "Cannot delete a department that still has courses." } });
      return;
    }
    const [profileRow] = await db.select({ c: count() }).from(profilesTable).where(eq(profilesTable.departmentId, departmentId));
    if ((profileRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_MEMBERS", message: "Cannot delete a department that still has members." } });
      return;
    }
    await db.delete(departmentsTable).where(eq(departmentsTable.id, departmentId));
    res.json({ success: true, data: { id: departmentId } });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      res.status(409).json({ success: false, error: { code: "REFERENCED", message: "This department is still referenced elsewhere and cannot be deleted." } });
      return;
    }
    req.log.error({ err }, "AdminDeleteDepartment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /admin/academic/levels?departmentId=
router.get("/academic/levels", async (req, res) => {
  try {
    const { departmentId } = req.query as { departmentId?: string };
    const rows = departmentId
      ? await db.select().from(levelsTable).where(eq(levelsTable.departmentId, departmentId)).orderBy(levelsTable.yearNumber)
      : await db.select().from(levelsTable).orderBy(levelsTable.yearNumber);
    res.json({ success: true, data: rows });
  } catch (err) {
    req.log.error({ err }, "AdminListLevels error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/academic/levels
router.post("/academic/levels", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const departmentId = typeof body.departmentId === "string" ? body.departmentId.trim() : "";
    const yearNumber = typeof body.yearNumber === "number" ? body.yearNumber : Number(body.yearNumber);
    if (!name || !departmentId || !Number.isFinite(yearNumber)) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "departmentId, name, and yearNumber are required" } });
      return;
    }
    const [department] = await db.select({ id: departmentsTable.id }).from(departmentsTable).where(eq(departmentsTable.id, departmentId)).limit(1);
    if (!department) {
      res.status(400).json({ success: false, error: { code: "INVALID_DEPARTMENT", message: "Department not found" } });
      return;
    }
    const [created] = await db.insert(levelsTable).values({ departmentId, name, yearNumber }).returning();
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    req.log.error({ err }, "AdminCreateLevel error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/academic/levels/:levelId
router.patch("/academic/levels/:levelId", async (req, res) => {
  try {
    const { levelId } = req.params as { levelId: string };
    const [existing] = await db.select().from(levelsTable).where(eq(levelsTable.id, levelId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Level not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        res.status(400).json({ success: false, error: { code: "INVALID_NAME", message: "Level name cannot be empty" } });
        return;
      }
      update.name = name;
    }
    if (body.yearNumber !== undefined) {
      const yearNumber = typeof body.yearNumber === "number" ? body.yearNumber : Number(body.yearNumber);
      if (!Number.isFinite(yearNumber)) {
        res.status(400).json({ success: false, error: { code: "INVALID_YEAR", message: "yearNumber must be a number" } });
        return;
      }
      update.yearNumber = yearNumber;
    }
    const [updated] = await db.update(levelsTable).set(update).where(eq(levelsTable.id, levelId)).returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateLevel error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/academic/levels/:levelId
router.delete("/academic/levels/:levelId", async (req, res) => {
  try {
    const { levelId } = req.params as { levelId: string };
    const [existing] = await db.select().from(levelsTable).where(eq(levelsTable.id, levelId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Level not found" } });
      return;
    }
    const [groupRow] = await db.select({ c: count() }).from(studentGroupsTable).where(eq(studentGroupsTable.levelId, levelId));
    if ((groupRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_GROUPS", message: "Cannot delete a level that still has groups. Remove its groups first." } });
      return;
    }
    const [courseRow] = await db.select({ c: count() }).from(coursesTable).where(eq(coursesTable.levelId, levelId));
    if ((courseRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_COURSES", message: "Cannot delete a level that still has courses." } });
      return;
    }
    const [profileRow] = await db.select({ c: count() }).from(profilesTable).where(eq(profilesTable.levelId, levelId));
    if ((profileRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_MEMBERS", message: "Cannot delete a level that still has members." } });
      return;
    }
    await db.delete(levelsTable).where(eq(levelsTable.id, levelId));
    res.json({ success: true, data: { id: levelId } });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      res.status(409).json({ success: false, error: { code: "REFERENCED", message: "This level is still referenced elsewhere and cannot be deleted." } });
      return;
    }
    req.log.error({ err }, "AdminDeleteLevel error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /admin/academic/groups?levelId=
router.get("/academic/groups", async (req, res) => {
  try {
    const { levelId } = req.query as { levelId?: string };
    const rows = levelId
      ? await db.select().from(studentGroupsTable).where(eq(studentGroupsTable.levelId, levelId)).orderBy(studentGroupsTable.name)
      : await db.select().from(studentGroupsTable).orderBy(studentGroupsTable.name);
    res.json({ success: true, data: rows });
  } catch (err) {
    req.log.error({ err }, "AdminListGroups error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/academic/groups
router.post("/academic/groups", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const levelId = typeof body.levelId === "string" ? body.levelId.trim() : "";
    if (!name || !levelId) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "levelId and name are required" } });
      return;
    }
    const [level] = await db.select({ id: levelsTable.id }).from(levelsTable).where(eq(levelsTable.id, levelId)).limit(1);
    if (!level) {
      res.status(400).json({ success: false, error: { code: "INVALID_LEVEL", message: "Level not found" } });
      return;
    }
    const [created] = await db.insert(studentGroupsTable).values({ levelId, name }).returning();
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    req.log.error({ err }, "AdminCreateGroup error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/academic/groups/:groupId
router.patch("/academic/groups/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params as { groupId: string };
    const [existing] = await db.select().from(studentGroupsTable).where(eq(studentGroupsTable.id, groupId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Group not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      res.status(400).json({ success: false, error: { code: "INVALID_NAME", message: "Group name cannot be empty" } });
      return;
    }
    const [updated] = await db.update(studentGroupsTable).set({ name }).where(eq(studentGroupsTable.id, groupId)).returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateGroup error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/academic/groups/:groupId
router.delete("/academic/groups/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params as { groupId: string };
    const [existing] = await db.select().from(studentGroupsTable).where(eq(studentGroupsTable.id, groupId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Group not found" } });
      return;
    }
    const [profileRow] = await db.select({ c: count() }).from(profilesTable).where(eq(profilesTable.groupId, groupId));
    if ((profileRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_MEMBERS", message: "Cannot delete a group that still has members." } });
      return;
    }
    await db.delete(studentGroupsTable).where(eq(studentGroupsTable.id, groupId));
    res.json({ success: true, data: { id: groupId } });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      res.status(409).json({ success: false, error: { code: "REFERENCED", message: "This group is still referenced elsewhere and cannot be deleted." } });
      return;
    }
    req.log.error({ err }, "AdminDeleteGroup error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// ─── COURSES ───────────────────────────────────────────────────────────────
// coursesTable.isActive is stored as text ("true"/"false") in the DB; the
// admin API exposes it as a real boolean and converts at the edges.

const COURSE_SEMESTERS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] as const;

async function courseWithProfessorName(c: typeof coursesTable.$inferSelect) {
  let professorName: string | null = null;
  if (c.professorId) {
    const [prof] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, c.professorId)).limit(1);
    professorName = prof?.fullName ?? null;
  }
  return { ...c, isActive: c.isActive === "true", professorName };
}

// GET /admin/courses?departmentId=&levelId=
router.get("/courses", async (req, res) => {
  try {
    const { departmentId, levelId } = req.query as { departmentId?: string; levelId?: string };
    const conditions = [];
    if (departmentId) conditions.push(eq(coursesTable.departmentId, departmentId));
    if (levelId) conditions.push(eq(coursesTable.levelId, levelId));
    const rows = conditions.length > 0
      ? await db.select().from(coursesTable).where(and(...conditions)).orderBy(coursesTable.name)
      : await db.select().from(coursesTable).orderBy(coursesTable.name);
    const data = await Promise.all(rows.map(courseWithProfessorName));
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "AdminListCourses error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/courses
router.post("/courses", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const departmentId = typeof body.departmentId === "string" ? body.departmentId.trim() : "";
    const levelId = typeof body.levelId === "string" ? body.levelId.trim() : "";
    if (!name || !departmentId || !levelId) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "departmentId, levelId, and name are required" } });
      return;
    }
    const [department] = await db.select({ id: departmentsTable.id }).from(departmentsTable).where(eq(departmentsTable.id, departmentId)).limit(1);
    if (!department) {
      res.status(400).json({ success: false, error: { code: "INVALID_DEPARTMENT", message: "Department not found" } });
      return;
    }
    const [level] = await db.select({ id: levelsTable.id }).from(levelsTable).where(eq(levelsTable.id, levelId)).limit(1);
    if (!level) {
      res.status(400).json({ success: false, error: { code: "INVALID_LEVEL", message: "Level not found" } });
      return;
    }
    let semester = "S1";
    if (body.semester !== undefined) {
      if (typeof body.semester !== "string" || !(COURSE_SEMESTERS as readonly string[]).includes(body.semester)) {
        res.status(400).json({ success: false, error: { code: "INVALID_SEMESTER", message: "Invalid semester" } });
        return;
      }
      semester = body.semester;
    }
    let professorId: string | null = null;
    if (body.professorId !== undefined && body.professorId !== null && body.professorId !== "") {
      const pid = String(body.professorId);
      const [prof] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, pid)).limit(1);
      if (!prof) {
        res.status(400).json({ success: false, error: { code: "INVALID_PROFESSOR", message: "Professor not found" } });
        return;
      }
      professorId = pid;
    }

    const [created] = await db.insert(coursesTable).values({
      name,
      nameAr: cleanOptionalText(body.nameAr) ?? null,
      nameFr: cleanOptionalText(body.nameFr) ?? null,
      code: cleanOptionalText(body.code) ?? null,
      description: cleanOptionalText(body.description) ?? null,
      departmentId,
      levelId,
      semester,
      professorId,
      isActive: body.isActive === false ? "false" : "true",
    }).returning();
    res.status(201).json({ success: true, data: await courseWithProfessorName(created) });
  } catch (err) {
    req.log.error({ err }, "AdminCreateCourse error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/courses/:courseId
router.patch("/courses/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params as { courseId: string };
    const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Course not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        res.status(400).json({ success: false, error: { code: "INVALID_NAME", message: "Course name cannot be empty" } });
        return;
      }
      update.name = name;
    }
    if (body.nameAr !== undefined) update.nameAr = cleanOptionalText(body.nameAr);
    if (body.nameFr !== undefined) update.nameFr = cleanOptionalText(body.nameFr);
    if (body.code !== undefined) update.code = cleanOptionalText(body.code);
    if (body.description !== undefined) update.description = cleanOptionalText(body.description);
    if (body.semester !== undefined) {
      if (typeof body.semester !== "string" || !(COURSE_SEMESTERS as readonly string[]).includes(body.semester)) {
        res.status(400).json({ success: false, error: { code: "INVALID_SEMESTER", message: "Invalid semester" } });
        return;
      }
      update.semester = body.semester;
    }
    if (body.professorId !== undefined) {
      if (body.professorId === null || body.professorId === "") {
        update.professorId = null;
      } else {
        const pid = String(body.professorId);
        const [prof] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, pid)).limit(1);
        if (!prof) {
          res.status(400).json({ success: false, error: { code: "INVALID_PROFESSOR", message: "Professor not found" } });
          return;
        }
        update.professorId = pid;
      }
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "isActive must be a boolean" } });
        return;
      }
      update.isActive = body.isActive ? "true" : "false";
    }

    const [updated] = await db.update(coursesTable).set(update).where(eq(coursesTable.id, courseId)).returning();
    res.json({ success: true, data: await courseWithProfessorName(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateCourse error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/courses/:courseId
router.delete("/courses/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params as { courseId: string };
    const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Course not found" } });
      return;
    }
    const [sessionRow] = await db.select({ c: count() }).from(timetableSessionsTable).where(eq(timetableSessionsTable.courseId, courseId));
    if ((sessionRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_SESSIONS", message: "Cannot delete a course that still has timetable sessions." } });
      return;
    }
    const [assignmentRow] = await db.select({ c: count() }).from(assignmentsTable).where(eq(assignmentsTable.courseId, courseId));
    if ((assignmentRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_ASSIGNMENTS", message: "Cannot delete a course that still has assignments." } });
      return;
    }
    const [examRow] = await db.select({ c: count() }).from(examsTable).where(eq(examsTable.courseId, courseId));
    if ((examRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_EXAMS", message: "Cannot delete a course that still has exams." } });
      return;
    }
    await db.delete(coursesTable).where(eq(coursesTable.id, courseId));
    res.json({ success: true, data: { id: courseId } });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      res.status(409).json({ success: false, error: { code: "REFERENCED", message: "This course is still referenced elsewhere (e.g. a file or post) and cannot be deleted." } });
      return;
    }
    req.log.error({ err }, "AdminDeleteCourse error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// ─── FILES ────────────────────────────────────────────────────────────────

const FILE_TYPES = fileTypeEnum.enumValues;
type FileType = (typeof FILE_TYPES)[number];
const FILE_APPROVAL_STATUSES = fileApprovalEnum.enumValues;
type FileApprovalStatus = (typeof FILE_APPROVAL_STATUSES)[number];

function cleanTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function adminFileWithDetails(file: typeof filesTable.$inferSelect) {
  const [uploader] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, file.uploadedBy)).limit(1);
  const [course] = file.courseId
    ? await db.select({ name: coursesTable.name }).from(coursesTable).where(eq(coursesTable.id, file.courseId)).limit(1)
    : [null];
  return {
    ...file,
    uploadedById: file.uploadedBy,
    uploaderName: uploader?.fullName ?? "Admin",
    courseName: course?.name ?? null,
    isFavorited: false,
  };
}

async function validateOptionalCourseId(courseId: unknown, res: Response): Promise<string | null | undefined> {
  if (courseId === undefined) return undefined;
  if (courseId === null || courseId === "") return null;
  if (typeof courseId !== "string") {
    res.status(400).json({ success: false, error: { code: "INVALID_COURSE", message: "courseId must be a string or null" } });
    return undefined;
  }
  const [course] = await db.select({ id: coursesTable.id }).from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  if (!course) {
    res.status(400).json({ success: false, error: { code: "INVALID_COURSE", message: "Course not found" } });
    return undefined;
  }
  return courseId;
}

// GET /admin/files
router.get("/files", async (req, res) => {
  try {
    const { courseId, type, status, search } = req.query as { courseId?: string; type?: string; status?: string; search?: string };
    if (type && !(FILE_TYPES as readonly string[]).includes(type)) {
      res.status(400).json({ success: false, error: { code: "INVALID_TYPE", message: "Unknown file type filter" } });
      return;
    }
    if (status && !(FILE_APPROVAL_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "Unknown approval status filter" } });
      return;
    }

    const conditions = [eq(filesTable.isDeleted, false)];
    if (courseId) conditions.push(eq(filesTable.courseId, courseId));
    if (type) conditions.push(eq(filesTable.fileType, type as FileType));
    if (status) conditions.push(eq(filesTable.approvalStatus, status as FileApprovalStatus));
    if (search) conditions.push(ilike(filesTable.title, `%${search}%`));

    const rows = await db.select().from(filesTable).where(and(...conditions)).orderBy(sql`${filesTable.createdAt} DESC`);
    const data = await Promise.all(rows.map(adminFileWithDetails));
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "AdminListFiles error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/files
router.post("/files", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl.trim() : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : "";
    if (!title || !fileUrl || !mimeType) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "title, fileUrl, and mimeType are required" } });
      return;
    }

    let fileType: FileType = "other";
    if (body.fileType !== undefined) {
      if (typeof body.fileType !== "string" || !(FILE_TYPES as readonly string[]).includes(body.fileType)) {
        res.status(400).json({ success: false, error: { code: "INVALID_TYPE", message: "Invalid file type" } });
        return;
      }
      fileType = body.fileType as FileType;
    }

    let approvalStatus: FileApprovalStatus = "approved";
    if (body.approvalStatus !== undefined) {
      if (typeof body.approvalStatus !== "string" || !(FILE_APPROVAL_STATUSES as readonly string[]).includes(body.approvalStatus)) {
        res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "Invalid approval status" } });
        return;
      }
      approvalStatus = body.approvalStatus as FileApprovalStatus;
    }

    const courseId = await validateOptionalCourseId(body.courseId, res);
    if (courseId === undefined && body.courseId !== undefined) return;
    const fileSize = typeof body.fileSize === "number" && Number.isFinite(body.fileSize) ? Math.max(0, Math.trunc(body.fileSize)) : 0;

    const [created] = await db.insert(filesTable).values({
      title,
      fileUrl,
      mimeType,
      fileType,
      fileSize,
      courseId: courseId ?? null,
      uploadedBy: req.userId!,
      approvalStatus,
      tags: cleanTags(body.tags) ?? [],
    }).returning();
    res.status(201).json({ success: true, data: await adminFileWithDetails(created) });
  } catch (err) {
    req.log.error({ err }, "AdminCreateFile error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/files/:fileId
router.patch("/files/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params as { fileId: string };
    const [existing] = await db.select().from(filesTable).where(and(eq(filesTable.id, fileId), eq(filesTable.isDeleted, false))).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "File not found" } });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        res.status(400).json({ success: false, error: { code: "INVALID_TITLE", message: "File title cannot be empty" } });
        return;
      }
      update.title = title;
    }
    if (body.fileUrl !== undefined) {
      const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl.trim() : "";
      if (!fileUrl) {
        res.status(400).json({ success: false, error: { code: "INVALID_URL", message: "fileUrl cannot be empty" } });
        return;
      }
      update.fileUrl = fileUrl;
    }
    if (body.mimeType !== undefined) {
      const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : "";
      if (!mimeType) {
        res.status(400).json({ success: false, error: { code: "INVALID_MIME", message: "mimeType cannot be empty" } });
        return;
      }
      update.mimeType = mimeType;
    }
    if (body.fileSize !== undefined) {
      if (typeof body.fileSize !== "number" || !Number.isFinite(body.fileSize) || body.fileSize < 0) {
        res.status(400).json({ success: false, error: { code: "INVALID_SIZE", message: "fileSize must be a non-negative number" } });
        return;
      }
      update.fileSize = Math.trunc(body.fileSize);
    }
    if (body.fileType !== undefined) {
      if (typeof body.fileType !== "string" || !(FILE_TYPES as readonly string[]).includes(body.fileType)) {
        res.status(400).json({ success: false, error: { code: "INVALID_TYPE", message: "Invalid file type" } });
        return;
      }
      update.fileType = body.fileType as FileType;
    }
    if (body.approvalStatus !== undefined) {
      if (typeof body.approvalStatus !== "string" || !(FILE_APPROVAL_STATUSES as readonly string[]).includes(body.approvalStatus)) {
        res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "Invalid approval status" } });
        return;
      }
      update.approvalStatus = body.approvalStatus as FileApprovalStatus;
    }
    if (body.courseId !== undefined) {
      const courseId = await validateOptionalCourseId(body.courseId, res);
      if (courseId === undefined) return;
      update.courseId = courseId;
    }
    if (body.tags !== undefined) update.tags = cleanTags(body.tags) ?? [];

    const [updated] = await db.update(filesTable).set(update).where(eq(filesTable.id, fileId)).returning();
    res.json({ success: true, data: await adminFileWithDetails(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateFile error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/files/:fileId
router.delete("/files/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params as { fileId: string };
    const [existing] = await db.select().from(filesTable).where(and(eq(filesTable.id, fileId), eq(filesTable.isDeleted, false))).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "File not found" } });
      return;
    }
    await db.update(filesTable).set({ isDeleted: true }).where(eq(filesTable.id, fileId));
    res.json({ success: true, data: { id: fileId } });
  } catch (err) {
    req.log.error({ err }, "AdminDeleteFile error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────

const ANNOUNCEMENT_PRIORITIES = announcementPriorityEnum.enumValues;
type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];
const ANNOUNCEMENT_SCOPES = announcementScopeEnum.enumValues;
type AnnouncementScope = (typeof ANNOUNCEMENT_SCOPES)[number];

async function adminAnnouncementWithDetails(announcement: typeof announcementsTable.$inferSelect) {
  const [creator] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, announcement.createdBy)).limit(1);
  const [course] = announcement.courseId
    ? await db.select({ name: coursesTable.name }).from(coursesTable).where(eq(coursesTable.id, announcement.courseId)).limit(1)
    : [null];
  return {
    ...announcement,
    createdById: announcement.createdBy,
    createdByName: creator?.fullName ?? "Admin",
    courseName: course?.name ?? null,
    isRead: false,
  };
}

async function validateAnnouncementScope(scope: AnnouncementScope, body: Record<string, unknown>, res: Response) {
  const scopedIds = {
    universityId: body.universityId === undefined ? null : body.universityId,
    facultyId: body.facultyId === undefined ? null : body.facultyId,
    departmentId: body.departmentId === undefined ? null : body.departmentId,
    levelId: body.levelId === undefined ? null : body.levelId,
    groupId: body.groupId === undefined ? null : body.groupId,
    courseId: body.courseId === undefined ? null : body.courseId,
  };
  const requiredField = scope === "global" ? null : `${scope}Id`;
  if (requiredField && !scopedIds[requiredField as keyof typeof scopedIds]) {
    res.status(400).json({ success: false, error: { code: "MISSING_SCOPE", message: `${requiredField} is required for ${scope} announcements` } });
    return null;
  }
  return {
    universityId: typeof scopedIds.universityId === "string" ? scopedIds.universityId : null,
    facultyId: typeof scopedIds.facultyId === "string" ? scopedIds.facultyId : null,
    departmentId: typeof scopedIds.departmentId === "string" ? scopedIds.departmentId : null,
    levelId: typeof scopedIds.levelId === "string" ? scopedIds.levelId : null,
    groupId: typeof scopedIds.groupId === "string" ? scopedIds.groupId : null,
    courseId: typeof scopedIds.courseId === "string" ? scopedIds.courseId : null,
  };
}

// GET /admin/announcements
router.get("/announcements", async (req, res) => {
  try {
    const { scope, priority, search } = req.query as { scope?: string; priority?: string; search?: string };
    if (scope && !(ANNOUNCEMENT_SCOPES as readonly string[]).includes(scope)) {
      res.status(400).json({ success: false, error: { code: "INVALID_SCOPE", message: "Unknown scope filter" } });
      return;
    }
    if (priority && !(ANNOUNCEMENT_PRIORITIES as readonly string[]).includes(priority)) {
      res.status(400).json({ success: false, error: { code: "INVALID_PRIORITY", message: "Unknown priority filter" } });
      return;
    }
    const conditions = [];
    if (scope) conditions.push(eq(announcementsTable.scope, scope as AnnouncementScope));
    if (priority) conditions.push(eq(announcementsTable.priority, priority as AnnouncementPriority));
    if (search) conditions.push(ilike(announcementsTable.title, `%${search}%`));
    const rows = conditions.length > 0
      ? await db.select().from(announcementsTable).where(and(...conditions)).orderBy(sql`${announcementsTable.createdAt} DESC`)
      : await db.select().from(announcementsTable).orderBy(sql`${announcementsTable.createdAt} DESC`);
    const data = await Promise.all(rows.map(adminAnnouncementWithDetails));
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "AdminListAnnouncements error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/announcements
router.post("/announcements", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!title || !content) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "title and content are required" } });
      return;
    }
    const priority = body.priority === undefined ? "normal" : body.priority;
    if (typeof priority !== "string" || !(ANNOUNCEMENT_PRIORITIES as readonly string[]).includes(priority)) {
      res.status(400).json({ success: false, error: { code: "INVALID_PRIORITY", message: "Invalid priority" } });
      return;
    }
    const scope = body.scope === undefined ? "global" : body.scope;
    if (typeof scope !== "string" || !(ANNOUNCEMENT_SCOPES as readonly string[]).includes(scope)) {
      res.status(400).json({ success: false, error: { code: "INVALID_SCOPE", message: "Invalid scope" } });
      return;
    }
    const scopedIds = await validateAnnouncementScope(scope as AnnouncementScope, body, res);
    if (!scopedIds) return;
    const expiresAt = typeof body.expiresAt === "string" && body.expiresAt.trim() ? new Date(body.expiresAt) : null;

    const [created] = await db.insert(announcementsTable).values({
      title,
      content,
      priority: priority as AnnouncementPriority,
      scope: scope as AnnouncementScope,
      ...scopedIds,
      createdBy: req.userId!,
      expiresAt,
    }).returning();
    res.status(201).json({ success: true, data: await adminAnnouncementWithDetails(created) });
  } catch (err) {
    req.log.error({ err }, "AdminCreateAnnouncement error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/announcements/:announcementId
router.patch("/announcements/:announcementId", async (req, res) => {
  try {
    const { announcementId } = req.params as { announcementId: string };
    const [existing] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, announcementId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Announcement not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const nextScope = (body.scope ?? existing.scope) as AnnouncementScope;
    if (typeof nextScope !== "string" || !(ANNOUNCEMENT_SCOPES as readonly string[]).includes(nextScope)) {
      res.status(400).json({ success: false, error: { code: "INVALID_SCOPE", message: "Invalid scope" } });
      return;
    }
    const merged = { ...existing, ...body };
    const scopedIds = await validateAnnouncementScope(nextScope, merged, res);
    if (!scopedIds) return;

    const update: Record<string, unknown> = { scope: nextScope, ...scopedIds };
    if (body.title !== undefined) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        res.status(400).json({ success: false, error: { code: "INVALID_TITLE", message: "Announcement title cannot be empty" } });
        return;
      }
      update.title = title;
    }
    if (body.content !== undefined) {
      const content = typeof body.content === "string" ? body.content.trim() : "";
      if (!content) {
        res.status(400).json({ success: false, error: { code: "INVALID_CONTENT", message: "Announcement content cannot be empty" } });
        return;
      }
      update.content = content;
    }
    if (body.priority !== undefined) {
      if (typeof body.priority !== "string" || !(ANNOUNCEMENT_PRIORITIES as readonly string[]).includes(body.priority)) {
        res.status(400).json({ success: false, error: { code: "INVALID_PRIORITY", message: "Invalid priority" } });
        return;
      }
      update.priority = body.priority as AnnouncementPriority;
    }
    if (body.expiresAt !== undefined) update.expiresAt = typeof body.expiresAt === "string" && body.expiresAt.trim() ? new Date(body.expiresAt) : null;

    const [updated] = await db.update(announcementsTable).set(update).where(eq(announcementsTable.id, announcementId)).returning();
    res.json({ success: true, data: await adminAnnouncementWithDetails(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateAnnouncement error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/announcements/:announcementId
router.delete("/announcements/:announcementId", async (req, res) => {
  try {
    const { announcementId } = req.params as { announcementId: string };
    const [existing] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, announcementId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Announcement not found" } });
      return;
    }
    await db.delete(announcementsTable).where(eq(announcementsTable.id, announcementId));
    res.json({ success: true, data: { id: announcementId } });
  } catch (err) {
    req.log.error({ err }, "AdminDeleteAnnouncement error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// ─── TIMETABLE ───────────────────────────────────────────────────────────

const SESSION_TYPES = sessionTypeEnum.enumValues;
type SessionType = (typeof SESSION_TYPES)[number];

async function adminTimetableSessionWithDetails(session: typeof timetableSessionsTable.$inferSelect) {
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, session.courseId)).limit(1);
  const [group] = session.groupId
    ? await db.select({ name: studentGroupsTable.name }).from(studentGroupsTable).where(eq(studentGroupsTable.id, session.groupId)).limit(1)
    : [null];
  const professorName = course?.professorId
    ? (await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, course.professorId)).limit(1))[0]?.fullName ?? null
    : null;
  return {
    ...session,
    courseName: course?.name ?? "Unknown Course",
    courseCode: course?.code ?? null,
    professorName,
    groupName: group?.name ?? null,
  };
}

// GET /admin/timetable
router.get("/timetable", async (req, res) => {
  try {
    const { groupId, courseId } = req.query as { groupId?: string; courseId?: string };
    const conditions = [];
    if (groupId) conditions.push(eq(timetableSessionsTable.groupId, groupId));
    if (courseId) conditions.push(eq(timetableSessionsTable.courseId, courseId));
    const rows = conditions.length > 0
      ? await db.select().from(timetableSessionsTable).where(and(...conditions)).orderBy(timetableSessionsTable.dayOfWeek, timetableSessionsTable.startTime)
      : await db.select().from(timetableSessionsTable).orderBy(timetableSessionsTable.dayOfWeek, timetableSessionsTable.startTime);
    const data = await Promise.all(rows.map(adminTimetableSessionWithDetails));
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "AdminListTimetable error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/timetable
router.post("/timetable", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
    const dayOfWeek = typeof body.dayOfWeek === "number" ? body.dayOfWeek : Number(body.dayOfWeek);
    const startTime = typeof body.startTime === "string" ? body.startTime.trim() : "";
    const endTime = typeof body.endTime === "string" ? body.endTime.trim() : "";
    if (!courseId || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !startTime || !endTime) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "courseId, dayOfWeek, startTime, and endTime are required" } });
      return;
    }
    const [course] = await db.select({ id: coursesTable.id }).from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!course) {
      res.status(400).json({ success: false, error: { code: "INVALID_COURSE", message: "Course not found" } });
      return;
    }
    let groupId: string | null = null;
    if (body.groupId !== undefined && body.groupId !== null && body.groupId !== "") {
      if (typeof body.groupId !== "string") {
        res.status(400).json({ success: false, error: { code: "INVALID_GROUP", message: "groupId must be a string or null" } });
        return;
      }
      const [group] = await db.select({ id: studentGroupsTable.id }).from(studentGroupsTable).where(eq(studentGroupsTable.id, body.groupId)).limit(1);
      if (!group) {
        res.status(400).json({ success: false, error: { code: "INVALID_GROUP", message: "Group not found" } });
        return;
      }
      groupId = body.groupId;
    }
    const type = body.type === undefined ? "lecture" : body.type;
    if (typeof type !== "string" || !(SESSION_TYPES as readonly string[]).includes(type)) {
      res.status(400).json({ success: false, error: { code: "INVALID_TYPE", message: "Invalid session type" } });
      return;
    }

    const [created] = await db.insert(timetableSessionsTable).values({
      courseId,
      groupId,
      dayOfWeek,
      startTime,
      endTime,
      room: cleanOptionalText(body.room) ?? null,
      type: type as SessionType,
      recurrence: cleanOptionalText(body.recurrence) ?? "weekly",
    }).returning();
    res.status(201).json({ success: true, data: await adminTimetableSessionWithDetails(created) });
  } catch (err) {
    req.log.error({ err }, "AdminCreateTimetable error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/timetable/:sessionId
router.patch("/timetable/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const [existing] = await db.select().from(timetableSessionsTable).where(eq(timetableSessionsTable.id, sessionId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Timetable session not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.courseId !== undefined) {
      if (typeof body.courseId !== "string" || !body.courseId.trim()) {
        res.status(400).json({ success: false, error: { code: "INVALID_COURSE", message: "courseId cannot be empty" } });
        return;
      }
      const [course] = await db.select({ id: coursesTable.id }).from(coursesTable).where(eq(coursesTable.id, body.courseId)).limit(1);
      if (!course) {
        res.status(400).json({ success: false, error: { code: "INVALID_COURSE", message: "Course not found" } });
        return;
      }
      update.courseId = body.courseId;
    }
    if (body.groupId !== undefined) {
      if (body.groupId === null || body.groupId === "") {
        update.groupId = null;
      } else if (typeof body.groupId === "string") {
        const [group] = await db.select({ id: studentGroupsTable.id }).from(studentGroupsTable).where(eq(studentGroupsTable.id, body.groupId)).limit(1);
        if (!group) {
          res.status(400).json({ success: false, error: { code: "INVALID_GROUP", message: "Group not found" } });
          return;
        }
        update.groupId = body.groupId;
      } else {
        res.status(400).json({ success: false, error: { code: "INVALID_GROUP", message: "groupId must be a string or null" } });
        return;
      }
    }
    if (body.dayOfWeek !== undefined) {
      const dayOfWeek = typeof body.dayOfWeek === "number" ? body.dayOfWeek : Number(body.dayOfWeek);
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        res.status(400).json({ success: false, error: { code: "INVALID_DAY", message: "dayOfWeek must be between 0 and 6" } });
        return;
      }
      update.dayOfWeek = dayOfWeek;
    }
    if (body.startTime !== undefined) {
      const startTime = typeof body.startTime === "string" ? body.startTime.trim() : "";
      if (!startTime) {
        res.status(400).json({ success: false, error: { code: "INVALID_TIME", message: "startTime cannot be empty" } });
        return;
      }
      update.startTime = startTime;
    }
    if (body.endTime !== undefined) {
      const endTime = typeof body.endTime === "string" ? body.endTime.trim() : "";
      if (!endTime) {
        res.status(400).json({ success: false, error: { code: "INVALID_TIME", message: "endTime cannot be empty" } });
        return;
      }
      update.endTime = endTime;
    }
    if (body.type !== undefined) {
      if (typeof body.type !== "string" || !(SESSION_TYPES as readonly string[]).includes(body.type)) {
        res.status(400).json({ success: false, error: { code: "INVALID_TYPE", message: "Invalid session type" } });
        return;
      }
      update.type = body.type as SessionType;
    }
    if (body.room !== undefined) update.room = cleanOptionalText(body.room) ?? null;
    if (body.recurrence !== undefined) update.recurrence = cleanOptionalText(body.recurrence) ?? "weekly";

    const [updated] = await db.update(timetableSessionsTable).set(update).where(eq(timetableSessionsTable.id, sessionId)).returning();
    res.json({ success: true, data: await adminTimetableSessionWithDetails(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateTimetable error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/timetable/:sessionId
router.delete("/timetable/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const [existing] = await db.select().from(timetableSessionsTable).where(eq(timetableSessionsTable.id, sessionId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Timetable session not found" } });
      return;
    }
    await db.delete(timetableSessionsTable).where(eq(timetableSessionsTable.id, sessionId));
    res.json({ success: true, data: { id: sessionId } });
  } catch (err) {
    req.log.error({ err }, "AdminDeleteTimetable error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────

async function adminAssignmentWithDetails(assignment: typeof assignmentsTable.$inferSelect) {
  const [[course], [submissionRow]] = await Promise.all([
    db.select({ name: coursesTable.name, code: coursesTable.code }).from(coursesTable).where(eq(coursesTable.id, assignment.courseId)).limit(1),
    db.select({ c: count() }).from(assignmentSubmissionsTable).where(eq(assignmentSubmissionsTable.assignmentId, assignment.id)),
  ]);
  return {
    ...assignment,
    courseName: course?.name ?? "Unknown Course",
    courseCode: course?.code ?? null,
    submissionCount: submissionRow?.c ?? 0,
  };
}

// GET /admin/assignments
router.get("/assignments", async (req, res) => {
  try {
    const { courseId, search } = req.query as { courseId?: string; search?: string };
    const conditions = [];
    if (courseId) conditions.push(eq(assignmentsTable.courseId, courseId));
    if (search) conditions.push(ilike(assignmentsTable.title, `%${search}%`));
    const rows = conditions.length > 0
      ? await db.select().from(assignmentsTable).where(and(...conditions)).orderBy(sql`${assignmentsTable.deadline} DESC`)
      : await db.select().from(assignmentsTable).orderBy(sql`${assignmentsTable.deadline} DESC`);
    const data = await Promise.all(rows.map(adminAssignmentWithDetails));
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "AdminListAssignments error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/assignments
router.post("/assignments", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
    const deadline = typeof body.deadline === "string" ? new Date(body.deadline) : null;
    if (!title || !courseId || !deadline || Number.isNaN(deadline.getTime())) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "title, courseId, and deadline are required" } });
      return;
    }
    const [course] = await db.select({ id: coursesTable.id }).from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!course) {
      res.status(400).json({ success: false, error: { code: "INVALID_COURSE", message: "Course not found" } });
      return;
    }
    const [created] = await db.insert(assignmentsTable).values({
      title,
      description: cleanOptionalText(body.description) ?? null,
      courseId,
      deadline,
      attachmentUrl: cleanOptionalText(body.attachmentUrl) ?? null,
      createdBy: req.userId!,
    }).returning();
    res.status(201).json({ success: true, data: await adminAssignmentWithDetails(created) });
  } catch (err) {
    req.log.error({ err }, "AdminCreateAssignment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/assignments/:assignmentId
router.patch("/assignments/:assignmentId", async (req, res) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const [existing] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, assignmentId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Assignment not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        res.status(400).json({ success: false, error: { code: "INVALID_TITLE", message: "Assignment title cannot be empty" } });
        return;
      }
      update.title = title;
    }
    if (body.courseId !== undefined) {
      if (typeof body.courseId !== "string" || !body.courseId.trim()) {
        res.status(400).json({ success: false, error: { code: "INVALID_COURSE", message: "courseId cannot be empty" } });
        return;
      }
      const [course] = await db.select({ id: coursesTable.id }).from(coursesTable).where(eq(coursesTable.id, body.courseId)).limit(1);
      if (!course) {
        res.status(400).json({ success: false, error: { code: "INVALID_COURSE", message: "Course not found" } });
        return;
      }
      update.courseId = body.courseId;
    }
    if (body.deadline !== undefined) {
      const deadline = typeof body.deadline === "string" ? new Date(body.deadline) : null;
      if (!deadline || Number.isNaN(deadline.getTime())) {
        res.status(400).json({ success: false, error: { code: "INVALID_DEADLINE", message: "deadline must be a valid date" } });
        return;
      }
      update.deadline = deadline;
    }
    if (body.description !== undefined) update.description = cleanOptionalText(body.description) ?? null;
    if (body.attachmentUrl !== undefined) update.attachmentUrl = cleanOptionalText(body.attachmentUrl) ?? null;

    const [updated] = await db.update(assignmentsTable).set(update).where(eq(assignmentsTable.id, assignmentId)).returning();
    res.json({ success: true, data: await adminAssignmentWithDetails(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateAssignment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/assignments/:assignmentId
router.delete("/assignments/:assignmentId", async (req, res) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const [existing] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, assignmentId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Assignment not found" } });
      return;
    }
    const [submissionRow] = await db.select({ c: count() }).from(assignmentSubmissionsTable).where(eq(assignmentSubmissionsTable.assignmentId, assignmentId));
    if ((submissionRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "HAS_SUBMISSIONS", message: "Cannot delete an assignment that already has submissions." } });
      return;
    }
    await db.delete(assignmentsTable).where(eq(assignmentsTable.id, assignmentId));
    res.json({ success: true, data: { id: assignmentId } });
  } catch (err) {
    req.log.error({ err }, "AdminDeleteAssignment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// ─── COMMUNITY ───────────────────────────────────────────────────────────────

const MODERATION_STATUSES = moderationStatusEnum.enumValues;
type ModerationStatus = (typeof MODERATION_STATUSES)[number];
const POST_VISIBILITIES = postVisibilityEnum.enumValues;
type PostVisibility = (typeof POST_VISIBILITIES)[number];

async function adminPostWithDetails(post: typeof postsTable.$inferSelect) {
  const [[author], [reportRow]] = await Promise.all([
    db.select({ fullName: usersTable.fullName, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, post.authorId)).limit(1),
    db.select({ c: count() }).from(reportsTable).where(and(eq(reportsTable.targetType, "post"), eq(reportsTable.targetId, post.id))),
  ]);
  return {
    ...post,
    authorName: author?.fullName ?? author?.email ?? "Unknown User",
    authorEmail: author?.email ?? null,
    reportCount: reportRow?.c ?? 0,
  };
}

async function adminCommentWithDetails(comment: typeof commentsTable.$inferSelect) {
  const [[author], [reportRow]] = await Promise.all([
    db.select({ fullName: usersTable.fullName, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, comment.authorId)).limit(1),
    db.select({ c: count() }).from(reportsTable).where(and(eq(reportsTable.targetType, "comment"), eq(reportsTable.targetId, comment.id))),
  ]);
  return {
    ...comment,
    authorName: author?.fullName ?? author?.email ?? "Unknown User",
    authorEmail: author?.email ?? null,
    reportCount: reportRow?.c ?? 0,
  };
}

async function adminReportWithDetails(report: typeof reportsTable.$inferSelect) {
  const [[reporter], [reviewer]] = await Promise.all([
    db.select({ fullName: usersTable.fullName, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, report.reportedBy)).limit(1),
    report.reviewedBy ? db.select({ fullName: usersTable.fullName, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, report.reviewedBy)).limit(1) : Promise.resolve([null]),
  ]);
  return {
    ...report,
    reporterName: reporter?.fullName ?? reporter?.email ?? "Unknown User",
    reviewerName: reviewer?.fullName ?? reviewer?.email ?? null,
  };
}

// GET /admin/community/posts
router.get("/community/posts", async (req, res) => {
  try {
    const { status, visibility, authorId, search, reported } = req.query as Record<string, string | undefined>;
    if (status && !(MODERATION_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "Unknown moderation status" } });
      return;
    }
    if (visibility && !(POST_VISIBILITIES as readonly string[]).includes(visibility)) {
      res.status(400).json({ success: false, error: { code: "INVALID_VISIBILITY", message: "Unknown visibility" } });
      return;
    }

    const conditions = [];
    if (status) conditions.push(eq(postsTable.moderationStatus, status as ModerationStatus));
    if (visibility) conditions.push(eq(postsTable.visibility, visibility as PostVisibility));
    if (authorId) conditions.push(eq(postsTable.authorId, authorId));
    if (search) conditions.push(ilike(postsTable.content, `%${search}%`));
    if (reported === "true") {
      const reportRows = await db.select({ targetId: reportsTable.targetId }).from(reportsTable).where(eq(reportsTable.targetType, "post"));
      const ids = reportRows.map((row) => row.targetId);
      if (ids.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }
      conditions.push(inArray(postsTable.id, ids));
    }

    const rows = conditions.length > 0
      ? await db.select().from(postsTable).where(and(...conditions)).orderBy(sql`${postsTable.createdAt} DESC`)
      : await db.select().from(postsTable).orderBy(sql`${postsTable.createdAt} DESC`);
    const data = await Promise.all(rows.map(adminPostWithDetails));
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "AdminListCommunityPosts error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/community/posts/:postId
router.patch("/community/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params as { postId: string };
    const [existing] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Post not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.moderationStatus !== undefined) {
      if (typeof body.moderationStatus !== "string" || !(MODERATION_STATUSES as readonly string[]).includes(body.moderationStatus)) {
        res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "Invalid moderation status" } });
        return;
      }
      update.moderationStatus = body.moderationStatus as ModerationStatus;
    }
    if (body.isPinned !== undefined) {
      if (typeof body.isPinned !== "boolean") {
        res.status(400).json({ success: false, error: { code: "INVALID_PIN", message: "isPinned must be a boolean" } });
        return;
      }
      update.isPinned = body.isPinned;
    }
    const [updated] = await db.update(postsTable).set(update).where(eq(postsTable.id, postId)).returning();
    res.json({ success: true, data: await adminPostWithDetails(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateCommunityPost error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/community/posts/:postId
router.delete("/community/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params as { postId: string };
    const [existing] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Post not found" } });
      return;
    }
    const [updated] = await db.update(postsTable).set({ moderationStatus: "removed", updatedAt: new Date() }).where(eq(postsTable.id, postId)).returning();
    res.json({ success: true, data: await adminPostWithDetails(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminDeleteCommunityPost error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /admin/community/comments
router.get("/community/comments", async (req, res) => {
  try {
    const { postId, authorId, search } = req.query as Record<string, string | undefined>;
    const conditions = [];
    if (postId) conditions.push(eq(commentsTable.postId, postId));
    if (authorId) conditions.push(eq(commentsTable.authorId, authorId));
    if (search) conditions.push(ilike(commentsTable.content, `%${search}%`));
    const rows = conditions.length > 0
      ? await db.select().from(commentsTable).where(and(...conditions)).orderBy(sql`${commentsTable.createdAt} DESC`)
      : await db.select().from(commentsTable).orderBy(sql`${commentsTable.createdAt} DESC`);
    const data = await Promise.all(rows.map(adminCommentWithDetails));
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "AdminListCommunityComments error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/community/comments/:commentId
router.patch("/community/comments/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params as { commentId: string };
    const [existing] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Comment not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      res.status(400).json({ success: false, error: { code: "INVALID_CONTENT", message: "Comment content cannot be empty" } });
      return;
    }
    const [updated] = await db.update(commentsTable).set({ content }).where(eq(commentsTable.id, commentId)).returning();
    res.json({ success: true, data: await adminCommentWithDetails(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateCommunityComment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/community/comments/:commentId
router.delete("/community/comments/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params as { commentId: string };
    const [existing] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Comment not found" } });
      return;
    }
    await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
    res.json({ success: true, data: { id: commentId } });
  } catch (err) {
    req.log.error({ err }, "AdminDeleteCommunityComment error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /admin/community/reports
router.get("/community/reports", async (req, res) => {
  try {
    const { status, targetType } = req.query as Record<string, string | undefined>;
    const conditions = [];
    if (status) conditions.push(eq(reportsTable.status, status));
    if (targetType) conditions.push(eq(reportsTable.targetType, targetType));
    const rows = conditions.length > 0
      ? await db.select().from(reportsTable).where(and(...conditions)).orderBy(sql`${reportsTable.createdAt} DESC`)
      : await db.select().from(reportsTable).orderBy(sql`${reportsTable.createdAt} DESC`);
    const data = await Promise.all(rows.map(adminReportWithDetails));
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "AdminListCommunityReports error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/community/reports/:reportId
router.patch("/community/reports/:reportId", async (req, res) => {
  try {
    const { reportId } = req.params as { reportId: string };
    const [existing] = await db.select().from(reportsTable).where(eq(reportsTable.id, reportId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Report not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const status = typeof body.status === "string" ? body.status.trim() : "";
    if (!status) {
      res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "status is required" } });
      return;
    }
    const [updated] = await db.update(reportsTable).set({ status, reviewedBy: req.userId! }).where(eq(reportsTable.id, reportId)).returning();
    res.json({ success: true, data: await adminReportWithDetails(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateCommunityReport error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// ─── AGENTS ──────────────────────────────────────────────────────────────────

const AGENT_STATUSES = agentStatusEnum.enumValues;
type AgentStatus = (typeof AGENT_STATUSES)[number];

async function adminAgentWithDetails(agent: typeof agentsTable.$inferSelect) {
  const [[university], [codeRow], [commissionRow]] = await Promise.all([
    agent.universityId ? db.select({ name: universitiesTable.name }).from(universitiesTable).where(eq(universitiesTable.id, agent.universityId)).limit(1) : Promise.resolve([null]),
    db.select({ c: count() }).from(activationCodesTable).where(eq(activationCodesTable.agentId, agent.id)),
    db.select({ c: count() }).from(agentCommissionsTable).where(eq(agentCommissionsTable.agentId, agent.id)),
  ]);
  return {
    ...agent,
    universityName: university?.name ?? null,
    activationCodeCount: codeRow?.c ?? 0,
    commissionCount: commissionRow?.c ?? 0,
  };
}

async function validateOptionalUniversityId(value: unknown, res: Response) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    res.status(400).json({ success: false, error: { code: "INVALID_UNIVERSITY", message: "universityId must be a string or null" } });
    return undefined;
  }
  const [university] = await db.select({ id: universitiesTable.id }).from(universitiesTable).where(eq(universitiesTable.id, value)).limit(1);
  if (!university) {
    res.status(400).json({ success: false, error: { code: "INVALID_UNIVERSITY", message: "University not found" } });
    return undefined;
  }
  return value;
}

// GET /admin/agents
router.get("/agents", async (req, res) => {
  try {
    const { status, search, universityId } = req.query as Record<string, string | undefined>;
    if (status && !(AGENT_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "Unknown agent status" } });
      return;
    }
    const conditions = [];
    if (status) conditions.push(eq(agentsTable.status, status as AgentStatus));
    if (universityId) conditions.push(eq(agentsTable.universityId, universityId));
    if (search) conditions.push(ilike(agentsTable.name, `%${search}%`));
    const rows = conditions.length > 0
      ? await db.select().from(agentsTable).where(and(...conditions)).orderBy(agentsTable.name)
      : await db.select().from(agentsTable).orderBy(agentsTable.name);
    const data = await Promise.all(rows.map(adminAgentWithDetails));
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "AdminListAgents error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/agents
router.post("/agents", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!name || !phone) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "name and phone are required" } });
      return;
    }
    const universityId = await validateOptionalUniversityId(body.universityId, res);
    if (universityId === undefined) return;
    const commissionRate = body.commissionRate === undefined ? 20 : Number(body.commissionRate);
    if (!Number.isInteger(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      res.status(400).json({ success: false, error: { code: "INVALID_COMMISSION", message: "commissionRate must be between 0 and 100" } });
      return;
    }
    const status = body.status === undefined ? "active" : body.status;
    if (typeof status !== "string" || !(AGENT_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "Invalid agent status" } });
      return;
    }
    const [created] = await db.insert(agentsTable).values({
      name,
      phone,
      email: cleanOptionalText(body.email) ?? null,
      universityId,
      city: cleanOptionalText(body.city) ?? "Nouakchott",
      commissionRate,
      status: status as AgentStatus,
    }).returning();
    res.status(201).json({ success: true, data: await adminAgentWithDetails(created) });
  } catch (err) {
    req.log.error({ err }, "AdminCreateAgent error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/agents/:agentId
router.patch("/agents/:agentId", async (req, res) => {
  try {
    const { agentId } = req.params as { agentId: string };
    const [existing] = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Agent not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        res.status(400).json({ success: false, error: { code: "INVALID_NAME", message: "Agent name cannot be empty" } });
        return;
      }
      update.name = name;
    }
    if (body.phone !== undefined) {
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      if (!phone) {
        res.status(400).json({ success: false, error: { code: "INVALID_PHONE", message: "Agent phone cannot be empty" } });
        return;
      }
      update.phone = phone;
    }
    if (body.email !== undefined) update.email = cleanOptionalText(body.email) ?? null;
    if (body.city !== undefined) update.city = cleanOptionalText(body.city) ?? "Nouakchott";
    if (body.universityId !== undefined) {
      const universityId = await validateOptionalUniversityId(body.universityId, res);
      if (universityId === undefined) return;
      update.universityId = universityId;
    }
    if (body.commissionRate !== undefined) {
      const commissionRate = Number(body.commissionRate);
      if (!Number.isInteger(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        res.status(400).json({ success: false, error: { code: "INVALID_COMMISSION", message: "commissionRate must be between 0 and 100" } });
        return;
      }
      update.commissionRate = commissionRate;
    }
    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !(AGENT_STATUSES as readonly string[]).includes(body.status)) {
        res.status(400).json({ success: false, error: { code: "INVALID_STATUS", message: "Invalid agent status" } });
        return;
      }
      update.status = body.status as AgentStatus;
    }
    const [updated] = await db.update(agentsTable).set(update).where(eq(agentsTable.id, agentId)).returning();
    res.json({ success: true, data: await adminAgentWithDetails(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateAgent error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/agents/:agentId
router.delete("/agents/:agentId", async (req, res) => {
  try {
    const { agentId } = req.params as { agentId: string };
    const [existing] = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Agent not found" } });
      return;
    }
    const [[codeRow], [commissionRow]] = await Promise.all([
      db.select({ c: count() }).from(activationCodesTable).where(eq(activationCodesTable.agentId, agentId)),
      db.select({ c: count() }).from(agentCommissionsTable).where(eq(agentCommissionsTable.agentId, agentId)),
    ]);
    if ((codeRow?.c ?? 0) > 0 || (commissionRow?.c ?? 0) > 0) {
      res.status(409).json({ success: false, error: { code: "AGENT_IN_USE", message: "Cannot delete an agent that has activation codes or commissions. Suspend it instead." } });
      return;
    }
    await db.delete(agentsTable).where(eq(agentsTable.id, agentId));
    res.json({ success: true, data: { id: agentId } });
  } catch (err) {
    req.log.error({ err }, "AdminDeleteAgent error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// ─── OPPORTUNITIES ───────────────────────────────────────────────────────────

const OPPORTUNITY_TYPES = opportunityTypeEnum.enumValues;
type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

async function adminOpportunityWithDetails(opportunity: typeof opportunitiesTable.$inferSelect) {
  const [creator] = await db.select({ fullName: usersTable.fullName, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, opportunity.createdBy)).limit(1);
  return {
    ...opportunity,
    createdByName: creator?.fullName ?? creator?.email ?? "Admin",
  };
}

// GET /admin/opportunities
router.get("/opportunities", async (req, res) => {
  try {
    const { type, status, search } = req.query as Record<string, string | undefined>;
    if (type && !(OPPORTUNITY_TYPES as readonly string[]).includes(type)) {
      res.status(400).json({ success: false, error: { code: "INVALID_TYPE", message: "Unknown opportunity type" } });
      return;
    }
    const conditions = [];
    if (type) conditions.push(eq(opportunitiesTable.type, type as OpportunityType));
    if (status) conditions.push(eq(opportunitiesTable.status, status));
    if (search) conditions.push(ilike(opportunitiesTable.title, `%${search}%`));
    const rows = conditions.length > 0
      ? await db.select().from(opportunitiesTable).where(and(...conditions)).orderBy(sql`${opportunitiesTable.createdAt} DESC`)
      : await db.select().from(opportunitiesTable).orderBy(sql`${opportunitiesTable.createdAt} DESC`);
    const data = await Promise.all(rows.map(adminOpportunityWithDetails));
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "AdminListOpportunities error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /admin/opportunities
router.post("/opportunities", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const organization = typeof body.organization === "string" ? body.organization.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const type = body.type;
    if (!title || !organization || !description || typeof type !== "string" || !(OPPORTUNITY_TYPES as readonly string[]).includes(type)) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "title, organization, type, and description are required" } });
      return;
    }
    const [created] = await db.insert(opportunitiesTable).values({
      title,
      organization,
      type: type as OpportunityType,
      description,
      location: cleanOptionalText(body.location) ?? null,
      deadline: cleanOptionalText(body.deadline) ?? null,
      link: cleanOptionalText(body.link) ?? null,
      targetInfo: cleanOptionalText(body.targetInfo) ?? null,
      isFeatured: typeof body.isFeatured === "boolean" ? body.isFeatured : false,
      status: typeof body.status === "string" && body.status.trim() ? body.status.trim() : "active",
      createdBy: req.userId!,
    }).returning();
    res.status(201).json({ success: true, data: await adminOpportunityWithDetails(created) });
  } catch (err) {
    req.log.error({ err }, "AdminCreateOpportunity error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PATCH /admin/opportunities/:opportunityId
router.patch("/opportunities/:opportunityId", async (req, res) => {
  try {
    const { opportunityId } = req.params as { opportunityId: string };
    const [existing] = await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, opportunityId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Opportunity not found" } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        res.status(400).json({ success: false, error: { code: "INVALID_TITLE", message: "Opportunity title cannot be empty" } });
        return;
      }
      update.title = title;
    }
    if (body.organization !== undefined) {
      const organization = typeof body.organization === "string" ? body.organization.trim() : "";
      if (!organization) {
        res.status(400).json({ success: false, error: { code: "INVALID_ORGANIZATION", message: "Organization cannot be empty" } });
        return;
      }
      update.organization = organization;
    }
    if (body.description !== undefined) {
      const description = typeof body.description === "string" ? body.description.trim() : "";
      if (!description) {
        res.status(400).json({ success: false, error: { code: "INVALID_DESCRIPTION", message: "Description cannot be empty" } });
        return;
      }
      update.description = description;
    }
    if (body.type !== undefined) {
      if (typeof body.type !== "string" || !(OPPORTUNITY_TYPES as readonly string[]).includes(body.type)) {
        res.status(400).json({ success: false, error: { code: "INVALID_TYPE", message: "Invalid opportunity type" } });
        return;
      }
      update.type = body.type as OpportunityType;
    }
    if (body.location !== undefined) update.location = cleanOptionalText(body.location) ?? null;
    if (body.deadline !== undefined) update.deadline = cleanOptionalText(body.deadline) ?? null;
    if (body.link !== undefined) update.link = cleanOptionalText(body.link) ?? null;
    if (body.targetInfo !== undefined) update.targetInfo = cleanOptionalText(body.targetInfo) ?? null;
    if (body.isFeatured !== undefined) update.isFeatured = Boolean(body.isFeatured);
    if (body.status !== undefined) update.status = cleanOptionalText(body.status) ?? "active";

    const [updated] = await db.update(opportunitiesTable).set(update).where(eq(opportunitiesTable.id, opportunityId)).returning();
    res.json({ success: true, data: await adminOpportunityWithDetails(updated) });
  } catch (err) {
    req.log.error({ err }, "AdminUpdateOpportunity error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// DELETE /admin/opportunities/:opportunityId
router.delete("/opportunities/:opportunityId", async (req, res) => {
  try {
    const { opportunityId } = req.params as { opportunityId: string };
    const [existing] = await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, opportunityId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Opportunity not found" } });
      return;
    }
    await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, opportunityId));
    res.json({ success: true, data: { id: opportunityId } });
  } catch (err) {
    req.log.error({ err }, "AdminDeleteOpportunity error");
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
