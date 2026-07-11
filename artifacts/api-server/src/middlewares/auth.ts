import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";



export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: "INVALID_TOKEN", message: "Invalid or expired token" },
    });
  }
}

/**
 * Sets req.userId/req.userRole when a valid Bearer token is present, but never
 * rejects the request. Used by routes that serve public content to anonymous
 * visitors (guest mode) and richer, scoped content to authenticated students.
 * Handlers must treat a missing req.userId as "anonymous: public rows only".
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(auth.slice(7));
      req.userId = payload.userId;
      req.userRole = payload.role;
    } catch {
      // Invalid/expired token on an optional route → treat as anonymous.
    }
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      });
      return;
    }
    next();
  };
}
