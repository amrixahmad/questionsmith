/*
<ai_context>
Server page to view a quiz details and its questions.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
  questionsTable,
  quizzesTable,
  shareLinksTable,
  attemptsTable
} from "@/db/schema"
import { and, eq, isNotNull } from "drizzle-orm"
import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { QuestionList } from "./_components/quiz-question-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  publishQuizAction,
  unpublishQuizAction,
  updateMaxAttemptsAction
} from "@/actions/db/quizzes-actions"
import {
  createShareLinkAction,
  revokeShareLinkAction
} from "@/actions/db/share-links-actions"
import CopyShareLink from "./_components/copy-share-link"
import RouteToast from "@/components/utilities/route-toast"

export default async function QuizDetailPage({
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

  if (!quiz || quiz.userId !== userId) return notFound()

  const questions = await db.query.questions.findMany({
    where: eq(questionsTable.quizId, quizId)
  })

  const existingShare = await db.query.shareLinks.findFirst({
    where: and(
      eq(shareLinksTable.quizId, quizId),
      eq(shareLinksTable.isPublic, true)
    )
  })

  // Analytics
  const attemptRows = await db.query.attempts.findMany({
    where: and(
      eq(attemptsTable.quizId, quizId),
      isNotNull(attemptsTable.submittedAt)
    )
  })
  const attemptCount = attemptRows.length
  let totalRatio = 0
  for (const a of attemptRows) {
    const s = a.score ? Number(a.score) : 0
    const m = a.maxScore ? Number(a.maxScore) : 0
    if (m > 0) totalRatio += s / m
  }
  const avgPct = attemptCount
    ? Math.round((totalRatio / attemptCount) * 100 * 10) / 10
    : 0
  const viewCount = existingShare?.views ?? 0

  async function doPublish() {
    "use server"
    await publishQuizAction(quizId)
    redirect(`/quizzes/${quizId}`)
  }

  async function doUnpublish() {
    "use server"
    await unpublishQuizAction(quizId)
    redirect(`/quizzes/${quizId}`)
  }

  async function createShare() {
    "use server"
    await createShareLinkAction(quizId)
    redirect(`/quizzes/${quizId}`)
  }

  async function revokeShare() {
    "use server"
    await revokeShareLinkAction(quizId)
    redirect(`/quizzes/${quizId}`)
  }

  async function setMaxAttempts(formData: FormData) {
    "use server"
    const raw = Number(formData.get("maxAttempts") || 1)
    await updateMaxAttemptsAction(quizId, isNaN(raw) ? 1 : raw)
    redirect(`/quizzes/${quizId}`)
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <RouteToast />
      <Card>
        <CardHeader>
          <CardTitle>{quiz.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-2 text-sm">
            {quiz.status && (
              <Badge variant="secondary" className="uppercase">
                {quiz.status}
              </Badge>
            )}
            {quiz.difficulty && (
              <Badge variant="outline" className="uppercase">
                {quiz.difficulty}
              </Badge>
            )}
            <div className="ml-auto">{quiz.questionCount} questions</div>
          </div>

          <Separator className="my-4" />

          <div className="mb-4 flex gap-2">
            {quiz.status !== "published" ? (
              <form action={doPublish}>
                <Button type="submit">Publish</Button>
              </form>
            ) : (
              <form action={doUnpublish}>
                <Button type="submit" variant="secondary">
                  Unpublish
                </Button>
              </form>
            )}
            <Button asChild variant="outline">
              <Link href="/generate/text">Generate another</Link>
            </Button>
          </div>

          {quiz.status === "published" && (
            <div className="mb-6 space-y-2">
              {!existingShare ? (
                <form action={createShare}>
                  <Button type="submit" variant="outline">
                    Create share link
                  </Button>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <CopyShareLink token={existingShare.token} />
                  <form action={revokeShare}>
                    <Button type="submit" variant="destructive">
                      Revoke link
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}

          <div className="mb-6 space-y-1">
            <div className="text-sm font-medium">Analytics</div>
            <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
              <div>Views: {viewCount}</div>
              <div>Attempts: {attemptCount}</div>
              <div>Avg score: {avgPct}%</div>
            </div>
          </div>

          <div className="mb-6">
            <form action={setMaxAttempts} className="flex items-end gap-2">
              <div>
                <div className="text-sm font-medium">Attempts per user</div>
                <input
                  type="number"
                  name="maxAttempts"
                  min={1}
                  defaultValue={quiz.maxAttempts ?? 1}
                  className="border-input bg-background text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-24 rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1"
                />
              </div>
              <Button type="submit" variant="outline">
                Update
              </Button>
            </form>
          </div>

          <div className="mb-4">
            <Button asChild>
              <Link href={`/quizzes/${quizId}/take`}>Take Quiz</Link>
            </Button>
          </div>

          <QuestionList questions={questions} />

          <div className="mt-6">
            <Button asChild variant="outline">
              <Link href="/generate/text">Generate another</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
