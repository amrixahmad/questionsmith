/*
<ai_context>
Server page to display an attempt result with per-question correctness.
</ai_context>
*/

"use server"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/db/db"
import {
  answersTable,
  attemptsTable,
  questionsTable,
  quizzesTable
} from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

export default async function AttemptResultPage({
  params
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { userId } = await auth()
  if (!userId) return redirect("/login")

  const { attemptId } = await params
  const attempt = await db.query.attempts.findFirst({
    where: and(
      eq(attemptsTable.id, attemptId),
      eq(attemptsTable.userId, userId)
    )
  })

  if (!attempt) return notFound()

  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzesTable.id, attempt.quizId)
  })

  const answerRows = await db.query.answers.findMany({
    where: eq(answersTable.attemptId, attemptId)
  })

  const qids = answerRows.map(a => a.questionId)
  const questions = qids.length
    ? await db.query.questions.findMany({
        where: inArray(questionsTable.id, qids)
      })
    : []

  const score = attempt.score ? Number(attempt.score) : 0
  const maxScore = attempt.maxScore
    ? Number(attempt.maxScore)
    : Math.max(1, answerRows.length)
  const pct = Math.round((score / (maxScore || 1)) * 100)

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Result: {quiz?.title ?? "Quiz"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground mb-4 text-sm">
            Score:{" "}
            <span className="text-foreground font-medium">
              {score}/{maxScore}
            </span>{" "}
            ({pct}%)
          </div>

          <div className="space-y-4">
            {answerRows.map(ans => {
              const q = questions.find(x => x.id === ans.questionId)
              const opts = normalizeOptionsServer(q?.options)
              const isMCQ = q?.type === "multiple_choice"
              const cIdx = isMCQ
                ? optionIndex(q?.answer as unknown, opts)
                : null
              const cLetter =
                cIdx != null
                  ? String.fromCharCode("A".charCodeAt(0) + cIdx)
                  : null
              const cText =
                cIdx != null && opts[cIdx] != null ? String(opts[cIdx]) : null
              return (
                <div key={ans.id} className="rounded border p-3">
                  <div className="mb-1 font-medium">
                    {q?.stem ?? "Question"}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Your answer:</span>{" "}
                    {formatValue(ans.response as unknown)}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Correct:</span>{" "}
                    {ans.isCorrect ? "Yes" : "No"}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      Correct answer:
                    </span>{" "}
                    {isMCQ
                      ? cLetter
                        ? `${cLetter} — ${cText ?? ""}`
                        : formatValue(q?.answer as unknown)
                      : formatValue(q?.answer as unknown)}
                  </div>
                  {q?.explanation && (
                    <div className="text-muted-foreground mt-1 text-sm">
                      {q.explanation}
                    </div>
                  )}
                </div>
              )
            })}

            {answerRows.length === 0 && (
              <div className="text-muted-foreground text-sm">
                No answers recorded.
              </div>
            )}
          </div>

          {quiz && (
            <div className="mt-6">
              <Link
                className="text-primary underline"
                href={`/quizzes/${quiz.id}`}
              >
                Back to Quiz
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function formatValue(v: unknown) {
  if (Array.isArray(v)) return v.map(x => String(x)).join(", ")
  if (typeof v === "boolean") return v ? "True" : "False"
  if (v == null) return ""
  return String(v)
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
  const lower = s.toLowerCase()
  if (/^[a-z][)\.]?$/.test(lower)) {
    const ch = lower[0]
    const i = ch.charCodeAt(0) - "a".charCodeAt(0)
    return i >= 0 && i < options.length ? i : null
  }
  const letterNum = lower.match(/^([a-z])\s*(\d+)$/)
  if (letterNum) {
    const n = parseInt(letterNum[2], 10)
    const idx = n - 1
    return idx >= 0 && idx < options.length ? idx : null
  }
  if (/^\d+$/.test(s)) {
    const i = parseInt(s, 10)
    if (i >= 0 && i < options.length) return i
    if (i - 1 >= 0 && i - 1 < options.length) return i - 1
  }
  const wordNum = lower.match(/^(option|choice|answer)\s+(\d+)$/)
  if (wordNum) {
    const i = parseInt(wordNum[2], 10)
    const idx = i - 1
    return idx >= 0 && idx < options.length ? idx : null
  }
  const target = s.toLowerCase()
  const idx = options.findIndex(o => String(o).trim().toLowerCase() === target)
  return idx >= 0 ? idx : null
}
