/*
<ai_context>
Server page to view a quiz details and its questions.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import { questionsTable, quizzesTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { QuestionList } from "./_components/quiz-question-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
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

          <div className="mb-4">
            <Button asChild>
              <Link href={`/quizzes/${quiz.id}/take`}>Take Quiz</Link>
            </Button>
          </div>

          <QuestionList questions={questions} />
        </CardContent>
      </Card>
    </div>
  )
}
