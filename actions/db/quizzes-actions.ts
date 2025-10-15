/*
<ai_context>
Server actions for quizzes CRUD and queries.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import { quizzesTable, type SelectQuiz } from "@/db/schema/quizzes-schema"
import { ActionState } from "@/types"
import { eq, desc } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { createShareLinkAction, deactivateShareLinkAction } from "@/actions/db/share-links-actions"

export async function getQuizzesByUserIdAction(
  userId: string
): Promise<ActionState<SelectQuiz[]>> {
  try {
    const rows = await db.query.quizzes.findMany({
      where: eq(quizzesTable.userId, userId),
      orderBy: desc(quizzesTable.createdAt)
    })
    return { isSuccess: true, message: "Quizzes retrieved", data: rows }
  } catch (error) {
    console.error("getQuizzesByUserIdAction error", error)
    return { isSuccess: false, message: "Failed to get quizzes" }
  }
}

export async function updateMaxAttemptsAction(
  quizId: string,
  maxAttempts: number
): Promise<ActionState<SelectQuiz>> {
  try {
    const { userId } = await auth()
    if (!userId) return { isSuccess: false, message: "Not authenticated" }

    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzesTable.id, quizId)
    })
    if (!quiz) return { isSuccess: false, message: "Quiz not found" }
    if (quiz.userId !== userId) return { isSuccess: false, message: "Forbidden" }

    const value = Number.isFinite(maxAttempts) ? Math.max(1, Math.floor(maxAttempts)) : 1
    const [updated] = await db
      .update(quizzesTable)
      .set({ maxAttempts: value })
      .where(eq(quizzesTable.id, quizId))
      .returning()

    return { isSuccess: true, message: "Max attempts updated", data: updated }
  } catch (error) {
    console.error("updateMaxAttemptsAction error", error)
    return { isSuccess: false, message: "Failed to update max attempts" }
  }
}

export async function publishQuizAction(
  quizId: string
): Promise<ActionState<SelectQuiz>> {
  try {
    const { userId } = await auth()
    if (!userId) return { isSuccess: false, message: "Not authenticated" }

    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzesTable.id, quizId)
    })
    if (!quiz) return { isSuccess: false, message: "Quiz not found" }
    if (quiz.userId !== userId) return { isSuccess: false, message: "Forbidden" }

    const [updated] = await db
      .update(quizzesTable)
      .set({ status: "published" })
      .where(eq(quizzesTable.id, quizId))
      .returning()

    // Auto-create share link on publish (best-effort)
    try {
      await createShareLinkAction(quizId)
    } catch {}

    return { isSuccess: true, message: "Quiz published", data: updated }
  } catch (error) {
    console.error("publishQuizAction error", error)
    return { isSuccess: false, message: "Failed to publish quiz" }
  }
}

export async function unpublishQuizAction(
  quizId: string
): Promise<ActionState<SelectQuiz>> {
  try {
    const { userId } = await auth()
    if (!userId) return { isSuccess: false, message: "Not authenticated" }

    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzesTable.id, quizId)
    })
    if (!quiz) return { isSuccess: false, message: "Quiz not found" }
    if (quiz.userId !== userId) return { isSuccess: false, message: "Forbidden" }

    const [updated] = await db
      .update(quizzesTable)
      .set({ status: "draft" })
      .where(eq(quizzesTable.id, quizId))
      .returning()

    // Always disable share link on unpublish (best-effort), preserving token & analytics
    try {
      await deactivateShareLinkAction(quizId)
    } catch {}

    return { isSuccess: true, message: "Quiz unpublished", data: updated }
  } catch (error) {
    console.error("unpublishQuizAction error", error)
    return { isSuccess: false, message: "Failed to unpublish quiz" }
  }
}

