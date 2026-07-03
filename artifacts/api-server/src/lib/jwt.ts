import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET =
  process.env["JWT_ACCESS_SECRET"] ?? "talib-mr-access-dev-secret-change-in-production";
const REFRESH_SECRET =
  process.env["JWT_REFRESH_SECRET"] ?? "talib-mr-refresh-dev-secret-change-in-production";

export interface AccessTokenPayload {
  userId: string;
  role: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "30d" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, REFRESH_SECRET) as { userId: string };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
