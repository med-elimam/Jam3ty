/**
 * Jamiati — جامعتي · Seed script (Phase 3)
 * Run: pnpm --filter @workspace/scripts run seed
 *
 * Idempotent: re-running is safe — no duplicates created.
 * Strategy:
 *  - Academic hierarchy (univ / faculty / dept / level / group): find-by-nameAr or insert
 *  - Users: onConflictDoNothing (email is UNIQUE)
 *  - Content (courses, timetable, files, announcements, …): skip if table already has rows
 */

import { db } from "@workspace/db";
import {
  universitiesTable,
  facultiesTable,
  departmentsTable,
  levelsTable,
  studentGroupsTable,
  usersTable,
  profilesTable,
  coursesTable,
  plansTable,
  timetableSessionsTable,
  filesTable,
  announcementsTable,
  assignmentsTable,
  examsTable,
  postsTable,
  eventsTable,
  opportunitiesTable,
  clubsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq, and, sql } from "drizzle-orm";

// ─── helpers ──────────────────────────────────────────────────────────────────

async function findOrCreateUniversity(nameAr: string, payload: typeof universitiesTable.$inferInsert) {
  const [existing] = await db.select().from(universitiesTable).where(eq(universitiesTable.nameAr, nameAr)).limit(1);
  if (existing) return existing;
  const [row] = await db.insert(universitiesTable).values(payload).returning();
  return row!;
}

async function findOrCreateFaculty(universityId: string, nameAr: string, payload: typeof facultiesTable.$inferInsert) {
  const [existing] = await db.select().from(facultiesTable)
    .where(and(eq(facultiesTable.universityId, universityId), eq(facultiesTable.nameAr, nameAr))).limit(1);
  if (existing) return existing;
  const [row] = await db.insert(facultiesTable).values(payload).returning();
  return row!;
}

async function findOrCreateDepartment(facultyId: string, nameAr: string, payload: typeof departmentsTable.$inferInsert) {
  const [existing] = await db.select().from(departmentsTable)
    .where(and(eq(departmentsTable.facultyId, facultyId), eq(departmentsTable.nameAr, nameAr))).limit(1);
  if (existing) return existing;
  const [row] = await db.insert(departmentsTable).values(payload).returning();
  return row!;
}

async function findOrCreateLevel(departmentId: string, name: string, payload: typeof levelsTable.$inferInsert) {
  const [existing] = await db.select().from(levelsTable)
    .where(and(eq(levelsTable.departmentId, departmentId), eq(levelsTable.name, name))).limit(1);
  if (existing) return existing;
  const [row] = await db.insert(levelsTable).values(payload).returning();
  return row!;
}

async function findOrCreateGroup(levelId: string, name: string) {
  const [existing] = await db.select().from(studentGroupsTable)
    .where(and(eq(studentGroupsTable.levelId, levelId), eq(studentGroupsTable.name, name))).limit(1);
  if (existing) return existing;
  const [row] = await db.insert(studentGroupsTable).values({ levelId, name }).returning();
  return row!;
}

async function findOrCreateCourse(code: string, payload: typeof coursesTable.$inferInsert) {
  const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.code, code)).limit(1);
  if (existing) {
    // Always update levelId, departmentId, professorId in case previous seed used stale IDs
    const [updated] = await db.update(coursesTable).set({
      levelId: payload.levelId,
      departmentId: payload.departmentId,
      professorId: payload.professorId,
    }).where(eq(coursesTable.id, existing.id)).returning();
    return updated!;
  }
  const [row] = await db.insert(coursesTable).values(payload).returning();
  return row!;
}

// This seed is a demo/dev fixture. Destructive resets are refused in production
// so it can never wipe a live database (e.g. if wired into a prod pipeline).
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Wipe a content table (and its dependent interaction rows) so it can be re-seeded cleanly.
 * Content tables hold only demo fixtures; the CASCADE clears interaction rows
 * (favorites, reactions, reads, submissions, registrations) that belong to demo data.
 * Refused in production to avoid destroying real user data.
 */
async function resetTable(sqlName: string): Promise<void> {
  if (IS_PRODUCTION) {
    throw new Error(`Refusing to TRUNCATE "${sqlName}" in production — seed is a dev-only fixture.`);
  }
  await db.execute(sql.raw(`TRUNCATE TABLE "${sqlName}" RESTART IDENTITY CASCADE`));
}

/**
 * Remove duplicate universities left by older seed runs (same name_ar).
 * Keeps the oldest row, repoints every table that has a university_id column
 * to the kept row, then deletes the duplicates. Atomic (transaction) & idempotent.
 */
async function dedupeUniversities(): Promise<void> {
  const groups = await db.execute(sql`
    SELECT name_ar, (array_agg(id ORDER BY created_at))[1] AS keep_id,
           array_agg(id ORDER BY created_at) AS all_ids
    FROM universities GROUP BY name_ar HAVING count(*) > 1
  `);
  const rows = (groups as any).rows ?? groups;
  if (!rows?.length) return;

  // All tables that reference a university via a university_id column.
  const colsRes = await db.execute(sql`
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'university_id' AND table_schema = 'public'
  `);
  const tables: string[] = ((colsRes as any).rows ?? colsRes).map((r: any) => r.table_name);

  let removed = 0;
  await db.transaction(async (tx) => {
    for (const g of rows as any[]) {
      const keep = g.keep_id as string;
      const dupes = (g.all_ids as string[]).filter((id) => id !== keep);
      if (!dupes.length) continue;
      const dupeList = dupes.map((d) => `'${d}'`).join(",");
      for (const tbl of tables) {
        await tx.execute(sql.raw(
          `UPDATE "${tbl}" SET university_id = '${keep}' WHERE university_id IN (${dupeList})`,
        ));
      }
      await tx.execute(sql.raw(`DELETE FROM universities WHERE id IN (${dupeList})`));
      removed += dupes.length;
    }
  });
  if (removed) console.log(`    removed ${removed} duplicate universities`);
}

/**
 * Canonicalize subscription plans WITHOUT a cascading truncate (plans are referenced
 * by subscriptions/payments/activation_codes, so a CASCADE would wipe billing history).
 * Strategy: deactivate all plans, upsert the 4 canonical plans by stable name,
 * then delete only leftover plan rows that have NO dependent references.
 */
