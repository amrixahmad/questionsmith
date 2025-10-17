/*
<ai_context>
Helpers to compute generation usage and caps per plan for messaging and gating.
</ai_context>
*/

import { db } from "@/db/db"
import { quizzesTable, userPlansTable } from "@/db/schema"
import { and, eq, gte } from "drizzle-orm"
import { getUserPlan } from "@/lib/billing"
import type { GenerationUsage } from "@/types"

export async function getGenerationUsage(
  userId: string
): Promise<GenerationUsage> {
  const planInfo = await getUserPlan(userId)
  const plan = planInfo.plan

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)

  const monthlyCap = plan === "free" ? 5 : plan === "pro" ? 100 : null

  let monthlyUsed = 0
  if (monthlyCap != null) {
    monthlyUsed = (
      await db.query.quizzes.findMany({
        where: and(
          eq(quizzesTable.userId, userId),
          gte(quizzesTable.createdAt, monthStart)
        ),
        columns: { id: true }
      })
    ).length
  }

  const monthlyLeft =
    monthlyCap != null ? Math.max(0, monthlyCap - monthlyUsed) : null

  let trialCap: number | null = null
  let trialUsed: number | null = null
  let trialLeft: number | null = null

  if (plan === "trial") {
    trialCap = 30
    const planRow = await db.query.userPlans.findFirst({
      where: eq(userPlansTable.userId, userId)
    })
    const start = planRow?.trialStartedAt || monthStart
    trialUsed = (
      await db.query.quizzes.findMany({
        where: and(
          eq(quizzesTable.userId, userId),
          gte(quizzesTable.createdAt, start)
        ),
        columns: { id: true }
      })
    ).length
    trialLeft = Math.max(0, trialCap - trialUsed)
  }

  return {
    plan,
    monthlyCap,
    monthlyUsed,
    monthlyLeft,
    trialCap,
    trialUsed,
    trialLeft
  }
}
