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
import { and, eq, inArray, isNotNull } from "drizzle-orm"

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

    // Enforce retake policy: default 1, owner can increase via maxAttempts
    const allowed = typeof (quiz as any).maxAttempts === "number" && (quiz as any).maxAttempts > 0 ? (quiz as any).maxAttempts : 1
    const existing = await db.query.attempts.findMany({
      where: and(
        eq(attemptsTable.quizId, quizId),
        eq(attemptsTable.userId, userId),
        isNotNull(attemptsTable.submittedAt)
      )
    })
    if (existing.length >= allowed) {
      return { isSuccess: false, message: "No attempts remaining" }
    }

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
      const correct = compareAnswer(
        q.type,
        q.answer as unknown,
        ans.response,
        q.options
      )
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
  received: unknown,
  options: unknown
) {
  // true/false: boolean equivalence
  if (type === "true_false") {
    const toBool = (v: unknown) => {
      if (typeof v === "boolean") return v
      const s = String(v).trim().toLowerCase()
      return s === "true" || s === "t" || s === "yes"
    }
    return toBool(expected) === toBool(received)
  }

  // multiple_choice: compare by option index, handling letters/index/text
  if (type === "multiple_choice") {
    const opts = normalizeOptionsServer(options)
    const idxFromExpected = optionIndex(expected, opts)
    const idxFromReceived = optionIndex(received, opts)
    if (idxFromExpected == null || idxFromReceived == null) return false
    return idxFromExpected === idxFromReceived
  }

  // short_answer / fill_blank: normalized string compare
  const norm = (v: unknown) => {
    if (v == null) return ""
    if (typeof v === "boolean") return v ? "true" : "false"
    if (Array.isArray(v)) return v.map(x => String(x).trim().toLowerCase()).sort().join("|")
    if (typeof v === "object") return JSON.stringify(v)
    return String(v).trim().toLowerCase()
  }
  return norm(expected) === norm(received)
}

function normalizeOptionsServer(options: unknown): string[] {
  if (!options) return []
  if (Array.isArray(options)) {
    const texts: string[] = []
    for (const item of options as any[]) {
      if (typeof item === "string") texts.push(item)
      else if (item && typeof item === "object") {
        const maybe = (item as any).text ?? (item as any).label ?? ""
        if (maybe) texts.push(String(maybe))
      }
    }
    return texts
  }
  return []
}

function optionIndex(value: unknown, options: string[]): number | null {
  if (!options || options.length === 0) return null
  if (typeof value === "number") {
    const i = Math.floor(value)
    return i >= 0 && i < options.length ? i : null
  }
  const s = String(value ?? "").trim()
  if (!s) return null

  // letter like a/A/b/B -> index 0/1/etc
  const lower = s.toLowerCase()
  // accept letter optionally followed by ')' or '.'
  if (/^[a-z][)\.]?$/.test(lower)) {
    const ch = lower[0]
    const i = ch.charCodeAt(0) - "a".charCodeAt(0)
    return i >= 0 && i < options.length ? i : null
  }

  // patterns like 'a3' or 'A 3' => interpret as 1-based index 3
  const letterNum = lower.match(/^([a-z])\s*(\d+)$/)
  if (letterNum) {
    const n = parseInt(letterNum[2], 10)
    const idx = n - 1
    return idx >= 0 && idx < options.length ? idx : null
  }

  // patterns like 'option c', 'choice d', 'answer b'
  const wordLetter = lower.match(/^(option|choice|answer)\s+([a-z])$/)
  if (wordLetter) {
    const ch = wordLetter[2]
    const i = ch.charCodeAt(0) - "a".charCodeAt(0)
    return i >= 0 && i < options.length ? i : null
  }

  // numeric string -> index
  if (/^\d+$/.test(s)) {
    const i = parseInt(s, 10)
    // accept both 0-based and 1-based; if in bounds as-is use it; else try i-1
    if (i >= 0 && i < options.length) return i
    if (i - 1 >= 0 && i - 1 < options.length) return i - 1
  }

  // patterns like 'option 3', 'choice 2', 'answer 4'
  const wordNum = lower.match(/^(option|choice|answer)\s+(\d+)$/)
  if (wordNum) {
    const i = parseInt(wordNum[2], 10)
    const idx = i - 1
    return idx >= 0 && idx < options.length ? idx : null
  }

  // otherwise, treat as option text
  const target = s.toLowerCase()
  const idx = options.findIndex(o => String(o).trim().toLowerCase() === target)
  return idx >= 0 ? idx : null
}
