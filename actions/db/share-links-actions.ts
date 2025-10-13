/*
<ai_context>
Server actions to create and revoke tokenized share links for quizzes.
Sharing is sign-in only for now; these actions enforce ownership and published status.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import { quizzesTable } from "@/db/schema/quizzes-schema"
import { shareLinksTable, type SelectShareLink } from "@/db/schema/share-links-schema"
import { ActionState } from "@/types"
import { and, eq, isNotNull } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import crypto from "crypto"

function generateToken(len = 24) {
  return crypto.randomBytes(len).toString("base64url")
}

export async function createShareLinkAction(
  quizId: string
): Promise<ActionState<{ shareLink: SelectShareLink }>> {
  try {
    const { userId } = await auth()
    if (!userId) return { isSuccess: false, message: "Not authenticated" }

    const quiz = await db.query.quizzes.findFirst({ where: eq(quizzesTable.id, quizId) })
    if (!quiz) return { isSuccess: false, message: "Quiz not found" }
    if (quiz.userId !== userId) return { isSuccess: false, message: "Forbidden" }
    if (quiz.status !== "published")
      return { isSuccess: false, message: "Quiz must be published to create a share link" }

    // Reuse existing active link if present
    const existing = await db.query.shareLinks.findFirst({
      where: and(eq(shareLinksTable.quizId, quizId), eq(shareLinksTable.isPublic, true))
    })
    if (existing) {
      return { isSuccess: true, message: "Share link ready", data: { shareLink: existing } }
    }

    const token = generateToken(16)
    const [created] = await db
      .insert(shareLinksTable)
      .values({ quizId, token, isPublic: true })
      .returning()

    return { isSuccess: true, message: "Share link created", data: { shareLink: created } }
  } catch (error) {
    console.error("createShareLinkAction error", error)
    return { isSuccess: false, message: "Failed to create share link" }
  }
}

export async function revokeShareLinkAction(
  quizId: string
): Promise<ActionState<{ count: number }>> {
  try {
    const { userId } = await auth()
    if (!userId) return { isSuccess: false, message: "Not authenticated" }

    const quiz = await db.query.quizzes.findFirst({ where: eq(quizzesTable.id, quizId) })
    if (!quiz) return { isSuccess: false, message: "Quiz not found" }
    if (quiz.userId !== userId) return { isSuccess: false, message: "Forbidden" }

    const deleted = await db
      .delete(shareLinksTable)
      .where(eq(shareLinksTable.quizId, quizId))
      .returning({ id: shareLinksTable.id })

    return { isSuccess: true, message: "Share link revoked", data: { count: deleted.length } }
  } catch (error) {
    console.error("revokeShareLinkAction error", error)
    return { isSuccess: false, message: "Failed to revoke share link" }
  }
}

export async function getShareLinkByTokenAction(
  token: string
): Promise<ActionState<SelectShareLink | null>> {
  try {
    const row = await db.query.shareLinks.findFirst({ where: eq(shareLinksTable.token, token) })
    return { isSuccess: true, message: "Share link fetched", data: row ?? null }
  } catch (error) {
    console.error("getShareLinkByTokenAction error", error)
    return { isSuccess: false, message: "Failed to load share link" }
  }
}
