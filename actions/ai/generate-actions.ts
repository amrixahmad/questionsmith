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
import type { ActionState, GenerationParams, QuestionType, GeneratedQuestion } from "@/types"

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

function sanitizeGeneratedQuestion(q: GeneratedQuestion): GeneratedQuestion | null {
  const stem = String(q.stem ?? "").trim()
  if (!stem) return null
  if (q.type === "multiple_choice") {
    const optsTexts = normalizeOptionsServer(q.options)
    const seen = new Set<string>()
    const keptIdx: number[] = []
    for (let i = 0; i < optsTexts.length; i++) {
      const t = String(optsTexts[i] ?? "").trim()
      if (!t) continue
      const key = t.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      keptIdx.push(i)
      if (keptIdx.length >= 4) break
    }
    if (keptIdx.length < 2) return null
    let newOptions: any[] = []
    if (Array.isArray(q.options)) {
      for (const i of keptIdx) {
        const o = (q.options as any[])[i]
        if (o && typeof o === "object" && "text" in o) {
          newOptions.push(o)
        } else {
          newOptions.push({ id: String(i + 1), text: String(optsTexts[i]) })
        }
      }
    } else {
      newOptions = keptIdx.map((i, k) => ({ id: String(k + 1), text: String(optsTexts[i]) }))
    }
    const texts = newOptions.map(o => String((o as any).text ?? "").trim())
    const idx = optionIndex(q.answer, texts)
    if (idx == null || idx < 0 || idx >= texts.length) return null
    return { ...q, stem, options: newOptions, answer: idx }
  }
  if (q.type === "true_false") {
    const toBool = (v: unknown) => {
      if (typeof v === "boolean") return v
      const s = String(v).trim().toLowerCase()
      if (["true", "t", "yes", "y", "1"].includes(s)) return true
      if (["false", "f", "no", "n", "0"].includes(s)) return false
      return null
    }
    const b = toBool(q.answer)
    if (b == null) return null
    return { ...q, stem, options: undefined, answer: b }
  }
  // short_answer | fill_blank
  const ans = String(q.answer ?? "").trim()
  if (!ans) return null
  return { ...q, stem, options: undefined, answer: ans }
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

    // 2b) Enforce allowed types, sanitize per-type, and even distribution
    const typeList: QuestionType[] = Array.isArray(params.types) && params.types?.length
      ? (params.types as QuestionType[])
      : (["multiple_choice"] as QuestionType[])

    const requestedCount = params.questionCount
    const allowed = new Set<QuestionType>(typeList)
    const pool = generated.questions
      .filter(q => allowed.has(q.type as QuestionType))
      .map(q => sanitizeGeneratedQuestion(q))
      .filter((q): q is GeneratedQuestion => q != null)

    function evenAllocation(total: number, kinds: QuestionType[]): Map<QuestionType, number> {
      const base = Math.floor(total / kinds.length)
      let rem = total % kinds.length
      const m = new Map<QuestionType, number>()
      for (const k of kinds) {
        const c = base + (rem > 0 ? 1 : 0)
        if (rem > 0) rem--
        m.set(k, c)
      }
      return m
    }

    const allocation = evenAllocation(Math.max(1, requestedCount), typeList)

    const byType = new Map<QuestionType, GeneratedQuestion[]>()
    for (const q of pool) {
      const t = q.type as QuestionType
      if (!byType.has(t)) byType.set(t, [])
      byType.get(t)!.push(q)
    }

    const selected: GeneratedQuestion[] = []
    // Pick up to allocated per type (in provided order)
    for (const t of typeList) {
      const want = allocation.get(t) ?? 0
      const arr = byType.get(t) ?? []
      if (want > 0 && arr.length) {
        selected.push(...arr.slice(0, Math.min(want, arr.length)))
      }
    }
    // Top-up from leftovers if needed
    if (selected.length < requestedCount) {
      const leftovers: GeneratedQuestion[] = []
      for (const t of typeList) {
        const want = allocation.get(t) ?? 0
        const arr = byType.get(t) ?? []
        if (arr.length > want) leftovers.push(...arr.slice(want))
      }
      // Add any remaining allowed items beyond allocations
      if (leftovers.length) {
        for (const q of leftovers) {
          if (selected.length >= requestedCount) break
          selected.push(q)
        }
      }
    }

    const finalQuestions = selected.slice(0, Math.min(selected.length, requestedCount))

    // 3) Persist quiz
    const [quiz] = await db
      .insert(quizzesTable)
      .values({
        userId: input.userId,
        sourceId: source.id,
        title: generated.title,
        status: "draft",
        difficulty: generated.difficulty ?? params.difficulty,
        questionCount: finalQuestions.length
      } satisfies InsertQuiz)
      .returning()

    // 4) Persist questions (canonicalize MCQ answers to index where possible)
    const questionRows: InsertQuestion[] = finalQuestions.map((q, idx) => {
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
