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
