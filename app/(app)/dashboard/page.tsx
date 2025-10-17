/*
<ai_context>
Server page for the Dashboard overview. Shows quick stats and entry points.
</ai_context>
*/

"use server"

import { getQuizzesByUserIdAction } from "@/actions/db/quizzes-actions"
import { getPlanAction, startTrialAction } from "@/actions/billing-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import RouteToast from "@/components/utilities/route-toast"
import { getGenerationUsage } from "@/lib/usage"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) return redirect("/login")

  const quizzesRes = await getQuizzesByUserIdAction(userId)
  const quizzes = quizzesRes.isSuccess ? quizzesRes.data : []

  const planRes = await getPlanAction()
  const plan = planRes.isSuccess ? planRes.data.plan : "free"
  const trialEnd = planRes.isSuccess ? planRes.data.trialEnd : null

  const usage = await getGenerationUsage(userId)

  async function doStartTrial() {
    "use server"
    await startTrialAction()
    redirect("/dashboard")
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <RouteToast />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button asChild>
          <Link href="/generate/text">Generate from Text</Link>
        </Button>
      </div>

      {plan === "free" && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">You're on the Free plan</div>
                <div className="text-muted-foreground text-sm">
                  Start a 7-day Pro trial to unlock all features.
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  Generations this month: {usage.monthlyUsed}/
                  {usage.monthlyCap ?? 0}. Trial gives up to 30 generations
                  during the trial period.
                </div>
              </div>
              <form action={doStartTrial}>
                <Button type="submit">Start 7-day trial</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      {plan === "trial" && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-1">
              <div className="font-medium">Trial active</div>
              <div className="text-muted-foreground text-sm">
                Ends on{" "}
                {trialEnd ? new Date(trialEnd).toLocaleString() : "soon"}
              </div>
              <div className="text-muted-foreground text-xs">
                Trial generations: {usage.trialUsed ?? 0}/{usage.trialCap ?? 30}{" "}
                remaining {Math.max(0, usage.trialLeft ?? 0)}.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Quizzes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{quizzes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {quizzes.filter(q => q.status === "draft").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {quizzes.filter(q => q.status === "published").length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
