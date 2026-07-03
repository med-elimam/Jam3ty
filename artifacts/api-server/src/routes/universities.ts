import { Router } from "express";
import { db, universitiesTable, facultiesTable, departmentsTable, levelsTable, studentGroupsTable } from "@workspace/db";
import { eq, ilike, and } from "drizzle-orm";

const router = Router();

// GET /universities
router.get("/universities", async (req, res) => {
  try {
    const { search, status } = req.query as { search?: string; status?: string };
    let query = db.select().from(universitiesTable);
    const conditions = [];
    if (search) conditions.push(ilike(universitiesTable.name, `%${search}%`));
    if (status) conditions.push(eq(universitiesTable.status, status as "community_created" | "verified" | "official_partner"));
    const universities = conditions.length > 0
      ? await db.select().from(universitiesTable).where(and(...conditions)).orderBy(universitiesTable.name)
      : await db.select().from(universitiesTable).orderBy(universitiesTable.name);
    res.json({ success: true, data: universities });
  } catch (err) {
    req.log.error({ err }, "ListUniversities error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /universities/:universityId/faculties
router.get("/universities/:universityId/faculties", async (req, res) => {
  try {
    const { universityId } = req.params as { universityId: string };
    const faculties = await db.select().from(facultiesTable).where(eq(facultiesTable.universityId, universityId)).orderBy(facultiesTable.name);
    res.json({ success: true, data: faculties });
  } catch (err) {
    req.log.error({ err }, "ListFaculties error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /faculties/:facultyId/departments
router.get("/faculties/:facultyId/departments", async (req, res) => {
  try {
    const { facultyId } = req.params as { facultyId: string };
    const departments = await db.select().from(departmentsTable).where(eq(departmentsTable.facultyId, facultyId)).orderBy(departmentsTable.name);
    res.json({ success: true, data: departments });
  } catch (err) {
    req.log.error({ err }, "ListDepartments error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /departments/:departmentId/levels
router.get("/departments/:departmentId/levels", async (req, res) => {
  try {
    const { departmentId } = req.params as { departmentId: string };
    const levels = await db.select().from(levelsTable).where(eq(levelsTable.departmentId, departmentId)).orderBy(levelsTable.yearNumber);
    res.json({ success: true, data: levels });
  } catch (err) {
    req.log.error({ err }, "ListLevels error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /levels/:levelId/groups
router.get("/levels/:levelId/groups", async (req, res) => {
  try {
    const { levelId } = req.params as { levelId: string };
    const groups = await db.select().from(studentGroupsTable).where(eq(studentGroupsTable.levelId, levelId)).orderBy(studentGroupsTable.name);
    res.json({ success: true, data: groups });
  } catch (err) {
    req.log.error({ err }, "ListGroups error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
