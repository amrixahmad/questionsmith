/*
<ai_context>
Types for billing and plan resolution.
</ai_context>
*/

export type PlanTier = "free" | "trial" | "pro"

export interface PlanInfo {
  plan: PlanTier
  trialEnd?: Date | null
}
