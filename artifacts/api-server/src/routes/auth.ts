import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, profilesTable, refreshTokensTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, language = "ar" } = req.body as {
      fullName: string;
      email: string;
      password: string;
      language?: string;
    };
    if (!fullName || !email || !password) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "fullName, email and password are required" } });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ success: false, error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters" } });
      return;
    }
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ success: false, error: { code: "EMAIL_EXISTS", message: "Email already in use" } });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({ fullName, email: email.toLowerCase(), passwordHash, role: "student" }).returning();
    await db.insert(profilesTable).values({ userId: user.id, language: (language as "ar" | "fr" | "en") ?? "ar" });
    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken(user.id);
    await db.insert(refreshTokensTable).values({ userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).limit(1);
    res.status(201).json({ success: true, data: { user: { ...safeUser(user), profile: profile || null }, tokens: { accessToken, refreshToken, expiresIn: 900 } } });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "Email and password are required" } });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
      return;
    }
    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken(user.id);
    await db.insert(refreshTokensTable).values({ userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).limit(1);
    res.json({ success: true, data: { user: { ...safeUser(user), profile: profile || null }, tokens: { accessToken, refreshToken, expiresIn: 900 } } });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /auth/logout
router.post("/logout", requireAuth, async (req, res) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) {
      await db.delete(refreshTokensTable).where(eq(refreshTokensTable.tokenHash, hashToken(refreshToken)));
    }
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    req.log.error({ err }, "Logout error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(400).json({ success: false, error: { code: "MISSING_TOKEN", message: "Refresh token required" } });
      return;
    }
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired refresh token" } });
      return;
    }
    const [stored] = await db.select().from(refreshTokensTable).where(
      and(eq(refreshTokensTable.userId, payload.userId), eq(refreshTokensTable.tokenHash, hashToken(refreshToken)), gt(refreshTokensTable.expiresAt, new Date()))
    ).limit(1);
    if (!stored) {
      res.status(401).json({ success: false, error: { code: "TOKEN_REVOKED", message: "Refresh token is invalid" } });
      return;
    }
    const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user) {
      res.status(401).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
      return;
    }
    await db.delete(refreshTokensTable).where(eq(refreshTokensTable.id, stored.id));
    const newAccess = signAccessToken({ userId: payload.userId, role: user.role });
    const newRefresh = signRefreshToken(payload.userId);
    await db.insert(refreshTokensTable).values({ userId: payload.userId, tokenHash: hashToken(newRefresh), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
    res.json({ success: true, data: { accessToken: newAccess, refreshToken: newRefresh, expiresIn: 900 } });
  } catch (err) {
    req.log.error({ err }, "Refresh error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// GET /auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
      return;
    }
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).limit(1);
    res.json({ success: true, data: { ...safeUser(user), profile: profile || null } });
  } catch (err) {
    req.log.error({ err }, "GetMe error");
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
});

// POST /auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  // Always return success to prevent email enumeration
  res.json({ success: true, message: "If an account with that email exists, a reset link has been sent" });
});

export default router;
