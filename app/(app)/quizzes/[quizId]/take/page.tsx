/*
<ai_context>
Server page to take a quiz. Starts an attempt and renders a client form to submit answers.
</ai_context>
*/

"use server"

import {
  startAttemptAction,
  submitAttemptAction
} from "@/actions/db/attempts-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/db/db"
import { questionsTable, quizzesTable } from "@/db/schema"
import type { SelectQuestion } from "@/db/schema/questions-schema"
import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import TakeQuizForm from "../_components/take-quiz-form"

export default async function TakeQuizPage({
  params
}: {
  params: Promise<{ quizId: string }>
}) {
  const { userId } = await auth()
  if (!userId) return redirect("/login")

  const { quizId } = await params
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzesTable.id, quizId)
  })
  if (!quiz || quiz.userId !== userId) return redirect("/quizzes")

  const questions = await db.query.questions.findMany({
    where: eq(questionsTable.quizId, quizId)
  })

  const attemptRes = await startAttemptAction(quizId)
  if (!attemptRes.isSuccess)
    return redirect(`/quizzes/${quizId}?notice=no_attempts`)

  async function submit(formData: FormData) {
    "use server"
    const aid = String(formData.get("attemptId") || "")
    const qjson = String(formData.get("qids") || "[]")
    let qids: string[] = []
    try {
      qids = JSON.parse(qjson)
    } catch {}

    const answers: Array<{ questionId: string; response: unknown }> = []
    for (const qid of qids) {
      const v = formData.get(`q_${qid}`)
      if (v == null) continue
      answers.push({ questionId: qid, response: normalizeAnswer(v) })
    }

    const res = await submitAttemptAction({ attemptId: aid, answers })
    if (res.isSuccess) {
      return redirect(`/history/attempts/${aid}`)
    }
    return redirect(`/quizzes/${quizId}`)
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Take Quiz: {quiz.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <TakeQuizForm
            attemptId={attemptRes.data!.id}
            questions={questions as SelectQuestion[]}
            onSubmit={submit}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function normalizeAnswer(v: FormDataEntryValue): unknown {
  const s = String(v)
  if (s === "true" || s === "false") return s === "true"
  return s
}
