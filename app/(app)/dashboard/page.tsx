/*
<ai_context>
Server page for the Dashboard overview. Shows quick stats and entry points.
</ai_context>
*/

"use server"

import { getQuizzesByUserIdAction } from "@/actions/db/quizzes-actions"
import { getPlanAction, startTrialAction } from "@/actions/billing-actions"
import { createCheckoutSessionAction } from "@/actions/stripe-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { manageSubscriptionStatusChange } from "@/actions/stripe-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import RouteToast from "@/components/utilities/route-toast"
import { getGenerationUsage } from "@/lib/usage"
import { stripe } from "@/lib/stripe"
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

  // If Stripe upgraded membership to Pro but user_plans still shows trial (race/webhook lag),
  // prefer profile membership for display purposes to avoid stale trial notice.
  const profileRes = await getProfileByUserIdAction(userId)
  const membership = profileRes.isSuccess ? profileRes.data.membership : "free"
  let effectivePlan = membership === "pro" ? "pro" : plan

  // Lazy sync: if UI still shows trial but Stripe subscription is already active/trialing,
  // update membership/plan now to avoid stale trial card.
  if (
    effectivePlan === "trial" &&
    profileRes.isSuccess &&
    profileRes.data.stripeSubscriptionId &&
    profileRes.data.stripeCustomerId
  ) {
    try {
      const sub = await stripe.subscriptions.retrieve(
        profileRes.data.stripeSubscriptionId
      )
      if (sub && (sub.status === "active" || sub.status === "trialing")) {
        const productId = sub.items.data[0]?.price?.product as string
        if (productId) {
          await manageSubscriptionStatusChange(
            sub.id,
            profileRes.data.stripeCustomerId,
            productId
          )
          effectivePlan = "pro"
        }
      }
    } catch {}
  }

  async function doStartTrial() {
    "use server"
    await startTrialAction()
    redirect("/dashboard")
  }

  async function doUpgrade() {
    "use server"
    const res = await createCheckoutSessionAction()
    if (res.isSuccess && res.data.url) {
      redirect(res.data.url)
    }
    redirect("/pricing")
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

      {effectivePlan === "free" && (
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
              <div className="flex gap-2">
                <form action={doStartTrial}>
                  <Button type="submit">Start 7-day trial</Button>
                </form>
                <form action={doUpgrade}>
                  <Button type="submit" variant="outline">
                    Upgrade to Pro
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {effectivePlan === "trial" && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="font-medium">Trial active</div>
              <div className="text-muted-foreground text-sm">
                Ends on{" "}
                {trialEnd ? new Date(trialEnd).toLocaleString() : "soon"}
              </div>
              <div className="text-muted-foreground text-xs">
                Trial generations: {usage.trialUsed ?? 0}/{usage.trialCap ?? 30}{" "}
                remaining {Math.max(0, usage.trialLeft ?? 0)}.
              </div>
              <form action={doUpgrade}>
                <Button type="submit" variant="outline">
                  Upgrade to Pro
                </Button>
              </form>
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
