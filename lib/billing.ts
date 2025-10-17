/*
<ai_context>
Billing resolver utilities. Provides getUserPlan(userId) with lazy trial expiry and default-row creation.
</ai_context>
*/

import { db } from "@/db/db"
import { userPlansTable, profilesTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import type { PlanInfo, PlanTier } from "@/types"

function isPast(d?: Date | null) {
  return !!d && d.getTime() < Date.now()
}

export async function getUserPlan(userId: string): Promise<PlanInfo> {
  // 1) Fetch existing row + profile (for membership sync)
  const [existing, profile] = await Promise.all([
    db.query.userPlans.findFirst({ where: eq(userPlansTable.userId, userId) }),
    db.query.profiles.findFirst({ where: eq(profilesTable.userId, userId) })
  ])

  // 2) If none, create default from profile membership (pro if applicable)
  if (!existing) {
    const isPro = profile?.membership === "pro"
    const plan: PlanTier = isPro ? "pro" : "free"
    try {
      await db.insert(userPlansTable).values({ userId, plan })
    } catch {}
    return { plan, trialEnd: null }
  }

  // 3) Lazy expire trial
  if (existing.plan === "trial" && isPast(existing.trialEnd)) {
    await db
      .update(userPlansTable)
      .set({ plan: "free", trialEnd: null, updatedAt: new Date() })
      .where(eq(userPlansTable.userId, userId))
    return { plan: "free", trialEnd: null }
  }

  // 4) Ensure upgrades via Stripe membership reflect immediately
  if (profile?.membership === "pro" && existing.plan !== "pro") {
    await db
      .update(userPlansTable)
      .set({ plan: "pro", trialEnd: null, updatedAt: new Date() })
      .where(eq(userPlansTable.userId, userId))
    return { plan: "pro", trialEnd: null }
  }

  return { plan: existing.plan as PlanTier, trialEnd: existing.trialEnd }
}
