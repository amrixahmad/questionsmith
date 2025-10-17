"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db/db"
import { userPlansTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getUserPlan } from "@/lib/billing"
import type { ActionState, PlanInfo } from "@/types"

export async function getPlanAction(): Promise<ActionState<PlanInfo>> {
  try {
    const { userId } = await auth()
    if (!userId) return { isSuccess: false, message: "Not authenticated" }

    const info = await getUserPlan(userId)
    return { isSuccess: true, message: "Plan retrieved", data: info }
  } catch (error) {
    console.error("getPlanAction error", error)
    return { isSuccess: false, message: "Failed to get plan" }
  }
}

export async function startTrialAction(): Promise<ActionState<PlanInfo>> {
  try {
    const { userId } = await auth()
    if (!userId) return { isSuccess: false, message: "Not authenticated" }

    const existing = await db.query.userPlans.findFirst({
      where: eq(userPlansTable.userId, userId)
    })

    // If already on trial and not expired, just return current state
    const now = new Date()
    if (existing?.plan === "trial" && existing.trialEnd && existing.trialEnd > now) {
      return { isSuccess: true, message: "Trial already active", data: { plan: "trial", trialEnd: existing.trialEnd } }
    }

    // Enforce one trial per user
    if (existing?.trialUsed) {
      const info = await getUserPlan(userId)
      return { isSuccess: false, message: "Trial already used", data: info as any }
    }

    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    if (!existing) {
      await db.insert(userPlansTable).values({
        userId,
        plan: "trial",
        trialStartedAt: now,
        trialEnd,
        trialUsed: true,
        updatedAt: now
      })
    } else {
      await db
        .update(userPlansTable)
        .set({ plan: "trial", trialStartedAt: now, trialEnd, trialUsed: true, updatedAt: now })
        .where(eq(userPlansTable.userId, userId))
    }

    return { isSuccess: true, message: "Trial started", data: { plan: "trial", trialEnd } }
  } catch (error) {
    console.error("startTrialAction error", error)
    return { isSuccess: false, message: "Failed to start trial" }
  }
}
