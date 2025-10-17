/*
<ai_context>
Billing resolver utilities. Provides getUserPlan(userId) with lazy trial expiry and default-row creation.
</ai_context>
*/

import { db } from "@/db/db"
import { userPlansTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import type { PlanInfo, PlanTier } from "@/types"

function isPast(d?: Date | null) {
  return !!d && d.getTime() < Date.now()
}

export async function getUserPlan(userId: string): Promise<PlanInfo> {
  // 1) Fetch existing row
  const existing = await db.query.userPlans.findFirst({
    where: eq(userPlansTable.userId, userId)
  })

  // 2) If none, create default free
  if (!existing) {
    try {
      await db.insert(userPlansTable).values({ userId, plan: "free" })
    } catch {}
    return { plan: "free", trialEnd: null }
  }

  // 3) Lazy expire trial
  if (existing.plan === "trial" && isPast(existing.trialEnd)) {
    await db
      .update(userPlansTable)
      .set({ plan: "free", trialEnd: null, updatedAt: new Date() })
      .where(eq(userPlansTable.userId, userId))
    return { plan: "free", trialEnd: null }
  }

  return { plan: existing.plan as PlanTier, trialEnd: existing.trialEnd }
}
