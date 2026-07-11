import type { NextFunction, Request, Response } from "express";
import { canAccess } from "../services/subscription-service";

export function requireEntitlement(entitlementKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }
    try {
      const access = await canAccess(req.userId, entitlementKey);
      if (!access.allowed) {
        res.status(403).json({
          success: false,
          error: {
            code: "SUBSCRIPTION_REQUIRED",
            message: "An active subscription with this entitlement is required",
            entitlement: entitlementKey,
            subscriptionStatus: access.subscription?.status ?? "none",
            upgradeRequired: true,
          },
        });
        return;
      }
      next();
    } catch (err) {
      req.log.error({ err, entitlementKey }, "Entitlement check failed");
      res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
    }
  };
}
