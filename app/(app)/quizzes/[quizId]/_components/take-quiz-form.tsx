/*
<ai_context>
Client form for taking a quiz. Renders inputs per question and posts to a server action.
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import type { SelectQuestion } from "@/db/schema/questions-schema"
import { useMemo } from "react"

export default function TakeQuizForm({
  attemptId,
  questions,
  onSubmit
}: {
  attemptId: string
  questions: SelectQuestion[]
  onSubmit: (formData: FormData) => void
}) {
  const normalized = useMemo(() => {
    return questions.map(q => ({
      ...q,
      opts: normalizeOptions(q.options)
    }))
  }, [questions])

  return (
    <form action={onSubmit} className="space-y-6">
      <input type="hidden" name="attemptId" value={attemptId} />
      <input
        type="hidden"
        name="qids"
        value={JSON.stringify(questions.map(q => q.id))}
      />

      {normalized.map((q, idx) => (
        <div key={q.id} className="rounded border p-4">
          <div className="mb-2 font-medium">
            {idx + 1}. {q.stem}
          </div>

          {q.type === "multiple_choice" && q.opts && q.opts.length > 0 && (
            <RadioGroup name={`q_${q.id}`}>
              {q.opts.map((opt, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt} id={`q_${q.id}_${i}`} />
                  <Label htmlFor={`q_${q.id}_${i}`}>{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {q.type === "true_false" && (
            <RadioGroup name={`q_${q.id}`} defaultValue="true">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`q_${q.id}_t`} />
                <Label htmlFor={`q_${q.id}_t`}>True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`q_${q.id}_f`} />
                <Label htmlFor={`q_${q.id}_f`}>False</Label>
              </div>
            </RadioGroup>
          )}

          {(q.type === "short_answer" || q.type === "fill_blank") && (
            <Textarea
              name={`q_${q.id}`}
              rows={3}
              placeholder="Type your answer"
            />
          )}
        </div>
      ))}

      <div className="flex justify-end gap-2">
        <Button type="submit">Submit</Button>
      </div>
    </form>
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
