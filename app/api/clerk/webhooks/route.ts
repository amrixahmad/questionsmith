"use server"

import { deleteProfileAction } from "@/actions/db/profiles-actions"
import { deleteTodosByUserIdAction } from "@/actions/db/todos-actions"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { Webhook, WebhookRequiredHeaders } from "svix"

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set")
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  const svixHeaders = headers()
  const svixId = svixHeaders.get("svix-id")
  const svixTimestamp = svixHeaders.get("svix-timestamp")
  const svixSignature = svixHeaders.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const payload = await req.text()
  const wh = new Webhook(webhookSecret)

  try {
    const event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature
    } satisfies WebhookRequiredHeaders)

    if (event.type === "user.deleted") {
      const userId = (event.data?.id as string) ?? null

      if (userId) {
        await deleteTodosByUserIdAction(userId)
        await deleteProfileAction(userId)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error handling Clerk webhook:", error)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
