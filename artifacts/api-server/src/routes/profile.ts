import { Router } from "express";
import { db, usersTable, profilesTable, universitiesTable, facultiesTable, departmentsTable, levelsTable, studentGroupsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function getFullProfile(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId)).limit(1);
  if (!profile) return { ...user, profile: null };

  const university = profile.universityId
    ? (await db.select().from(universitiesTable).where(eq(universitiesTable.id, profile.universityId)).limit(1))[0] ?? null
    : null;
  const faculty = profile.facultyId
    ? (await db.select().from(facultiesTable).where(eq(facultiesTable.id, profile.facultyId)).limit(1))[0] ?? null
    : null;
  const department = profile.departmentId
    ? (await db.select().from(departmentsTable).where(eq(departmentsTable.id, profile.departmentId)).limit(1))[0] ?? null
    : null;
  const level = profile.levelId
    ? (await db.select().from(levelsTable).where(eq(levelsTable.id, profile.levelId)).limit(1))[0] ?? null
    : null;
  const group = profile.groupId
    ? (await db.select().from(studentGroupsTable).where(eq(studentGroupsTable.id, profile.groupId)).limit(1))[0] ?? null
    : null;

  const { passwordHash: _, ...safeUser } = user;
  return { ...safeUser, profile: { ...profile, university, faculty, department, level, group } };
}

// GET /profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const data = await getFullProfile(req.userId!);
    if (!data) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "GetProfile error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// PUT /profile
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { fullName, phone, bio, skills, privacy, language, linkedinUrl, githubUrl, portfolioUrl } = req.body as Record<string, string | string[]>;

    if (fullName) {
      await db.update(usersTable).set({ fullName: fullName as string, updatedAt: new Date() }).where(eq(usersTable.id, req.userId!));
    }

    const profileUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (bio !== undefined) profileUpdate.bio = bio;
    if (skills !== undefined) profileUpdate.skills = Array.isArray(skills) ? skills : [skills];
    if (privacy !== undefined) profileUpdate.privacy = privacy;
    if (language !== undefined) profileUpdate.language = language;
    if (linkedinUrl !== undefined) profileUpdate.linkedinUrl = linkedinUrl;
    if (githubUrl !== undefined) profileUpdate.githubUrl = githubUrl;
    if (portfolioUrl !== undefined) profileUpdate.portfolioUrl = portfolioUrl;
    if (phone !== undefined) {
      await db.update(usersTable).set({ phone: phone as string }).where(eq(usersTable.id, req.userId!));
    }

    await db.update(profilesTable).set(profileUpdate).where(eq(profilesTable.userId, req.userId!));

    const data = await getFullProfile(req.userId!);
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "UpdateProfile error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /profile/complete-onboarding
router.post("/profile/complete-onboarding", requireAuth, async (req, res) => {
  try {
    const { universityId, facultyId, departmentId, levelId, groupId, language } = req.body as Record<string, string>;
    if (!universityId || !facultyId || !departmentId || !levelId) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "universityId, facultyId, departmentId, and levelId are required" } });
      return;
    }
    await db.update(profilesTable).set({
      universityId,
      facultyId,
      departmentId,
      levelId,
      groupId: groupId || null,
      language: (language as "ar" | "fr" | "en") || "ar",
      onboardingComplete: true,
      updatedAt: new Date(),
    }).where(eq(profilesTable.userId, req.userId!));

    const data = await getFullProfile(req.userId!);
    res.json({ success: true, data });
  } catch (err) {
    req.log.error({ err }, "CompleteOnboarding error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

export default router;
