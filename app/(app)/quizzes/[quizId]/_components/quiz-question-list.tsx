/*
<ai_context>
Client component that renders a quiz's questions with type badges, options, and toggles to reveal answers and explanations.
</ai_context>
*/

"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { SelectQuestion } from "@/db/schema/questions-schema"
import { useMemo, useState } from "react"

interface QuestionListProps {
  questions: SelectQuestion[]
}

export function QuestionList({ questions }: QuestionListProps) {
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({})
  const [showExplanation, setShowExplanation] = useState<
    Record<string, boolean>
  >({})

  const normalized = useMemo(
    () =>
      questions.map((q, idx) => ({
        index: idx + 1,
        id: q.id,
        type: q.type,
        stem: q.stem,
        options: normalizeOptions(q.options),
        answer: q.answer as unknown,
        explanation: q.explanation ?? undefined
      })),
    [questions]
  )

  return (
    <div className="space-y-4">
      {normalized.map(q => (
        <div key={q.id} className="rounded border p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="font-medium">
              {q.index}. {q.stem}
            </div>

            <div className="ml-auto flex items-center gap-2 text-xs">
              <Badge variant="outline" className="uppercase">
                {q.type}
              </Badge>
            </div>
          </div>

          <div className="mt-2 space-y-1 text-sm">
            {renderOptions(q.type, q.options)}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setShowAnswer(prev => ({ ...prev, [q.id]: !prev[q.id] }))
              }
            >
              {showAnswer[q.id] ? "Hide answer" : "Show answer"}
            </Button>

            {q.explanation && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setShowExplanation(prev => ({ ...prev, [q.id]: !prev[q.id] }))
                }
              >
                {showExplanation[q.id]
                  ? "Hide explanation"
                  : "Show explanation"}
              </Button>
            )}
          </div>

          {showAnswer[q.id] && (
            <div className="bg-muted mt-2 rounded p-2 text-sm">
              <div className="font-medium">Answer</div>
              <div className="mt-1">
                {formatAnswer(q.answer, q.options, q.type)}
              </div>
            </div>
          )}

          {showExplanation[q.id] && q.explanation && (
            <div className="bg-muted/60 mt-2 rounded p-2 text-sm">
              <div className="font-medium">Explanation</div>
              <div className="text-muted-foreground mt-1">{q.explanation}</div>
            </div>
          )}
        </div>
      ))}

      {normalized.length === 0 && (
        <div className="text-muted-foreground text-sm">No questions yet.</div>
      )}
    </div>
  )
}

function normalizeOptions(options: unknown): string[] | undefined {
  if (!options) return undefined
  if (Array.isArray(options)) {
    const texts: string[] = []
    for (const item of options as any[]) {
      if (typeof item === "string") texts.push(item)
      else if (item && typeof item === "object") {
        const maybe = (item as any).text ?? (item as any).label ?? ""
        if (maybe) texts.push(String(maybe))
      }
    }
    return texts.length ? texts : undefined
  }
  return undefined
}

function renderOptions(
  type: SelectQuestion["type"],
  options?: string[]
): React.ReactNode {
  if (type === "multiple_choice") {
    if (!options || options.length === 0) return null
    return (
      <div>
        {options.map((t, i) => (
          <div key={i} className="flex gap-2">
            <div className="text-muted-foreground">{indexToLetter(i)}.</div>
            <div>{t}</div>
          </div>
        ))}
      </div>
    )
  }

  if (type === "true_false") {
    const tf = options && options.length ? options : ["True", "False"]
    return (
      <div>
        {tf.map((t, i) => (
          <div key={i} className="flex gap-2">
            <div className="text-muted-foreground">{indexToLetter(i)}.</div>
            <div>{t}</div>
          </div>
        ))}
      </div>
    )
  }

  // For short_answer / fill_blank, no options to render. Show hint if needed.
  return null
}

