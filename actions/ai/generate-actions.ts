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
  // single letter (optionally with ')' or '.') -> index
  if (/^[a-z][)\.]?$/.test(lower)) {
    const ch = lower[0]
    const i = ch.charCodeAt(0) - "a".charCodeAt(0)
    return i >= 0 && i < options.length ? i : null
  }
  // patterns like 'a3' or 'A 3' -> 1-based index
  const letterNum = lower.match(/^([a-z])\s*(\d+)$/)
  if (letterNum) {
    const idx = parseInt(letterNum[2], 10) - 1
    return idx >= 0 && idx < options.length ? idx : null
  }
  // patterns like 'option c', 'choice d', 'answer b'
  const wordLetter = lower.match(/^(option|choice|answer)\s+([a-z])$/)
  if (wordLetter) {
    const ch = wordLetter[2]
    const i = ch.charCodeAt(0) - "a".charCodeAt(0)
    return i >= 0 && i < options.length ? i : null
  }
  // numeric string -> index (accept 0-based or 1-based)
  if (/^\d+$/.test(s)) {
    const i = parseInt(s, 10)
    if (i >= 0 && i < options.length) return i
    if (i - 1 >= 0 && i - 1 < options.length) return i - 1
  }
  // patterns like 'option 3', 'choice 2', 'answer 4'
  const wordNum = lower.match(/^(option|choice|answer)\s+(\d+)$/)
  if (wordNum) {
    const i = parseInt(wordNum[2], 10) - 1
    return i >= 0 && i < options.length ? i : null
  }
  // fall back to matching option text
  const target = s.toLowerCase()
  const idx = options.findIndex(o => String(o).trim().toLowerCase() === target)
  return idx >= 0 ? idx : null
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

    // 4) Persist questions (canonicalize MCQ answers to index where possible)
    const questionRows: InsertQuestion[] = generated.questions.map((q, idx) => {
      let answer: unknown = q.answer
      if (q.type === "multiple_choice" && q.options && q.options.length) {
        const opts = normalizeOptionsServer(q.options)
        const i = optionIndex(q.answer, opts)
        if (i != null) answer = i // store canonical 0-based index
      }

      return {
        quizId: quiz.id,
        type: q.type,
        stem: q.stem,
        options: q.options ? q.options : null,
        answer,
        explanation: q.explanation ?? null,
        tags: q.tags ?? null,
        order: q.order ?? idx + 1
      }
    })

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