async function canonicalizePlans(
  canonical: (typeof plansTable.$inferInsert)[],
): Promise<void> {
  await db.transaction(async (tx) => {
    // Deactivate everything first; canonical upserts below re-activate the 4.
    await tx.update(plansTable).set({ isActive: false });

    const keepIds: string[] = [];
    for (const plan of canonical) {
      const [existing] = await tx.select().from(plansTable).where(eq(plansTable.name, plan.name)).limit(1);
      if (existing) {
        await tx.update(plansTable).set({ ...plan, isActive: true }).where(eq(plansTable.id, existing.id));
        keepIds.push(existing.id);
      } else {
        const [row] = await tx.insert(plansTable).values({ ...plan, isActive: true }).returning();
        keepIds.push(row!.id);
      }
    }

    // Delete only non-canonical, UNREFERENCED plan rows (safe: never touches billing history).
    const keepList = keepIds.map((id) => `'${id}'`).join(",");
    await tx.execute(sql.raw(`
      DELETE FROM plans p
      WHERE p.id NOT IN (${keepList})
        AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.plan_id = p.id)
        AND NOT EXISTS (SELECT 1 FROM payments pm WHERE pm.plan_id = p.id)
        AND NOT EXISTS (SELECT 1 FROM activation_codes ac WHERE ac.plan_id = p.id)
    `));
  });
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

function fmt(d: Date) { return d.toISOString().split("T")[0]!; }

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Starting Phase 3 seed…");

  // ── Cleanup: remove duplicates left by earlier seed runs ────────────────────
  console.log("  Cleanup (dedupe)…");
  await dedupeUniversities();

  // ── Plans ─────────────────────────────────────────────────────────────────
  console.log("  Plans…");
  // Non-cascading canonicalization: upserts the 4 canonical plans and removes only
  // unreferenced duplicate plan rows (never touches subscriptions/payments/codes).
  const plusFeatures = ["files", "announcements", "timetable", "community", "ai", "downloads"];
  await canonicalizePlans([
    { name: "Free", nameAr: "مجاني", nameFr: "Gratuit", priceMru: 0, durationDays: 36500,
      features: ["files", "announcements", "timetable"] },
    { name: "Jamiati Plus — Monthly", nameAr: "جامعتي بلس — شهري", nameFr: "Jamiati Plus — Mensuel",
      priceMru: 100, durationDays: 30, features: plusFeatures },
    { name: "Jamiati Plus — Semester", nameAr: "جامعتي بلس — سداسي", nameFr: "Jamiati Plus — Semestriel",
      priceMru: 400, durationDays: 120, features: plusFeatures },
    { name: "Jamiati Plus — Yearly", nameAr: "جامعتي بلس — سنوي", nameFr: "Jamiati Plus — Annuel",
      priceMru: 800, durationDays: 365, features: plusFeatures },
  ]);

  // ── Universities (9 institutions) ─────────────────────────────────────────
  console.log("  Universities…");
  const univNouakchott = await findOrCreateUniversity("جامعة نواكشوط", {
    name: "University of Nouakchott Al-Asriya", nameAr: "جامعة نواكشوط", city: "Nouakchott", status: "official_partner",
  });
  const univISCAE = await findOrCreateUniversity("المعهد العالي للتجارة وإدارة المؤسسات", {
    name: "ISCAE Mauritania", nameAr: "المعهد العالي للتجارة وإدارة المؤسسات", city: "Nouakchott", status: "verified",
  });
  await findOrCreateUniversity("المعهد العالي للمحاسبة وإدارة المؤسسات", {
    name: "ISAE Mauritania", nameAr: "المعهد العالي للمحاسبة وإدارة المؤسسات", city: "Nouakchott", status: "verified",
  });
  await findOrCreateUniversity("المدرسة العليا متعددة التقنيات", {
    name: "Ecole Supérieure Polytechnique", nameAr: "المدرسة العليا متعددة التقنيات", city: "Nouakchott", status: "official_partner",
  });
  await findOrCreateUniversity("المعهد العالي للدراسات والبحوث الإسلامية", {
    name: "ISERI", nameAr: "المعهد العالي للدراسات والبحوث الإسلامية", city: "Nouakchott", status: "verified",
  });
  await findOrCreateUniversity("المعهد الجامعي المهني", {
    name: "IUP Mauritania", nameAr: "المعهد الجامعي المهني", city: "Nouakchott", status: "verified",
  });
  await findOrCreateUniversity("جامعة العلوم الإسلامية بلعيون", {
    name: "Islamic University of Laayoune", nameAr: "جامعة العلوم الإسلامية بلعيون", city: "Laayoune", status: "verified",
  });
  await findOrCreateUniversity("كلية الطب", {
    name: "Faculty of Medicine - Mauritania", nameAr: "كلية الطب", city: "Nouakchott", status: "verified",
  });
  await findOrCreateUniversity("جامعة الآداب والعلوم الإنسانية", {
    name: "University of Letters and Humanities", nameAr: "جامعة الآداب والعلوم الإنسانية", city: "Nouakchott", status: "community_created",
  });

  // ── Faculties ─────────────────────────────────────────────────────────────
  console.log("  Faculties…");
  // جامعة نواكشوط
  const facCST  = await findOrCreateFaculty(univNouakchott.id, "كلية العلوم والتقنيات", { universityId: univNouakchott.id, name: "Faculty of Sciences and Technology", nameAr: "كلية العلوم والتقنيات" });
  const facLetters = await findOrCreateFaculty(univNouakchott.id, "كلية الآداب والعلوم الإنسانية", { universityId: univNouakchott.id, name: "Faculty of Letters and Humanities", nameAr: "كلية الآداب والعلوم الإنسانية" });
  const facLaw  = await findOrCreateFaculty(univNouakchott.id, "كلية العلوم القانونية والاقتصادية", { universityId: univNouakchott.id, name: "Faculty of Law and Economics", nameAr: "كلية العلوم القانونية والاقتصادية" });
  const facMed  = await findOrCreateFaculty(univNouakchott.id, "كلية الطب", { universityId: univNouakchott.id, name: "Faculty of Medicine", nameAr: "كلية الطب" });
  // ISCAE
  const facBusiness = await findOrCreateFaculty(univISCAE.id, "إدارة الأعمال", { universityId: univISCAE.id, name: "Business Administration", nameAr: "إدارة الأعمال" });
  const facAccounting = await findOrCreateFaculty(univISCAE.id, "المحاسبة والمالية", { universityId: univISCAE.id, name: "Accounting and Finance", nameAr: "المحاسبة والمالية" });
  const facMarketing = await findOrCreateFaculty(univISCAE.id, "التجارة والتسويق", { universityId: univISCAE.id, name: "Commerce and Marketing", nameAr: "التجارة والتسويق" });
  const facMIS = await findOrCreateFaculty(univISCAE.id, "نظم المعلومات الإدارية", { universityId: univISCAE.id, name: "Management Information Systems", nameAr: "نظم المعلومات الإدارية" });

  // ── Departments ────────────────────────────────────────────────────────────
  console.log("  Departments…");
  const deptCS     = await findOrCreateDepartment(facCST.id,      "علوم الحاسوب",       { facultyId: facCST.id,      name: "Computer Science",        nameAr: "علوم الحاسوب" });
  const deptMath   = await findOrCreateDepartment(facCST.id,      "الرياضيات",           { facultyId: facCST.id,      name: "Mathematics",             nameAr: "الرياضيات" });
  const deptPhys   = await findOrCreateDepartment(facCST.id,      "الفيزياء",            { facultyId: facCST.id,      name: "Physics",                 nameAr: "الفيزياء" });
  const deptChem   = await findOrCreateDepartment(facCST.id,      "الكيمياء",            { facultyId: facCST.id,      name: "Chemistry",               nameAr: "الكيمياء" });
  const deptEco    = await findOrCreateDepartment(facLaw.id,       "الاقتصاد",            { facultyId: facLaw.id,      name: "Economics",               nameAr: "الاقتصاد" });
  const deptLaw    = await findOrCreateDepartment(facLaw.id,       "القانون",             { facultyId: facLaw.id,      name: "Law",                     nameAr: "القانون" });
  const deptMedGen = await findOrCreateDepartment(facMed.id,       "الطب العام",          { facultyId: facMed.id,     name: "General Medicine",         nameAr: "الطب العام" });
  const deptBA     = await findOrCreateDepartment(facBusiness.id,  "إدارة الأعمال",       { facultyId: facBusiness.id, name: "Business Administration", nameAr: "إدارة الأعمال" });
  const deptAcc    = await findOrCreateDepartment(facAccounting.id,"المحاسبة",            { facultyId: facAccounting.id, name: "Accounting",            nameAr: "المحاسبة" });
  const deptMIS    = await findOrCreateDepartment(facMIS.id,       "نظم المعلومات",       { facultyId: facMIS.id,     name: "Information Systems",      nameAr: "نظم المعلومات" });

  // ── Levels (Arabic names go in `name` — no nameAr column) ─────────────────
  console.log("  Levels…");
  const L1_AR = "السنة الأولى ليسانس";
  const L2_AR = "السنة الثانية ليسانس";
  const L3_AR = "السنة الثالثة ليسانس";
  const M1_AR = "السنة الأولى ماستر";
  const M2_AR = "السنة الثانية ماستر";

  // CS levels
  const l1cs = await findOrCreateLevel(deptCS.id, L1_AR, { departmentId: deptCS.id, name: L1_AR, yearNumber: 1 });
  const l2cs = await findOrCreateLevel(deptCS.id, L2_AR, { departmentId: deptCS.id, name: L2_AR, yearNumber: 2 });
  const l3cs = await findOrCreateLevel(deptCS.id, L3_AR, { departmentId: deptCS.id, name: L3_AR, yearNumber: 3 });
  const m1cs = await findOrCreateLevel(deptCS.id, M1_AR, { departmentId: deptCS.id, name: M1_AR, yearNumber: 4 });
  const m2cs = await findOrCreateLevel(deptCS.id, M2_AR, { departmentId: deptCS.id, name: M2_AR, yearNumber: 5 });
  // Math levels
  const l1math = await findOrCreateLevel(deptMath.id, L1_AR, { departmentId: deptMath.id, name: L1_AR, yearNumber: 1 });
  const l2math = await findOrCreateLevel(deptMath.id, L2_AR, { departmentId: deptMath.id, name: L2_AR, yearNumber: 2 });
  const l3math = await findOrCreateLevel(deptMath.id, L3_AR, { departmentId: deptMath.id, name: L3_AR, yearNumber: 3 });
  // Business levels
  const l1ba = await findOrCreateLevel(deptBA.id, L1_AR, { departmentId: deptBA.id, name: L1_AR, yearNumber: 1 });
  const l2ba = await findOrCreateLevel(deptBA.id, L2_AR, { departmentId: deptBA.id, name: L2_AR, yearNumber: 2 });
  const l3ba = await findOrCreateLevel(deptBA.id, L3_AR, { departmentId: deptBA.id, name: L3_AR, yearNumber: 3 });
  // Medicine levels
  const l1med = await findOrCreateLevel(deptMedGen.id, L1_AR, { departmentId: deptMedGen.id, name: L1_AR, yearNumber: 1 });
  const l2med = await findOrCreateLevel(deptMedGen.id, L2_AR, { departmentId: deptMedGen.id, name: L2_AR, yearNumber: 2 });
  // Economics levels
  const l1eco = await findOrCreateLevel(deptEco.id, L1_AR, { departmentId: deptEco.id, name: L1_AR, yearNumber: 1 });
  const l2eco = await findOrCreateLevel(deptEco.id, L2_AR, { departmentId: deptEco.id, name: L2_AR, yearNumber: 2 });

  // ── Groups ────────────────────────────────────────────────────────────────
  console.log("  Groups…");
  const grpA_l1cs = await findOrCreateGroup(l1cs.id, "المجموعة A");
  const grpB_l1cs = await findOrCreateGroup(l1cs.id, "المجموعة B");
  const grpC_l1cs = await findOrCreateGroup(l1cs.id, "المجموعة C");
  const grpA_l2cs = await findOrCreateGroup(l2cs.id, "المجموعة A");
  const grpB_l2cs = await findOrCreateGroup(l2cs.id, "المجموعة B");
  const grpC_l2cs = await findOrCreateGroup(l2cs.id, "المجموعة C");
  const grpA_l3cs = await findOrCreateGroup(l3cs.id, "المجموعة A");
  const grpB_l3cs = await findOrCreateGroup(l3cs.id, "المجموعة B");
  const grpA_l1ba = await findOrCreateGroup(l1ba.id, "المجموعة A");
  const grpB_l1ba = await findOrCreateGroup(l1ba.id, "المجموعة B");

  // ── Users ─────────────────────────────────────────────────────────────────
  console.log("  Users…");
  const adminHash   = await bcrypt.hash("Admin@1234",   12);
  const studentHash = await bcrypt.hash("Student@1234", 12);
  const profHash    = await bcrypt.hash("Prof@1234",    12);
  const stu2Hash    = await bcrypt.hash("Student@1234", 12);

  // Super Admin
  const [admin] = await db.insert(usersTable).values({
    fullName: "مشرف النظام", email: "admin@jamiati.mr", passwordHash: adminHash,
    role: "super_admin", emailVerified: true,
  }).onConflictDoNothing().returning();
  const adminRow = admin ?? (await db.select().from(usersTable).where(eq(usersTable.email, "admin@jamiati.mr")).limit(1))[0]!;
  await db.insert(profilesTable).values({ userId: adminRow.id, language: "ar", onboardingComplete: true }).onConflictDoNothing();

  // Demo student — linked to UAN / CST / CS / L2 / Group A
  const [studentInsert] = await db.insert(usersTable).values({
    fullName: "أحمد ولد محمد", email: "student@jamiati.mr", passwordHash: studentHash,
    role: "student", emailVerified: true,
  }).onConflictDoNothing().returning();
  const studentRow = studentInsert ?? (await db.select().from(usersTable).where(eq(usersTable.email, "student@jamiati.mr")).limit(1))[0]!;
  // Always update the student profile to ensure correct academic linkage
  const [existingStudentProfile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, studentRow.id)).limit(1);
  if (existingStudentProfile) {
    await db.update(profilesTable).set({
      universityId: univNouakchott.id,
      facultyId: facCST.id,
      departmentId: deptCS.id,
      levelId: l2cs.id,
      groupId: grpA_l2cs.id,
      language: "ar",
      onboardingComplete: true,
      updatedAt: new Date(),
    }).where(eq(profilesTable.userId, studentRow.id));
  } else {
    await db.insert(profilesTable).values({
      userId: studentRow.id,
      universityId: univNouakchott.id,
      facultyId: facCST.id,
      departmentId: deptCS.id,
      levelId: l2cs.id,
      groupId: grpA_l2cs.id,
      language: "ar",
      onboardingComplete: true,
    });
  }

  // Professor
  const [profInsert] = await db.insert(usersTable).values({
    fullName: "د. محمد لمين", email: "prof@jamiati.mr", passwordHash: profHash,
    role: "professor", emailVerified: true,
  }).onConflictDoNothing().returning();
  const professor = profInsert ?? (await db.select().from(usersTable).where(eq(usersTable.email, "prof@jamiati.mr")).limit(1))[0]!;
  await db.insert(profilesTable).values({ userId: professor.id, universityId: univNouakchott.id, facultyId: facCST.id, departmentId: deptCS.id, language: "ar", onboardingComplete: true }).onConflictDoNothing();

  // Second demo student — ISCAE / Business / Year 1 / Group A
  const [stu2Insert] = await db.insert(usersTable).values({
    fullName: "فاطمة بنت إبراهيم", email: "student2@jamiati.mr", passwordHash: stu2Hash,
    role: "student", emailVerified: true,
  }).onConflictDoNothing().returning();
  const student2Row = stu2Insert ?? (await db.select().from(usersTable).where(eq(usersTable.email, "student2@jamiati.mr")).limit(1))[0]!;
  const [existingStu2Profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, student2Row.id)).limit(1);
  if (existingStu2Profile) {
    await db.update(profilesTable).set({
      universityId: univISCAE.id, facultyId: facBusiness.id, departmentId: deptBA.id,
      levelId: l1ba.id, groupId: grpA_l1ba.id, language: "ar", onboardingComplete: true, updatedAt: new Date(),
    }).where(eq(profilesTable.userId, student2Row.id));
  } else {
    await db.insert(profilesTable).values({
      userId: student2Row.id,
      universityId: univISCAE.id, facultyId: facBusiness.id, departmentId: deptBA.id,
      levelId: l1ba.id, groupId: grpA_l1ba.id, language: "ar", onboardingComplete: true,
    });
  }

  // ── Courses ────────────────────────────────────────────────────────────────
  console.log("  Courses…");
  // CS Year 1
  const csCourse101 = await findOrCreateCourse("CS101", { name: "البرمجة 1",             nameAr: "البرمجة 1",              code: "CS101", departmentId: deptCS.id, levelId: l1cs.id, professorId: professor.id, semester: "S1", description: "مقدمة في البرمجة باستخدام لغة Python." });
  const csCourse102 = await findOrCreateCourse("CS102", { name: "الخوارزميات",            nameAr: "الخوارزميات",            code: "CS102", departmentId: deptCS.id, levelId: l1cs.id, professorId: professor.id, semester: "S1", description: "تصميم الخوارزميات وتحليل تعقيدها الزمني." });
  const csCourse103 = await findOrCreateCourse("CS103", { name: "بنية الحاسوب",           nameAr: "بنية الحاسوب",           code: "CS103", departmentId: deptCS.id, levelId: l1cs.id, professorId: professor.id, semester: "S2", description: "معمارية الحواسيب، المعالجات، وذاكرة الوصول العشوائي." });
  const csCourse104 = await findOrCreateCourse("MATH101",{ name: "الرياضيات 1",            nameAr: "الرياضيات 1",            code: "MATH101",departmentId: deptCS.id, levelId: l1cs.id, professorId: professor.id, semester: "S1", description: "التحليل الرياضي، الحساب، والجبر الخطي." });
  const csCourse105 = await findOrCreateCourse("FRE101", { name: "اللغة الفرنسية التقنية", nameAr: "اللغة الفرنسية التقنية", code: "FRE101", departmentId: deptCS.id, levelId: l1cs.id, professorId: professor.id, semester: "S1", description: "الفرنسية التقنية للطلاب الهندسيين." });
  // CS Year 2
  const csCourse201 = await findOrCreateCourse("CS201", { name: "البرمجة الكائنية",        nameAr: "البرمجة الكائنية",        code: "CS201", departmentId: deptCS.id, levelId: l2cs.id, professorId: professor.id, semester: "S1", description: "مفاهيم البرمجة كائنية التوجه بلغة Java." });
  const csCourse202 = await findOrCreateCourse("CS202", { name: "قواعد البيانات",          nameAr: "قواعد البيانات",          code: "CS202", departmentId: deptCS.id, levelId: l2cs.id, professorId: professor.id, semester: "S1", description: "قواعد البيانات العلائقية، SQL، وتصميم قاعدة البيانات." });
  const csCourse203 = await findOrCreateCourse("CS203", { name: "أنظمة التشغيل",           nameAr: "أنظمة التشغيل",           code: "CS203", departmentId: deptCS.id, levelId: l2cs.id, professorId: professor.id, semester: "S2", description: "إدارة العمليات، الذاكرة، وأنظمة الملفات." });
  const csCourse204 = await findOrCreateCourse("CS204", { name: "شبكات الحاسوب",           nameAr: "شبكات الحاسوب",           code: "CS204", departmentId: deptCS.id, levelId: l2cs.id, professorId: professor.id, semester: "S2", description: "بروتوكولات الشبكات، TCP/IP، وتقنيات الويب." });
  const csCourse205 = await findOrCreateCourse("STAT201",{ name: "الإحصاء",                nameAr: "الإحصاء",                code: "STAT201",departmentId: deptCS.id, levelId: l2cs.id, professorId: professor.id, semester: "S1", description: "الإحصاء الوصفي والاستدلالي مع تطبيقات." });
  // Business Year 1
  const baCourse101 = await findOrCreateCourse("BA101",  { name: "مبادئ الإدارة",          nameAr: "مبادئ الإدارة",          code: "BA101",  departmentId: deptBA.id,  levelId: l1ba.id,  professorId: professor.id, semester: "S1", description: "أسس الإدارة الحديثة والتنظيم." });
  const baCourse102 = await findOrCreateCourse("ACC101", { name: "المحاسبة العامة",         nameAr: "المحاسبة العامة",         code: "ACC101", departmentId: deptBA.id,  levelId: l1ba.id,  professorId: professor.id, semester: "S1", description: "أساسيات المحاسبة المالية والقيود." });
  const baCourse103 = await findOrCreateCourse("ECO101", { name: "الاقتصاد الجزئي",        nameAr: "الاقتصاد الجزئي",        code: "ECO101", departmentId: deptBA.id,  levelId: l1ba.id,  professorId: professor.id, semester: "S2", description: "سلوك المستهلك، الأسواق، والتوازن الجزئي." });
  const baCourse104 = await findOrCreateCourse("MKT101", { name: "التسويق",                nameAr: "التسويق",                code: "MKT101", departmentId: deptBA.id,  levelId: l1ba.id,  professorId: professor.id, semester: "S2", description: "مفاهيم التسويق ودراسة السوق." });
  const baCourse105 = await findOrCreateCourse("FMATH101",{name: "رياضيات مالية",          nameAr: "رياضيات مالية",          code: "FMATH101",departmentId: deptBA.id, levelId: l1ba.id,  professorId: professor.id, semester: "S1", description: "الرياضيات المطبقة في التمويل والاستثمار." });
  // Medicine Year 1
  const medCourse101 = await findOrCreateCourse("MED101", { name: "التشريح",              nameAr: "التشريح",               code: "MED101", departmentId: deptMedGen.id, levelId: l1med.id, professorId: professor.id, semester: "S1", description: "تشريح جسم الإنسان والأعضاء الرئيسية." });
  const medCourse102 = await findOrCreateCourse("MED102", { name: "الفيزيولوجيا",         nameAr: "الفيزيولوجيا",          code: "MED102", departmentId: deptMedGen.id, levelId: l1med.id, professorId: professor.id, semester: "S1", description: "وظائف الجهاز الهضمي والتنفسي والدوري." });
  const medCourse103 = await findOrCreateCourse("MED103", { name: "الكيمياء الحيوية",     nameAr: "الكيمياء الحيوية",      code: "MED103", departmentId: deptMedGen.id, levelId: l1med.id, professorId: professor.id, semester: "S2", description: "التفاعلات الكيميائية في الكائنات الحية." });
  const medCourse104 = await findOrCreateCourse("MED104", { name: "علم الأنسجة",          nameAr: "علم الأنسجة",          code: "MED104", departmentId: deptMedGen.id, levelId: l1med.id, professorId: professor.id, semester: "S2", description: "دراسة الأنسجة البيولوجية تحت المجهر." });

  // ── Timetable Sessions ─────────────────────────────────────────────────────
  // dayOfWeek: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday
  // groupId=null → visible to all students (no group filter)
  console.log("  Timetable sessions…");
  await resetTable("timetable_sessions");
  {
    await db.insert(timetableSessionsTable).values([
      // ── CS Year 2 ────────────────────────────────────────────────────────
      // CS201 البرمجة الكائنية
      { courseId: csCourse201.id, dayOfWeek: 0, startTime: "08:00", endTime: "10:00", type: "lecture", room: "A101", groupId: null },
      { courseId: csCourse201.id, dayOfWeek: 2, startTime: "10:00", endTime: "12:00", type: "td",      room: "B204", groupId: grpA_l2cs.id },
      { courseId: csCourse201.id, dayOfWeek: 2, startTime: "10:00", endTime: "12:00", type: "td",      room: "B205", groupId: grpB_l2cs.id },
      // CS202 قواعد البيانات
      { courseId: csCourse202.id, dayOfWeek: 1, startTime: "08:00", endTime: "10:00", type: "lecture", room: "A102", groupId: null },
      { courseId: csCourse202.id, dayOfWeek: 3, startTime: "10:00", endTime: "12:00", type: "td",      room: "B206", groupId: null },
      // CS203 أنظمة التشغيل
      { courseId: csCourse203.id, dayOfWeek: 1, startTime: "10:00", endTime: "12:00", type: "lecture", room: "A103", groupId: null },
      { courseId: csCourse203.id, dayOfWeek: 4, startTime: "08:00", endTime: "10:00", type: "td",      room: "B207", groupId: null },
      // CS204 شبكات الحاسوب
      { courseId: csCourse204.id, dayOfWeek: 2, startTime: "08:00", endTime: "10:00", type: "lecture", room: "A104", groupId: null },
      { courseId: csCourse204.id, dayOfWeek: 4, startTime: "10:00", endTime: "12:00", type: "tp",      room: "Labo1", groupId: null },
      // STAT201 الإحصاء
      { courseId: csCourse205.id, dayOfWeek: 3, startTime: "08:00", endTime: "09:30", type: "lecture", room: "A105", groupId: null },
      // ── CS Year 1 ────────────────────────────────────────────────────────
      { courseId: csCourse101.id, dayOfWeek: 0, startTime: "10:00", endTime: "12:00", type: "lecture", room: "A201", groupId: null },
      { courseId: csCourse102.id, dayOfWeek: 1, startTime: "14:00", endTime: "16:00", type: "lecture", room: "A202", groupId: null },
      { courseId: csCourse104.id, dayOfWeek: 3, startTime: "14:00", endTime: "16:00", type: "lecture", room: "A203", groupId: null },
      // ── Business Year 1 ──────────────────────────────────────────────────
      { courseId: baCourse101.id, dayOfWeek: 0, startTime: "08:00", endTime: "10:00", type: "lecture", room: "C101", groupId: null },
      { courseId: baCourse102.id, dayOfWeek: 1, startTime: "08:00", endTime: "10:00", type: "lecture", room: "C102", groupId: null },
      { courseId: baCourse103.id, dayOfWeek: 2, startTime: "08:00", endTime: "10:00", type: "lecture", room: "C103", groupId: null },
    ]);
  }

  // ── Files ──────────────────────────────────────────────────────────────────
  console.log("  Files…");
  await resetTable("files");
  {
    await db.insert(filesTable).values([
      // CS201
      { title: "محاضرة 1 - مقدمة في البرمجة الكائنية", fileType: "lecture",    courseId: csCourse201.id, uploadedBy: professor.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 512000 },
      { title: "محاضرة 2 - الأصناف والكائنات",          fileType: "lecture",    courseId: csCourse201.id, uploadedBy: professor.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 640000 },
      { title: "TD 1 - تمارين البرمجة الكائنية",        fileType: "td",         courseId: csCourse201.id, uploadedBy: professor.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 256000 },
      { title: "تصحيح امتحان نصفي البرمجة",             fileType: "correction", courseId: csCourse201.id, uploadedBy: professor.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 128000 },
      // CS202
      { title: "محاضرة 1 - مقدمة في قواعد البيانات",   fileType: "lecture",    courseId: csCourse202.id, uploadedBy: professor.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 720000 },
      { title: "ملخص قواعد البيانات - الفصل الأول",     fileType: "summary",    courseId: csCourse202.id, uploadedBy: studentRow.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 180000 },
      { title: "TD 1 - استعلامات SQL",                  fileType: "td",         courseId: csCourse202.id, uploadedBy: professor.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 300000 },
      // CS203
      { title: "محاضرة 1 - مقدمة في أنظمة التشغيل",    fileType: "lecture",    courseId: csCourse203.id, uploadedBy: professor.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 680000 },
      { title: "TD 1 - إدارة العمليات",                 fileType: "td",         courseId: csCourse203.id, uploadedBy: professor.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 220000 },
      // CS204
      { title: "محاضرة 1 - مقدمة في شبكات الحاسوب",    fileType: "lecture",    courseId: csCourse204.id, uploadedBy: professor.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 580000 },
      // STAT201
      { title: "ملخص الإحصاء - مراجعة شاملة",          fileType: "summary",    courseId: csCourse205.id, uploadedBy: studentRow.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 200000 },
      { title: "امتحان سابق في الإحصاء 2024",           fileType: "exam",       courseId: csCourse205.id, uploadedBy: professor.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 120000 },
      // CS Year 1
      { title: "محاضرة 1 - مقدمة في الخوارزميات",       fileType: "lecture",    courseId: csCourse102.id, uploadedBy: professor.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 450000 },
      // Business
      { title: "محاضرة 1 - مبادئ الإدارة",             fileType: "lecture",    courseId: baCourse101.id, uploadedBy: professor.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 500000 },
      { title: "ملخص المحاسبة العامة",                  fileType: "summary",    courseId: baCourse102.id, uploadedBy: student2Row.id, approvalStatus: "approved", fileUrl: "#", mimeType: "application/pdf", fileSize: 160000 },
    ]);
  }

  // ── Announcements ──────────────────────────────────────────────────────────
  console.log("  Announcements…");
  await resetTable("announcements");
  {
    await db.insert(announcementsTable).values([
      // Global
      {
        title: "أهلاً بك في جامعتي! 🎉",
        content: "يسعدنا إطلاق تطبيق جامعتي — منصتك الشاملة لطلاب الجامعات الموريتانية. اكتشف جدولك الدراسي، ملفات المواد، الواجبات، الامتحانات، والمجتمع الطلابي — كل ذلك في مكان واحد. جامعتك في جيبك!",
        scope: "global", priority: "urgent", createdBy: adminRow.id,
      },
      {
        title: "رسالة من الإدارة: أهمية الحضور المنتظم",
        content: "تذكر الإدارة جميع الطلاب بضرورة الالتزام بالحضور المنتظم في جميع المحاضرات والتمارين التطبيقية. الحضور شرط أساسي لأداء الامتحانات النهائية.",
        scope: "global", priority: "important", createdBy: adminRow.id,
      },
      // University scoped (UAN)
      {
        title: "بدء التسجيلات للفصل الثاني 2025-2026",
        content: "يُعلَن عن فتح باب التسجيلات للفصل الدراسي الثاني اعتباراً من يوم الإثنين القادم. يجب على جميع الطلاب المراجعة لدى أمانة الكلية لإتمام إجراءات التسجيل في الوقت المحدد.",
        scope: "university", universityId: univNouakchott.id, priority: "urgent", createdBy: adminRow.id,
      },
      {
        title: "افتتاح المكتبة الرقمية الجامعية",
        content: "يسعدنا الإعلان عن افتتاح المكتبة الرقمية الجديدة التابعة لجامعة نواكشوط. يمكن لجميع الطلاب الوصول إلى آلاف الكتب والمراجع العلمية عبر بوابة المكتبة الإلكترونية.",
        scope: "university", universityId: univNouakchott.id, priority: "normal", createdBy: adminRow.id,
      },
      // Faculty scoped (CST)
      {
        title: "إعلان هام: تغيير قاعة محاضرة البرمجة الكائنية",
        content: "نُعلم طلاب السنة الثانية علوم الحاسوب بأنه اعتباراً من الأسبوع القادم، ستُعقد محاضرات مادة البرمجة الكائنية في قاعة A201 بدلاً من A101. يُرجى التنبّه لهذا التغيير.",
        scope: "faculty", facultyId: facCST.id, priority: "important", createdBy: adminRow.id,
      },
      // Department scoped (CS)
      {
        title: "تذكير: الامتحان النصفي في مادة قواعد البيانات",
        content: "يُذكَّر طلاب السنة الثانية علوم الحاسوب بأن الامتحان النصفي لمادة قواعد البيانات (CS202) سيُقام بعد 10 أيام في قاعة الامتحانات الكبرى. يُرجى المراجعة الجيدة لمحتوى الفصل الأول.",
        scope: "department", departmentId: deptCS.id, priority: "urgent", createdBy: adminRow.id,
      },
      {
        title: "ملفات جديدة: محاضرات أنظمة التشغيل",
        content: "تم رفع محاضرات الأسابيع 1-4 لمادة أنظمة التشغيل (CS203) على منصة جامعتي. يمكنكم تحميلها من قسم الملفات الخاص بالمادة.",
        scope: "department", departmentId: deptCS.id, priority: "normal", createdBy: adminRow.id,
      },
      // ISCAE announcement
      {
        title: "برنامج التوجيه للطلاب الجدد — ISCAE",
        content: "يُدعى طلاب السنة الأولى إدارة أعمال للمشاركة في برنامج التوجيه والتعريف بمرافق المعهد يوم الإثنين القادم الساعة التاسعة صباحاً في قاعة المحاضرات الكبرى.",
        scope: "university", universityId: univISCAE.id, priority: "important", createdBy: adminRow.id,
      },
    ]);
  }

  // ── Assignments ────────────────────────────────────────────────────────────
  console.log("  Assignments…");
  await resetTable("assignments");
  {
    await db.insert(assignmentsTable).values([
      // CS201
      { title: "واجب البرمجة الكائنية — تصميم نظام مكتبة", description: "صمّم نظاماً لإدارة مكتبة باستخدام مبادئ OOP: الأصناف، الوراثة، والتعددية الشكلية. يجب تسليم الكود مع تقرير قصير.", courseId: csCourse201.id, deadline: daysFromNow(10), createdBy: adminRow.id },
      { title: "مشروع الفصل — تطبيق Java متكامل",           description: "طوّر تطبيقاً متكاملاً بلغة Java يطبق جميع مبادئ OOP التي درسناها. يجب أن يحتوي على واجهة مستخدم بسيطة.", courseId: csCourse201.id, deadline: daysFromNow(25), createdBy: adminRow.id },
      // CS202
      { title: "تمرين قواعد البيانات — نمذجة ER",           description: "صمّم مخطط ER لنظام إدارة مستشفى. يجب أن يشمل جميع الكيانات والعلاقات والقيود. قدّم الملف بصيغة PDF.", courseId: csCourse202.id, deadline: daysFromNow(7),  createdBy: adminRow.id },
      // CS204
      { title: "مشروع الشبكات — محاكاة بروتوكول TCP/IP",   description: "استخدم أداة Packet Tracer لبناء شبكة افتراضية تضم 3 شبكات فرعية مترابطة وكوّن التوجيه بينها.", courseId: csCourse204.id, deadline: daysFromNow(21), createdBy: adminRow.id },
      // Business
      { title: "بحث قصير في مبادئ الإدارة",                description: "اكتب بحثاً من 5 صفحات حول نظريات الإدارة الحديثة وتطبيقاتها في الشركات الموريتانية. يجب توثيق المصادر.", courseId: baCourse101.id, deadline: daysFromNow(14), createdBy: adminRow.id },
      { title: "تحليل قوائم مالية",                        description: "حلّل الميزانية العمومية وقائمة الدخل لشركة وهمية مقدّمة في الملف المرفق.", courseId: baCourse102.id, deadline: daysFromNow(12), createdBy: adminRow.id },
    ]);
  }

  // ── Exams ──────────────────────────────────────────────────────────────────
  console.log("  Exams…");
  await resetTable("exams");
  {
    await db.insert(examsTable).values([
      // CS201
      { title: "امتحان نصفي — البرمجة الكائنية",   courseId: csCourse201.id, date: fmt(daysFromNow(12)), startTime: "09:00", room: "قاعة الامتحانات A", type: "midterm", createdBy: adminRow.id },
      // CS202
      { title: "امتحان نصفي — قواعد البيانات",     courseId: csCourse202.id, date: fmt(daysFromNow(18)), startTime: "09:00", room: "قاعة الامتحانات A", type: "midterm", createdBy: adminRow.id },
      // CS203
      { title: "اختبار أنظمة التشغيل",             courseId: csCourse203.id, date: fmt(daysFromNow(8)),  startTime: "10:00", room: "قاعة الامتحانات B", type: "test",    createdBy: adminRow.id },
      // STAT201
      { title: "اختبار الإحصاء — الفصل الأول",     courseId: csCourse205.id, date: fmt(daysFromNow(5)),  startTime: "11:00", room: "A105",              type: "test",    createdBy: adminRow.id },
      // Business
      { title: "امتحان نصفي — مبادئ الإدارة",      courseId: baCourse101.id, date: fmt(daysFromNow(15)), startTime: "09:00", room: "قاعة الامتحانات C", type: "midterm", createdBy: adminRow.id },
    ]);
  }

  // ── Community Posts ────────────────────────────────────────────────────────
  console.log("  Community posts…");
  await resetTable("posts");
  {
    await db.insert(postsTable).values([
      { content: "مرحباً بالجميع! أنا طالب جديد في قسم علوم الحاسوب، أبحث عن زملاء للمذاكرة معاً. هل أحد مهتم؟ 📚", authorId: studentRow.id, universityId: univNouakchott.id, departmentId: deptCS.id, moderationStatus: "visible", visibility: "same_university" },
      { content: "من لديه ملخص جيد لمادة الخوارزميات (CS102)؟ رجاءً ارفعه في قسم الملفات أو شاركه هنا. شكراً! 🙏", authorId: studentRow.id, universityId: univNouakchott.id, departmentId: deptCS.id, moderationStatus: "visible", visibility: "same_department" },
      { content: "هل تم تغيير قاعة محاضرة قواعد البيانات (CS202)؟ رأيت إعلاناً لكن لم أفهم التفاصيل. أرجو التوضيح. 🏫", authorId: studentRow.id, universityId: univNouakchott.id, departmentId: deptCS.id, moderationStatus: "visible", visibility: "same_department" },
      { content: "نصائح للتحضير لامتحان البرمجة الكائنية:\n1. راجع مفهوم الوراثة جيداً\n2. تدرّب على كتابة الكلاسات\n3. اقرأ أمثلة Java الموجودة في المحاضرة 3\n\nالامتحان سهل إذا راجعتم بشكل جيد 💪", authorId: professor.id, universityId: univNouakchott.id, departmentId: deptCS.id, moderationStatus: "visible", visibility: "same_department", isPinned: true },
      { content: "ما أفضل طريقة لمراجعة مادة الإحصاء (STAT201)؟ هل ننصح بحل تمارين الكتاب أم الاكتفاء بالمحاضرات؟ 📊", authorId: studentRow.id, universityId: univNouakchott.id, departmentId: deptCS.id, moderationStatus: "visible", visibility: "same_university" },
      { content: "مرحباً من قسم إدارة الأعمال! 👋 هل هناك أي مجموعة لمناقشة موضوع الاقتصاد الجزئي (ECO101)؟ الفصل صعب!", authorId: student2Row.id, universityId: univISCAE.id, departmentId: deptBA.id, moderationStatus: "visible", visibility: "same_university" },
      { content: "تم رفع ملخص مادة المحاسبة العامة على جامعتي. حجمه صغير لكن يغطي المحاور الرئيسية. ادعوا الله لي في الامتحان 🤲", authorId: student2Row.id, universityId: univISCAE.id, departmentId: deptBA.id, moderationStatus: "visible", visibility: "same_department" },
    ]);
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  console.log("  Events…");
  await resetTable("events");
  {
    await db.insert(eventsTable).values([
      {
        title: "ملتقى التوظيف الجامعي 2026",
        description: "يجمع الملتقى أكثر من 30 شركة وطنية ودولية تبحث عن مواهب شابة من طلاب وخريجي الجامعات الموريتانية. فرصة ذهبية لتسليم سيرتك الذاتية ومقابلة أصحاب العمل.",
        type: "conference", location: "قاعة الملتقيات الكبرى — جامعة نواكشوط",
        startDate: daysFromNow(14), endDate: daysFromNow(15),
        universityId: univNouakchott.id, createdBy: adminRow.id,
      },
      {
        title: "ورشة عمل: تطوير تطبيقات الويب بـ React",
        description: "ورشة عمل تطبيقية مدتها يوم كامل لتعلم أسس React.js وبناء تطبيق ويب عملي من الصفر. مفتوحة لجميع طلاب العلوم والتقنيات.",
        type: "workshop", location: "مختبر الحاسوب — كلية العلوم والتقنيات",
        startDate: daysFromNow(7), endDate: daysFromNow(7),
        universityId: univNouakchott.id, createdBy: adminRow.id,
      },
      {
        title: "مسابقة البرمجة الجامعية — Hackathon 2026",
        description: "احتفل بشغفك بالبرمجة! 48 ساعة متواصلة لبناء حلول تقنية إبداعية لمشاكل حقيقية. جوائز قيمة للفرق الفائزة. التسجيل مفتوح لجميع الطلاب.",
        type: "competition", location: "حرم المعهد العالي للتجارة — ISCAE",
        startDate: daysFromNow(21), endDate: daysFromNow(23),
        universityId: univISCAE.id, createdBy: adminRow.id,
      },
    ]);
  }

  // ── Opportunities ──────────────────────────────────────────────────────────
  console.log("  Opportunities…");
  await resetTable("opportunities");
  {
    await db.insert(opportunitiesTable).values([
      {
        title: "تدريب صيفي: مطوّر تطبيقات في شركة تقنية",
        description: "فرصة تدريب مدفوعة الأجر لمدة 3 أشهر في شركة تقنية ناشئة بنواكشوط. المطلوب: معرفة بـ Python أو JavaScript، حماس للتعلم، وروح العمل الجماعي.",
        type: "internship", organization: "TechMR Solutions", location: "نواكشوط",
        deadline: fmt(daysFromNow(20)), status: "active", isFeatured: true, link: "#", createdBy: adminRow.id,
      },
      {
        title: "منحة تدريبية: تحليل البيانات وعلوم البيانات",
        description: "منحة كاملة للمشاركة في برنامج تدريبي مكثّف في مجال تحليل البيانات وتعلم الآلة. المنحة تغطي رسوم التسجيل بالكامل للطلاب المتفوقين.",
        type: "scholarship", organization: "صندوق الرقمنة الموريتاني", location: "عن بُعد",
        deadline: fmt(daysFromNow(30)), status: "active", isFeatured: true, link: "#", createdBy: adminRow.id,
      },
      {
        title: "مسابقة البرمجة الطلابية — جائزة 50,000 أوقية",
        description: "مسابقة بين طلاب الجامعات الموريتانية في حل مسائل برمجية. المنافسة تتم عبر الإنترنت. الجائزة الأولى 50,000 أوقية موريتانية جديدة.",
        type: "competition", organization: "المنظمة الوطنية لطلاب العلوم التطبيقية", location: "عن بُعد",
        deadline: fmt(daysFromNow(15)), status: "active", isFeatured: false, link: "#", createdBy: adminRow.id,
      },
      {
        title: "ورشة: كتابة السيرة الذاتية والبحث عن عمل",
        description: "ورشة عملية يقدمها خبراء في مجال الموارد البشرية لمساعدتك في كتابة سيرة ذاتية احترافية وتحضير نفسك للمقابلات الوظيفية.",
        type: "training", organization: "مركز التوجيه المهني الجامعي", location: "نواكشوط",
        deadline: fmt(daysFromNow(10)), status: "active", isFeatured: false, link: "#", createdBy: adminRow.id,
      },
      {
        title: "فرصة تطوع: مساعد منظّم في فعالية الملتقى الجامعي",
        description: "ابحث عن تجربة تطوعية تُثري سيرتك الذاتية وتوسّع شبكة علاقاتك. ننظّم فريق المتطوعين لملتقى التوظيف الجامعي 2026. لا خبرة مطلوبة.",
        type: "volunteering", organization: "نادي البرمجة الجامعي", location: "نواكشوط",
        deadline: fmt(daysFromNow(12)), status: "active", isFeatured: false, link: "#", createdBy: adminRow.id,
      },
      {
        title: "مشروع عمل حر: تطوير موقع إلكتروني لشركة محلية",
        description: "تطوير موقع ويب احترافي لشركة تجارية محلية. الميزانية 50,000 أوقية. العمل عن بُعد، مدة التسليم 3 أسابيع. يُشترط معرفة HTML/CSS/JS.",
        type: "freelance", organization: "شركة تجارية موريتانية", location: "عن بُعد",
        deadline: fmt(daysFromNow(7)), status: "active", isFeatured: false, link: "#", createdBy: adminRow.id,
      },
    ]);
  }

  // ── Clubs ──────────────────────────────────────────────────────────────────
  console.log("  Clubs…");
  await resetTable("clubs");
  {
    await db.insert(clubsTable).values([
      { name: "نادي البرمجة والتقنية", description: "نادٍ يجمع عشاق البرمجة وتطوير البرمجيات. ننظم ورش عمل، هاكاثونات، وجلسات تدريبية أسبوعية.", universityId: univNouakchott.id, presidentId: professor.id, memberCount: 47, status: "active" },
      { name: "نادي ريادة الأعمال",    description: "نادٍ يهتم بتطوير مهارات ريادة الأعمال والابتكار. نستضيف رواد أعمال ناجحين ونطلق مشاريع طلابية.", universityId: univISCAE.id,        presidentId: adminRow.id,    memberCount: 32, status: "active" },
      { name: "نادي القراءة والثقافة", description: "نادٍ ثقافي يعزز ثقافة القراءة والنقاش الفكري بين الطلاب. نجتمع أسبوعياً لمناقشة كتاب مختار.",  universityId: univNouakchott.id, presidentId: adminRow.id,    memberCount: 18, status: "active" },
    ]);
  }

  console.log("✅  Seed complete!");
  console.log("");
  console.log("   Demo accounts:");
  console.log("   📧 student@jamiati.mr  / Student@1234  → UAN > CST > علوم الحاسوب > S2 > Group A");
  console.log("   📧 student2@jamiati.mr / Student@1234  → ISCAE > إدارة الأعمال > S1 > Group A");
  console.log("   📧 prof@jamiati.mr     / Prof@1234     → Professor");
  console.log("   📧 admin@jamiati.mr    / Admin@1234    → Super Admin");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