function toAnswerIndex(value: unknown, options?: string[]): number | null {
  const s = String(value ?? "").trim()
  if (!s) return null
  const lower = s.toLowerCase()

  // single letter (optionally with ')' or '.')
  if (/^[a-z][)\.]?$/i.test(s)) {
    const ch = lower[0]
    return ch.charCodeAt(0) - "a".charCodeAt(0)
  }

  // 'a3' or 'A 3' => 1-based index 3
  const letterNum = lower.match(/^([a-z])\s*(\d+)$/)
  if (letterNum) {
    const idx = parseInt(letterNum[2], 10) - 1
    return idx >= 0 ? idx : null
  }

  // 'option c', 'choice d', 'answer b'
  const wordLetter = lower.match(/^(option|choice|answer)\s+([a-z])$/)
  if (wordLetter) {
    const ch = wordLetter[2]
    return ch.charCodeAt(0) - "a".charCodeAt(0)
  }

  // numeric -> index; accept 0-based or 1-based
  if (/^\d+$/.test(s)) {
    const i = parseInt(s, 10)
    if (options && i >= 1 && i <= options.length) return i - 1
    return i
  }

  // 'option 3', 'choice 2', 'answer 4'
  const wordNum = lower.match(/^(option|choice|answer)\s+(\d+)$/)
  if (wordNum) {
    const idx = parseInt(wordNum[2], 10) - 1
    return idx >= 0 ? idx : null
  }

  // option text -> index
  if (options && options.length) {
    const idx = options.findIndex(o => String(o).trim().toLowerCase() === lower)
    return idx >= 0 ? idx : null
  }
  return null
}

function indexToLetter(i: number) {
  return String.fromCharCode("A".charCodeAt(0) + i)
}

function formatAnswer(
  ans: unknown,
  options: string[] | undefined,
  type: SelectQuestion["type"]
): string {
  if (type === "multiple_choice") {
    const idx = toAnswerIndex(ans, options)
    if (idx != null) {
      const letter = indexToLetter(idx)
      if (options && idx >= 0 && idx < options.length)
        return `${letter} — ${options[idx]}`
      return letter
    }
  }
  if (Array.isArray(ans)) return ans.map(a => String(a)).join(", ")
  if (typeof ans === "boolean") return ans ? "True" : "False"
  if (ans == null) return ""
  return String(ans)
}

function toAnswerLetter(value: unknown, options?: string[]): string | null {
  const s = String(value ?? "").trim()
  if (!s) return null
  const lower = s.toLowerCase()

  // single letter (optionally with ')' or '.') -> uppercase
  if (/^[a-z][)\.]?$/i.test(s)) return s[0].toUpperCase()

  // patterns like 'a3' or 'A 3' => 1-based index 3 -> 'C'
  const letterNum = lower.match(/^([a-z])\s*(\d+)$/)
  if (letterNum) {
    const idx = parseInt(letterNum[2], 10) - 1
    if (idx >= 0 && (!options || (options && idx < options.length))) {
      return indexToLetter(idx)
    }
  }

  // patterns like 'option c', 'choice d', 'answer b'
  const wordLetter = lower.match(/^(option|choice|answer)\s+([a-z])$/)
  if (wordLetter) return wordLetter[2].toUpperCase()

  // numeric -> index; accept 0-based or 1-based
  if (/^\d+$/.test(s)) {
    const i = parseInt(s, 10)
    const idx = options ? (i >= 1 && i <= options.length ? i - 1 : i) : i - 1
    if (idx >= 0 && (!options || (options && idx < options.length))) {
      return indexToLetter(idx)
    }
  }

  // patterns like 'option 3', 'choice 2', 'answer 4'
  const wordNum = lower.match(/^(option|choice|answer)\s+(\d+)$/)
  if (wordNum) {
    const idx = parseInt(wordNum[2], 10) - 1
    if (idx >= 0 && (!options || (options && idx < options.length))) {
      return indexToLetter(idx)
    }
  }

  // option text -> find index and map to letter
  if (options && options.length) {
    const idx = options.findIndex(o => String(o).trim().toLowerCase() === lower)
    if (idx >= 0) return indexToLetter(idx)
  }
  return null
}
