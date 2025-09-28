/*
<ai_context>
This server page displays pricing options for the product, integrating Stripe payment links.
</ai_context>
*/

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
import {
  createProfileAction,
  getProfileByUserIdAction
} from "@/actions/db/profiles-actions"
import { cn } from "@/lib/utils"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Check } from "lucide-react"

export default async function PricingPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { userId } = await auth()
  const resolvedSearchParams = await searchParams
  const selectedPlan = (() => {
    const value = resolvedSearchParams.plan
    return Array.isArray(value) ? value[0] : value
  })()

  if (userId) {
    const profileRes = await getProfileByUserIdAction(userId)
    if (!profileRes.isSuccess) {
      await createProfileAction({ userId })
    }
  }

  const basicLink = userId ? "/todo" : "/signup"
  const proPaymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO || "#"
  const proLink = userId ? proPaymentLink : "/signup"
  const proLinkWithId =
    userId && proPaymentLink.startsWith("http")
      ? `${proPaymentLink}?client_reference_id=${userId}`
      : proPaymentLink

  if (userId && selectedPlan === "pro" && proLinkWithId !== "#") {
    redirect(proLinkWithId)
  }

  return (
    <div className="container mx-auto py-12">
      <h1 className="mb-8 text-center text-3xl font-bold">Choose Your Plan</h1>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <PricingCard
          title="Basic"
          price="Free"
          description="Perfect for getting started"
          buttonText="Start for Free"
          buttonLink={basicLink}
          features={[
            "Capture unlimited practice questions",
            "Organize prompts with tags and notes",
            "Access from any device with Clerk login"
          ]}
          userId={userId}
          plan="basic"
        />
        <PricingCard
          title="Pro"
          price="MR47"
          description="Best for power creators"
          buttonText="Upgrade to Pro"
          buttonLink={proLink}
          features={[
            "Everything in Basic, plus collaborative workspaces",
            "Version history and advanced analytics dashboards",
            "Priority support with personalized onboarding"
          ]}
          userId={userId}
          plan="pro"
        />
      </div>
    </div>
  )
}

interface PricingCardProps {
  title: string
  price: string
  description: string
  buttonText: string
  buttonLink: string
  features: string[]
  userId: string | null
  plan: "basic" | "pro"
}

function PricingCard({
  title,
  price,
  description,
  buttonText,
  buttonLink,
  features,
  userId,
  plan
}: PricingCardProps) {
  const needsSignup = !userId && buttonLink.startsWith("/")
  const finalButtonLink = needsSignup
    ? `${buttonLink}?plan=${plan}`
    : userId && buttonLink.startsWith("http")
      ? `${buttonLink}?client_reference_id=${userId}`
      : buttonLink

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex grow flex-col justify-between">
        <div className="space-y-2 text-center">
          <p className="text-4xl font-bold">{price}</p>
          <CardDescription>{description}</CardDescription>
        </div>

        <ul className="mt-6 space-y-3 text-sm">
          {features.map(feature => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="text-primary mt-0.5 size-4" />
              <span className="text-muted-foreground text-left">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full" asChild>
          <a
            href={finalButtonLink}
            className={cn(
              "inline-flex items-center justify-center",
              finalButtonLink === "#" && "pointer-events-none opacity-50"
            )}
          >
            {buttonText}
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}
