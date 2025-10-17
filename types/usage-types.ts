export interface GenerationUsage {
  plan: "free" | "trial" | "pro"
  monthlyCap: number | null
  monthlyUsed: number
  monthlyLeft: number | null
  trialCap: number | null
  trialUsed: number | null
  trialLeft: number | null
}
