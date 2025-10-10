/*
<ai_context>
Server actions for quizzes CRUD and queries.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import { quizzesTable, type SelectQuiz } from "@/db/schema/quizzes-schema"
import { ActionState } from "@/types"
import { eq, desc } from "drizzle-orm"

export async function getQuizzesByUserIdAction(
  userId: string
): Promise<ActionState<SelectQuiz[]>> {
  try {
    const rows = await db.query.quizzes.findMany({
      where: eq(quizzesTable.userId, userId),
      orderBy: desc(quizzesTable.createdAt)
    })
    return { isSuccess: true, message: "Quizzes retrieved", data: rows }
  } catch (error) {
    console.error("getQuizzesByUserIdAction error", error)
    return { isSuccess: false, message: "Failed to get quizzes" }
  }
}
