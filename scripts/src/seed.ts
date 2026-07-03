/**
 * Jamiati — جامعتي · Seed script
 * Run: pnpm --filter @workspace/scripts run seed
 *
 * Creates initial data: universities, faculties, departments, levels, groups,
 * plans, a super-admin user, and sample courses.
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
  announcementsTable,
  eventsTable,
  opportunitiesTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱  Starting seed...");

  // ─── Plans ────────────────────────────────────────────────────────────────
  console.log("  Plans...");
  const [freePlan, plusPlan, premiumPlan] = await db
    .insert(plansTable)
    .values([
      { name: "Free", nameAr: "مجاني", priceMru: 0, durationDays: 36500, features: ['files', 'announcements', 'timetable', 'ai'], isActive: true },
      { name: "Plus", nameAr: "بلاس", priceMru: 500, durationDays: 30, features: ['files', 'announcements', 'timetable', 'community', 'ai', 'downloads'], isActive: true },
      { name: "Premium AI", nameAr: "الذكاء الاصطناعي المميز", priceMru: 1000, durationDays: 30, features: ['files', 'announcements', 'timetable', 'community', 'ai', 'downloads', 'aiUnlimited'], isActive: true },
    ])
    .onConflictDoNothing()
    .returning();

  // ─── Universities ─────────────────────────────────────────────────────────
  console.log("  Universities...");
  const [univ1] = await db
    .insert(universitiesTable)
    .values({
      name: "University of Nouakchott",
      nameAr: "جامعة نواكشوط",
      city: "Nouakchott",
      status: "official_partner",
    })
    .onConflictDoNothing()
    .returning();

  const [univ2] = await db
    .insert(universitiesTable)
    .values({
      name: "ISCAE Mauritania",
      nameAr: "المعهد العالي للتجارة والإدارة والاقتصاد",
      city: "Nouakchott",
      status: "verified",
    })
    .onConflictDoNothing()
    .returning();

  // ─── Faculties ────────────────────────────────────────────────────────────
  console.log("  Faculties...");
  const [facSci, facLetters, facLaw, facMed] = await db
    .insert(facultiesTable)
    .values([
      { universityId: univ1.id, name: "Faculty of Sciences and Technology", nameAr: "كلية العلوم والتقنيات" },
      { universityId: univ1.id, name: "Faculty of Letters and Humanities", nameAr: "كلية الآداب والعلوم الإنسانية" },
      { universityId: univ1.id, name: "Faculty of Law and Political Sciences", nameAr: "كلية الحقوق والعلوم السياسية" },
      { universityId: univ1.id, name: "Faculty of Medicine", nameAr: "كلية الطب" },
    ])
    .returning();

  // ─── Departments ──────────────────────────────────────────────────────────
  console.log("  Departments...");
  const [deptCS, deptMath, deptPhys] = await db
    .insert(departmentsTable)
    .values([
      { facultyId: facSci!.id, name: "Computer Science", nameAr: "علوم الحاسوب" },
      { facultyId: facSci!.id, name: "Mathematics", nameAr: "الرياضيات" },
      { facultyId: facSci!.id, name: "Physics", nameAr: "الفيزياء" },
    ])
    .returning();

  // ─── Levels ───────────────────────────────────────────────────────────────
  console.log("  Levels...");
  const levels = await db
    .insert(levelsTable)
    .values([
      { departmentId: deptCS!.id, name: "Year 1 — Licence", yearNumber: 1 },
      { departmentId: deptCS!.id, name: "Year 2 — Licence", yearNumber: 2 },
      { departmentId: deptCS!.id, name: "Year 3 — Licence", yearNumber: 3 },
      { departmentId: deptCS!.id, name: "Year 1 — Master", yearNumber: 1 },
      { departmentId: deptCS!.id, name: "Year 2 — Master", yearNumber: 2 },
      { departmentId: deptMath!.id, name: "Year 1 — Licence", yearNumber: 1 },
      { departmentId: deptMath!.id, name: "Year 2 — Licence", yearNumber: 2 },
    ])
    .returning();

  const [l1cs, l2cs, l3cs] = levels;

  // ─── Groups ───────────────────────────────────────────────────────────────
  console.log("  Groups...");
  await db
    .insert(studentGroupsTable)
    .values([
      { levelId: l1cs!.id, name: "Group A" },
      { levelId: l1cs!.id, name: "Group B" },
      { levelId: l2cs!.id, name: "Group A" },
      { levelId: l2cs!.id, name: "Group B" },
      { levelId: l3cs!.id, name: "Group A" },
    ])
    .returning();

  // ─── Super Admin ──────────────────────────────────────────────────────────
  console.log("  Users...");
  const adminHash = await bcrypt.hash("Admin@1234", 12);
  const [admin] = await db
    .insert(usersTable)
    .values({
      fullName: "Super Admin",
      email: "admin@jamiati.mr",
      passwordHash: adminHash,
      role: "super_admin",
      emailVerified: true,
    })
    .onConflictDoNothing()
    .returning();

  if (admin) {
    await db.insert(profilesTable).values({ userId: admin.id, language: "ar", onboardingComplete: true }).onConflictDoNothing();
  }

  // Student demo user
  const studentHash = await bcrypt.hash("Student@1234", 12);
  const [student] = await db
    .insert(usersTable)
    .values({
      fullName: "أحمد ولد محمد",
      email: "student@jamiati.mr",
      passwordHash: studentHash,
      role: "student",
      emailVerified: true,
    })
    .onConflictDoNothing()
    .returning();

  if (student) {
    await db.insert(profilesTable).values({
      userId: student.id,
      universityId: univ1.id,
      facultyId: facSci!.id,
      departmentId: deptCS!.id,
      levelId: l2cs!.id,
      language: "ar",
      onboardingComplete: true,
    }).onConflictDoNothing();
  }

  // Professor
  const profHash = await bcrypt.hash("Prof@1234", 12);
  const [professor] = await db
    .insert(usersTable)
    .values({
      fullName: "Dr. Mohamed Lemine",
      email: "prof@jamiati.mr",
      passwordHash: profHash,
      role: "professor",
      emailVerified: true,
    })
    .onConflictDoNothing()
    .returning();

  // ─── Courses ──────────────────────────────────────────────────────────────
  console.log("  Courses...");
  if (professor) {
    await db
      .insert(coursesTable)
      .values([
        { name: "Algorithms & Data Structures", nameAr: "الخوارزميات وهياكل البيانات", code: "CS201", departmentId: deptCS!.id, levelId: l2cs!.id, professorId: professor.id, semester: "S1", description: "Fundamental algorithms and data structures for software development." },
        { name: "Object-Oriented Programming", nameAr: "البرمجة كائنية التوجه", code: "CS202", departmentId: deptCS!.id, levelId: l2cs!.id, professorId: professor.id, semester: "S1", description: "OOP principles using Java and Python." },
        { name: "Database Systems", nameAr: "نظم قواعد البيانات", code: "CS203", departmentId: deptCS!.id, levelId: l2cs!.id, professorId: professor.id, semester: "S1", description: "Relational databases, SQL, and database design." },
        { name: "Operating Systems", nameAr: "أنظمة التشغيل", code: "CS204", departmentId: deptCS!.id, levelId: l2cs!.id, professorId: professor.id, semester: "S2", description: "Process management, memory, and file systems." },
        { name: "Computer Networks", nameAr: "شبكات الحاسوب", code: "CS205", departmentId: deptCS!.id, levelId: l2cs!.id, professorId: professor.id, semester: "S2", description: "Network protocols, TCP/IP, and web technologies." },
      ])
      .onConflictDoNothing();
  }

  // ─── Get admin id (may have been skipped if already exists) ───────────────
  const adminRow = admin ?? (await db.select().from(usersTable).where(eq(usersTable.email, "admin@talibmr.com")).limit(1))[0]!;

  // ─── Announcements ────────────────────────────────────────────────────────
  console.log("  Announcements...");
  await db.insert(announcementsTable).values([
    { title: "أهلاً بك في جامعتي!", content: "يسعدنا إطلاق جامعتي — التطبيق الشامل لطلاب الجامعات الموريتانية. جامعتك في جيبك. اكتشف كل الميزات!", scope: "global", priority: "urgent", createdBy: adminRow.id },
    { title: "Upload your course files", content: "Students can now share their course materials — lectures, summaries, past exams — with fellow students.", scope: "global", priority: "important", createdBy: adminRow.id },
  ]).onConflictDoNothing();

  // ─── Events ───────────────────────────────────────────────────────────────
  console.log("  Events...");
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(eventsTable).values([
    { title: "Tech Talk: AI in Mauritania", description: "Join us for an inspiring talk about the future of AI in Mauritania.", startDate: nextWeek, endDate: new Date(nextWeek.getTime() + 3 * 60 * 60 * 1000), location: "Lecture Hall A, UAN", type: "conference", universityId: univ1.id, createdBy: adminRow.id },
    { title: "Hackathon 2026", description: "48-hour competition open to all students. Form teams and solve real problems.", startDate: nextMonth, endDate: new Date(nextMonth.getTime() + 2 * 24 * 60 * 60 * 1000), location: "ISCAE Campus", type: "competition", universityId: univ2.id, createdBy: adminRow.id },
  ]).onConflictDoNothing();

  // ─── Opportunities ────────────────────────────────────────────────────────
  console.log("  Opportunities...");
  const fmt = (d: Date) => d.toISOString().split("T")[0]!;
  await db.insert(opportunitiesTable).values([
    { title: "Web Developer Intern", description: "3-month paid internship at a Nouakchott tech startup.", type: "internship", organization: "TechMR", location: "Nouakchott", deadline: fmt(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)), status: "active", isFeatured: true, link: "#", createdBy: adminRow.id },
    { title: "Data Analysis Scholarship", description: "Full scholarship for an online Data Science bootcamp.", type: "scholarship", organization: "Mauritania Digital Fund", location: "Remote", deadline: fmt(new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)), status: "active", isFeatured: true, link: "#", createdBy: adminRow.id },
    { title: "Mobile Dev Freelance Project", description: "Build a simple app for a local business. 50,000 MRU budget.", type: "freelance", organization: "Local Client", location: "Remote", deadline: fmt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), status: "active", isFeatured: false, link: "#", createdBy: adminRow.id },
  ]).onConflictDoNothing();

  console.log("✅  Seed complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
