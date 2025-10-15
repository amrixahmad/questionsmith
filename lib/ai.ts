/*
<ai_context>
Server-side AI generation utilities. Uses OpenAI via fetch to generate quizzes.
</ai_context>
*/

import { z } from "zod"
import type {
  GeneratedQuiz,
  GeneratedQuestion,
  GenerationParams,
  QuestionType,
  Difficulty
} from "@/types"

const QuestionSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    "multiple_choice",
    "true_false",
    "short_answer",
    "fill_blank"
  ] as [QuestionType, ...QuestionType[]]),
  stem: z.string().min(1),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string()
      })
    )
    .optional(),
  answer: z.union([z.string(), z.array(z.string()), z.boolean(), z.number()]),
  explanation: z.string().optional(),
  tags: z.array(z.string()).optional(),
  order: z.number().int().optional()
})

const QuizSchema = z.object({
  title: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  questionCount: z.number().int().positive(),
  questions: z.array(QuestionSchema).min(1)
})

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-nano-2025-04-14"
}

function buildSystemPrompt() {
  return [
    "You are an expert quiz generator.",
    "Return ONLY strict JSON that conforms exactly to this TypeScript interface:",
    "{ title: string; difficulty?: 'easy'|'medium'|'hard'; questionCount: number; questions: { id?: string; type: 'multiple_choice'|'true_false'|'short_answer'|'fill_blank'; stem: string; options?: { id: string; text: string }[]; answer: string|string[]|boolean|number; explanation?: string; tags?: string[]; order?: number }[] }",
    "No markdown. No prose. No code fences."
  ].join("\n")
}

function buildUserPrompt(text: string, params: GenerationParams) {
  const { questionCount, difficulty, withExplanations, types, language } =
    params
  const typeList =
    Array.isArray(types) && types.length ? types : ["multiple_choice"]
  // Build even distribution guidance when multiple types are chosen
  let distribution = ""
  if (typeList.length > 1 && questionCount > 0) {
    const base = Math.floor(questionCount / typeList.length)
    let rem = questionCount % typeList.length
    const parts = typeList.map(t => {
      const c = base + (rem > 0 ? 1 : 0)
      if (rem > 0) rem--
      return `${t}:${c}`
    })
    distribution = ` Distribute evenly across selected types as: ${parts.join(", ")}.`
  }

  return [
    `Source content:\n${text.trim()}`,
    "---",
    `Constraints: questionCount=${questionCount}${difficulty ? `, difficulty=${difficulty}` : ""}${withExplanations ? ", withExplanations=true" : ""}${typeList.length ? ", allowedTypes=" + typeList.join("|") : ""}${language ? ", language=" + language : ""}.` +
      distribution,
    "Rules:",
    "- Use ONLY types from allowedTypes.",
    "- If type is 'multiple_choice': include around 4 plausible options; set 'answer' as a 1-based index (1..N) or a letter A..Z.",
    "- If type is 'true_false': 'answer' must be a boolean true/false.",
    "- If type is 'short_answer' or 'fill_blank': 'answer' must be a short text string.",
    "Generate diverse questions. Ensure correctness and clarity.",
    withExplanations
      ? "Include concise explanations for each question in the 'explanation' field."
      : "Explanations are optional; omit when unnecessary.",
    "Return strict JSON."
  ].join("\n")
}

async function callOpenAI(
  messages: { role: "system" | "user"; content: string }[]
) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set")

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      temperature: 1,
      top_p: 1,
      response_format: { type: "json_object" }
    })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`OpenAI error: ${res.status} ${res.statusText} ${text}`)
  }

  const data = await res.json()
  const content: string | undefined = data?.choices?.[0]?.message?.content
  if (!content) throw new Error("No content from OpenAI")
  return content as string
}

export async function generateQuizFromText(
  text: string,
  params: GenerationParams
): Promise<GeneratedQuiz> {
  const sys = buildSystemPrompt()
  const usr = buildUserPrompt(text, params)
  const raw = await callOpenAI([
    { role: "system", content: sys },
    { role: "user", content: usr }
  ])

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new Error("Failed to parse OpenAI JSON response")
  }

  const quiz = QuizSchema.parse(parsed)
  return quiz
}
