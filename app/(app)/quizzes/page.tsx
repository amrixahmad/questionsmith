/*
<ai_context>
Server page to list user's quizzes.
</ai_context>
*/

"use server"

import { getQuizzesByUserIdAction } from "@/actions/db/quizzes-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function QuizzesListPage() {
  const { userId } = await auth()
  if (!userId) return redirect("/login")

  const quizzesRes = await getQuizzesByUserIdAction(userId)
  const quizzes = quizzesRes.isSuccess ? quizzesRes.data : []

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">My Quizzes</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {quizzes.map(q => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{q.title}</span>
                <span className="text-muted-foreground text-xs uppercase">
                  {q.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div>{q.questionCount} questions</div>
                <Link
                  className="text-primary underline"
                  href={`/quizzes/${q.id}`}
                >
                  View
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {quizzes.length === 0 && (
          <div className="text-muted-foreground text-sm">No quizzes yet.</div>
        )}
      </div>
    </div>
  )
}
