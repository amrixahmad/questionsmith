/*
<ai_context>
Server actions to start, submit, and grade quiz attempts.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
  answersTable,
  attemptsTable,
  questionsTable,
  quizzesTable,
  type SelectAttempt
} from "@/db/schema"
import { ActionState } from "@/types"
import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"

export async function startAttemptAction(
  quizId: string
): Promise<ActionState<SelectAttempt>> {
  try {
    const { userId } = await auth()
    if (!userId) return { isSuccess: false, message: "Not authenticated" }

    // Ensure the quiz exists
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzesTable.id, quizId)
    })
    if (!quiz) return { isSuccess: false, message: "Quiz not found" }

    const [attempt] = await db
      .insert(attemptsTable)
      .values({ quizId, userId })
      .returning()

    return { isSuccess: true, message: "Attempt started", data: attempt }
  } catch (error) {
    console.error("startAttemptAction error", error)
    return { isSuccess: false, message: "Failed to start attempt" }
  }
}

export async function submitAttemptAction(input: {
  attemptId: string
  answers: Array<{ questionId: string; response: unknown }>
}): Promise<
  ActionState<{
    attemptId: string
    score: number
    maxScore: number
  }>
> {
  try {
    const { userId } = await auth()
    if (!userId) return { isSuccess: false, message: "Not authenticated" }

    const attempt = await db.query.attempts.findFirst({
      where: eq(attemptsTable.id, input.attemptId)
    })
    if (!attempt) return { isSuccess: false, message: "Attempt not found" }
    if (attempt.userId !== userId)
      return { isSuccess: false, message: "Forbidden" }

    // Load relevant questions
    const qids = input.answers.map(a => a.questionId)
    const qs = qids.length
      ? await db.query.questions.findMany({
          where: inArray(questionsTable.id, qids)
        })
      : []

    // Grade
    let score = 0
    const pointsPer = 1

    const rowsToInsert = [] as Array<{
      attemptId: string
      questionId: string
      response: unknown
      isCorrect: boolean
      score: string
    }>

    for (const ans of input.answers) {
      const q = qs.find(x => x.id === ans.questionId)
      if (!q) continue
      const correct = compareAnswer(q.type, q.answer as unknown, ans.response)
      if (correct) score += pointsPer
      rowsToInsert.push({
        attemptId: attempt.id,
        questionId: q.id,
        response: ans.response,
        isCorrect: correct,
        score: String(correct ? pointsPer : 0)
      })
    }

    if (rowsToInsert.length) {
      await db.insert(answersTable).values(rowsToInsert as any)
    }

    const maxScore = qs.length * pointsPer

    // Mark submitted and store aggregated score
    const started = attempt.startedAt ? new Date(attempt.startedAt) : new Date()
    const now = new Date()
    const duration = Math.max(0, Math.floor((now.getTime() - started.getTime()) / 1000))

    await db
      .update(attemptsTable)
      .set({
        submittedAt: now,
        // Drizzle numeric maps to string in TS. Store as strings.
        score: String(score),
        maxScore: String(maxScore),
        durationSeconds: duration
      })
      .where(and(eq(attemptsTable.id, attempt.id), eq(attemptsTable.userId, userId)))

    return {
      isSuccess: true,
      message: "Attempt submitted",
      data: { attemptId: attempt.id, score, maxScore }
    }
  } catch (error) {
    console.error("submitAttemptAction error", error)
    return { isSuccess: false, message: "Failed to submit attempt" }
  }
}

function compareAnswer(
  type: string,
  expected: unknown,
  received: unknown
) {
  // Normalize values
  const norm = (v: unknown) => {
    if (v == null) return ""
    if (typeof v === "boolean") return v ? "true" : "false"
    if (Array.isArray(v)) return v.map(x => String(x).trim().toLowerCase()).sort().join("|")
    if (typeof v === "object") return JSON.stringify(v)
    return String(v).trim().toLowerCase()
  }

  if (type === "true_false") {
    const toBool = (v: unknown) => {
      if (typeof v === "boolean") return v
      const s = String(v).trim().toLowerCase()
      return s === "true" || s === "t" || s === "yes"
    }
    return toBool(expected) === toBool(received)
  }

  // For multiple_choice and short/free text, do case-insensitive string compare
  return norm(expected) === norm(received)
}
