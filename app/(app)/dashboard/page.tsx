/*
<ai_context>
Server page for the Dashboard overview. Shows quick stats and entry points.
</ai_context>
*/

"use server"

import { getQuizzesByUserIdAction } from "@/actions/db/quizzes-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) return redirect("/login")

  const quizzesRes = await getQuizzesByUserIdAction(userId)
  const quizzes = quizzesRes.isSuccess ? quizzesRes.data : []

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button asChild>
          <Link href="/generate/text">Generate from Text</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Quizzes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{quizzes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {quizzes.filter(q => q.status === "draft").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {quizzes.filter(q => q.status === "published").length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
