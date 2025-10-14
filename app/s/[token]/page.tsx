/*
<ai_context>
Signed-in share view for a published quiz via token. Read-only; no owner controls.
</ai_context>
*/

"use server"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { db } from "@/db/db"
import { questionsTable, quizzesTable, shareLinksTable } from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { notFound, redirect } from "next/navigation"
import { QuestionList } from "@/app/(app)/quizzes/[quizId]/_components/quiz-question-list"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import RouteToast from "@/components/utilities/route-toast"

export default async function SharedQuizPage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const { userId } = await auth()
  if (!userId) return redirect("/login")

  const { token } = await params

  const share = await db.query.shareLinks.findFirst({
    where: eq(shareLinksTable.token, token)
  })
  if (!share || !share.isPublic) return notFound()
  if (share.expiresAt && new Date(share.expiresAt) < new Date())
    return notFound()

  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzesTable.id, share.quizId)
  })
  if (!quiz || quiz.status !== "published") return notFound()

  const questions = await db.query.questions.findMany({
    where: eq(questionsTable.quizId, quiz.id)
  })

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <RouteToast />
      <Card>
        <CardHeader>
          <CardTitle>{quiz.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary" className="uppercase">
              shared
            </Badge>
            {quiz.difficulty && (
              <Badge variant="outline" className="uppercase">
                {quiz.difficulty}
              </Badge>
            )}
            <div className="ml-auto">{quiz.questionCount} questions</div>
          </div>

          <Separator className="my-4" />

          <div className="mb-4">
            <Button asChild>
              <Link href={`/s/${token}/take`}>Take Quiz</Link>
            </Button>
          </div>

          <QuestionList questions={questions} hideAnswerControls />
        </CardContent>
      </Card>
    </div>
  )
}
