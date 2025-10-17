"use server"

import { auth } from "@clerk/nextjs/server"
import { getUserPlan } from "@/lib/billing"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    const info = await getUserPlan(userId)
    return new Response(
      JSON.stringify({ plan: info.plan, trialEnd: info.trialEnd }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
