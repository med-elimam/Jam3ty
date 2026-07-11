/**
 * Jamiati — جامعتي · Subscription plans + entitlements seed
 * Run: pnpm --filter @workspace/scripts run seed:plans
 *
 * PRODUCTION-SAFE and idempotent. Unlike the full `seed` script this touches
 * ONLY the `plans` and `plan_entitlements` tables — it never creates demo
 * universities/users/content, so it is safe to run against a live database.
 *
 * What it does:
 *  - Upserts the 4 canonical plans by their stable `name` (Free + 3 Jam3ty Plus
 *    tiers). Existing plan rows are updated in place, so subscriptions/payments
 *    that reference them keep working; only UNREFERENCED non-canonical plans are
 *    removed (billing history is never touched).
 *  - Links each paid Plus plan to the premium entitlements that actually unlock
 *    features server-side: files.view, exams.view, assignments.view, ai.use.
 *  - Clears entitlements on the Free plan (free access is handled by per-route
 *    caps in the API — see FREE_TIER_LIMITS in subscription-service.ts).
 *
 * Adjust prices, names, durations, and PLUS_ENTITLEMENTS below to taste, then
 * re-run — it converges to whatever this file declares.
 */

import { db, plansTable, planEntitlementsTable } from "@workspace/db";
import { and, eq, gt, sql } from "drizzle-orm";

// The premium entitlements a paid plan grants. These keys must match the
// requireEntitlement()/isPlusUser() checks in the API (ai.use is the only hard
// gate; files/exams/assignments are limited-vs-unlimited).
const PLUS_ENTITLEMENTS = ["files.view", "exams.view", "assignments.view", "ai.use"] as const;

// Canonical plans, keyed by their stable English `name` (used for upsert match).
const CANONICAL_PLANS: (typeof plansTable.$inferInsert)[] = [
  { name: "Free", nameAr: "مجاني", nameFr: "Gratuit", priceMru: 0, durationDays: 36500,
    features: ["المواد", "الجدول الدراسي", "المجتمع", "الإعلانات", "ملفات محدودة", "معاينة PDF والفيديو"] },
  { name: "Jamiati Plus — Monthly", nameAr: "جامعتي بلس — شهري", nameFr: "Jamiati Plus — Mensuel",
    priceMru: 100, durationDays: 30, features: ["كل الملفات", "كل الامتحانات مع الحلول", "كل الواجبات", "الذكاء الاصطناعي", "التنزيل للاستخدام دون اتصال"] },
  { name: "Jamiati Plus — Semester", nameAr: "جامعتي بلس — سداسي", nameFr: "Jamiati Plus — Semestriel",
    priceMru: 400, durationDays: 120, features: ["كل الملفات", "كل الامتحانات مع الحلول", "كل الواجبات", "الذكاء الاصطناعي", "التنزيل للاستخدام دون اتصال"] },
  { name: "Jamiati Plus — Yearly", nameAr: "جامعتي بلس — سنوي", nameFr: "Jamiati Plus — Annuel",
    priceMru: 800, durationDays: 365, features: ["كل الملفات", "كل الامتحانات مع الحلول", "كل الواجبات", "الذكاء الاصطناعي", "التنزيل للاستخدام دون اتصال"] },
];

async function main() {
  console.log("🌱  Seeding subscription plans + entitlements…");

  await db.transaction(async (tx) => {
    // 1. Deactivate everything, then upsert the canonical plans (re-activating them).
    await tx.update(plansTable).set({ isActive: false });

    const keepIds: string[] = [];
    for (const plan of CANONICAL_PLANS) {
      const [existing] = await tx.select().from(plansTable).where(eq(plansTable.name, plan.name)).limit(1);
      if (existing) {
        await tx.update(plansTable).set({ ...plan, isActive: true, updatedAt: new Date() }).where(eq(plansTable.id, existing.id));
        keepIds.push(existing.id);
        console.log(`   ↻ updated: ${plan.name}`);
      } else {
        const [row] = await tx.insert(plansTable).values({ ...plan, isActive: true }).returning();
        keepIds.push(row!.id);
        console.log(`   + created: ${plan.name}`);
      }
    }

    // 2. Remove only NON-canonical, UNREFERENCED plan rows (never touch billing history).
    const keepList = keepIds.map((id) => `'${id}'`).join(",");
    await tx.execute(sql.raw(`
      DELETE FROM plans p
      WHERE p.id NOT IN (${keepList})
        AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.plan_id = p.id)
        AND NOT EXISTS (SELECT 1 FROM payments pm WHERE pm.plan_id = p.id)
        AND NOT EXISTS (SELECT 1 FROM activation_codes ac WHERE ac.plan_id = p.id)
    `));
  });

  // 3. Set entitlements: paid plans get the full premium set, free plans get none.
  const paidPlans = await db.select().from(plansTable).where(and(eq(plansTable.isActive, true), gt(plansTable.priceMru, 0)));
  const freePlans = await db.select().from(plansTable).where(and(eq(plansTable.isActive, true), eq(plansTable.priceMru, 0)));

  for (const plan of paidPlans) {
    await db.transaction(async (tx) => {
      await tx.delete(planEntitlementsTable).where(eq(planEntitlementsTable.planId, plan.id));
      await tx.insert(planEntitlementsTable).values(
        PLUS_ENTITLEMENTS.map((key) => ({ planId: plan.id, entitlementKey: key, limitValue: null })),
      );
    });
    console.log(`   🔓 ${plan.name}: ${PLUS_ENTITLEMENTS.join(", ")}`);
  }

  for (const plan of freePlans) {
    await db.delete(planEntitlementsTable).where(eq(planEntitlementsTable.planId, plan.id));
    console.log(`   ⋯ ${plan.name}: no entitlements (free tier via per-route caps)`);
  }

  console.log("✅  Plans + entitlements seeded.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌  Plan seed failed:", err);
  process.exit(1);
});
