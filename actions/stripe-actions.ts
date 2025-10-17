/*
<ai_context>
Contains server actions related to Stripe.
</ai_context>
*/

"use server"

import {
  updateProfileAction,
  updateProfileByStripeCustomerIdAction
} from "@/actions/db/profiles-actions"
import { db } from "@/db/db"
import { profilesTable, userPlansTable, type SelectProfile } from "@/db/schema"
import { eq } from "drizzle-orm"
import { stripe } from "@/lib/stripe"
import Stripe from "stripe"
import { auth } from "@clerk/nextjs/server"
import type { ActionState } from "@/types"

type MembershipStatus = SelectProfile["membership"]

const getMembershipStatus = (
  status: Stripe.Subscription.Status,
  membership: MembershipStatus
): MembershipStatus => {
  switch (status) {
    case "active":
    case "trialing":
      return membership
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "past_due":
    case "paused":
    case "unpaid":
      return "free"
    default:
      return "free"
  }
}

export async function createCheckoutSessionAction(): Promise<ActionState<{ url: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) return { isSuccess: false, message: "Not authenticated" }

    const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY
    if (!priceId) return { isSuccess: false, message: "Missing STRIPE_PRICE_PRO_MONTHLY" }

    const profile = await db.query.profiles.findFirst({ where: eq(profilesTable.userId, userId) })

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: userId,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
      customer: profile?.stripeCustomerId || undefined,
      line_items: [
        { price: priceId, quantity: 1 }
      ],
      metadata: { membership: "pro" }
    })

    if (!session.url) return { isSuccess: false, message: "Failed to create checkout session" }
    return { isSuccess: true, message: "Checkout session created", data: { url: session.url } }
  } catch (error) {
    console.error("createCheckoutSessionAction error", error)
    return { isSuccess: false, message: "Failed to create checkout session" }
  }
}

export async function createBillingPortalSessionAction(): Promise<ActionState<{ url: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) return { isSuccess: false, message: "Not authenticated" }

    const profile = await db.query.profiles.findFirst({ where: eq(profilesTable.userId, userId) })
    if (!profile?.stripeCustomerId) return { isSuccess: false, message: "No Stripe customer found" }

    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`
    })

    return { isSuccess: true, message: "Portal session created", data: { url: portal.url } }
  } catch (error) {
    console.error("createBillingPortalSessionAction error", error)
    return { isSuccess: false, message: "Failed to create portal session" }
  }
}

const getSubscription = async (subscriptionId: string) => {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method"]
  })
}

export const updateStripeCustomer = async (
  userId: string,
  subscriptionId: string,
  customerId: string
) => {
  try {
    if (!userId || !subscriptionId || !customerId) {
      throw new Error("Missing required parameters for updateStripeCustomer")
    }

    const subscription = await getSubscription(subscriptionId)

    const result = await updateProfileAction(userId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id
    })

    if (!result.isSuccess) {
      throw new Error("Failed to update customer profile")
    }

    // Upsert link into user_plans so future webhook events can map by customerId
    const now = new Date()
    await db
      .insert(userPlansTable)
      .values({
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: userPlansTable.userId,
        set: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          updatedAt: now
        }
      })

    return result.data
  } catch (error) {
    console.error("Error in updateStripeCustomer:", error)
    throw error instanceof Error
      ? error
      : new Error("Failed to update Stripe customer")
  }
}

export const manageSubscriptionStatusChange = async (
  subscriptionId: string,
  customerId: string,
  productId: string
): Promise<MembershipStatus> => {
  try {
    if (!subscriptionId || !customerId || !productId) {
      throw new Error(
        "Missing required parameters for manageSubscriptionStatusChange"
      )
    }

    const subscription = await getSubscription(subscriptionId)
    const product = await stripe.products.retrieve(productId)
    const metadataMembership = product.metadata.membership as
      | MembershipStatus
      | undefined

    let fallbackMembership: MembershipStatus | undefined
    const defaultPrice = product.default_price

    if (defaultPrice && typeof defaultPrice !== "string") {
      fallbackMembership = defaultPrice.metadata?.membership as
        | MembershipStatus
        | undefined

      if (!fallbackMembership && defaultPrice.nickname) {
        const nickname = defaultPrice.nickname.toLowerCase()
        if (nickname.includes("pro")) {
          fallbackMembership = "pro"
        } else if (nickname.includes("free")) {
          fallbackMembership = "free"
        }
      }
    }

    const membership: MembershipStatus =
      metadataMembership || fallbackMembership || "pro"

    if (!["free", "pro"].includes(membership)) {
      throw new Error(
        `Invalid membership type in product metadata: ${membership}`
      )
    }

    const membershipStatus = getMembershipStatus(
      subscription.status,
      membership
    )

    const updateResult = await updateProfileByStripeCustomerIdAction(
      customerId,
      {
        stripeSubscriptionId: subscription.id,
        membership: membershipStatus
      }
    )

    if (!updateResult.isSuccess) {
      throw new Error("Failed to update subscription status")
    }

    // Reflect into user_plans for gating
    const plan = membershipStatus === "pro" && ["active", "trialing"].includes(subscription.status)
      ? "pro"
      : "free"
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null

    // Update by stripe customer id; if row is missing, best-effort no-op
    await db
      .update(userPlansTable)
      .set({
        plan,
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: currentPeriodEnd ?? undefined,
        updatedAt: new Date()
      })
      .where(eq(userPlansTable.stripeCustomerId, customerId))

    return membershipStatus
  } catch (error) {
    console.error("Error in manageSubscriptionStatusChange:", error)
    throw error instanceof Error
      ? error
      : new Error("Failed to update subscription status")
  }
}
