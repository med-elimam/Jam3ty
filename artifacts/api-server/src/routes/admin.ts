import { Router } from "express";
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
