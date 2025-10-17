"use server"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { stripe } from "@/lib/stripe"
import {
  manageSubscriptionStatusChange,
  updateStripeCustomer
} from "@/actions/stripe-actions"
import { format } from "date-fns"
import Link from "next/link"
import { redirect } from "next/navigation"
import Stripe from "stripe"

interface PricingConfirmationPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PricingConfirmationPage({
  searchParams
}: PricingConfirmationPageProps) {
  const resolvedSearchParams = await searchParams
  const sessionIdParam = resolvedSearchParams.session_id
  const sessionId = Array.isArray(sessionIdParam)
    ? sessionIdParam[0]
    : sessionIdParam

  if (!sessionId) {
    redirect("/pricing")
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"]
    })

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id

    let planName = session.metadata?.plan || "Question Smith Pro"
    let amountInMinor = session.amount_total ?? 0
    let currency = session.currency || "myr"
    let renewalDate: Date | null = null

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price.product"]
      })

      const subscriptionItem = subscription.items.data[0]
      const price = subscriptionItem?.price
      const product = subscriptionItem?.price?.product as
        | Stripe.Product
        | undefined

      if (price?.unit_amount) {
        amountInMinor = price.unit_amount
      }

      if (price?.currency) {
        currency = price.currency
      }

      if (product?.name) {
        planName = product.name
      } else if (price?.nickname) {
        planName = price.nickname
      }

      renewalDate = new Date(subscription.current_period_end * 1000)

      // Eagerly sync membership/plan in case webhooks lag or aren't configured in dev
      try {
        await updateStripeCustomer(
          (session.client_reference_id as string) ?? "",
          subscription.id,
          session.customer as string
        )
        const productId = subscription.items.data[0].price.product as string
        await manageSubscriptionStatusChange(
          subscription.id,
          subscription.customer as string,
          productId
        )
      } catch (e) {
        console.error("post-checkout plan sync failed", e)
      }
    }

    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase()
    }).format((amountInMinor ?? 0) / 100)

    const formattedRenewal = renewalDate ? format(renewalDate, "PPP") : null

    return (
      <div className="container mx-auto max-w-2xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Payment Successful</CardTitle>
            <CardDescription>
              You&apos;re now subscribed to {planName}. We&apos;ve emailed a
              receipt to you.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <p className="text-muted-foreground text-sm">Plan</p>
              <p className="text-lg font-semibold">{planName}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Amount Paid</p>
              <p className="text-2xl font-bold">{formattedAmount}</p>
            </div>

            {formattedRenewal && (
              <div>
                <p className="text-muted-foreground text-sm">Renews On</p>
                <p className="text-lg font-semibold">{formattedRenewal}</p>
              </div>
            )}
          </CardContent>

          <CardFooter className="justify-end">
            <Button asChild>
              <Link href="/todo">Create your first quiz</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  } catch (error) {
    console.error("Error rendering pricing confirmation page:", error)
    redirect("/pricing")
  }
}
