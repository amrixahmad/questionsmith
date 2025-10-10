/*
<ai_context>
Server actions for AI-powered quiz generation and persistence.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
  contentSourcesTable,
  quizzesTable,
  questionsTable,
  type InsertQuiz,
  type SelectQuiz,
  type InsertQuestion
} from "@/db/schema"
import { generateQuizFromText } from "@/lib/ai"
import type { ActionState, GenerationParams } from "@/types"

export async function generateQuizFromTextAction(input: {
  userId: string
  text: string
  params?: Partial<GenerationParams>
}): Promise<ActionState<{ quiz: SelectQuiz }>> {
  try {
    const params: GenerationParams = {
      questionCount: input.params?.questionCount ?? 10,
      difficulty: input.params?.difficulty ?? "medium",
      withExplanations: input.params?.withExplanations ?? true,
      types: input.params?.types,
      language: input.params?.language
    }

    // 1) Persist content source
    const [source] = await db
      .insert(contentSourcesTable)
      .values({
        userId: input.userId,
        type: "text",
        title: "Generated from text",
        body: input.text
      })
      .returning()

    // 2) Generate quiz structure via OpenAI
    const generated = await generateQuizFromText(input.text, params)

    // 3) Persist quiz
    const [quiz] = await db
      .insert(quizzesTable)
      .values({
        userId: input.userId,
        sourceId: source.id,
        title: generated.title,
        status: "draft",
        difficulty: generated.difficulty ?? params.difficulty,
        questionCount: generated.questions.length
      } satisfies InsertQuiz)
      .returning()

    // 4) Persist questions
    const questionRows: InsertQuestion[] = generated.questions.map((q, idx) => ({
      quizId: quiz.id,
      type: q.type,
      stem: q.stem,
      options: q.options ? q.options : null,
      answer: q.answer,
      explanation: q.explanation ?? null,
      tags: q.tags ?? null,
      order: q.order ?? idx + 1
    }))

    if (questionRows.length) {
      await db.insert(questionsTable).values(questionRows)
    }

    return {
      isSuccess: true,
      message: "Quiz generated successfully",
      data: { quiz }
    }
  } catch (error) {
    console.error("generateQuizFromTextAction error", error)
    return { isSuccess: false, message: "Failed to generate quiz" }
  }
}
