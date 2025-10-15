/*
<ai_context>
Server page for generating a quiz from raw text using OpenAI.
</ai_context>
*/

"use server"

import { generateQuizFromTextAction } from "@/actions/ai/generate-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import PendingFieldset from "../_components/pending-fieldset"
import SubmitButton from "../_components/submit-button"
import type { QuestionType } from "@/types"

export default async function GenerateFromTextPage() {
  async function generate(formData: FormData) {
    "use server"
    const { userId } = await auth()
    if (!userId) return redirect("/login")

    const text = String(formData.get("text") || "").trim()
    const count = Number(formData.get("questionCount") || 10)
    const selectedTypes = (formData.getAll("types") as string[]).map(v =>
      String(v)
    )
    const allowedSet = new Set([
      "multiple_choice",
      "true_false",
      "short_answer",
      "fill_blank"
    ])
    const types = selectedTypes.filter(t => allowedSet.has(t))
    const finalTypes: QuestionType[] = (
      types.length ? types : ["multiple_choice"]
    ) as QuestionType[]

    if (!text) return redirect("/generate/text")

    const res = await generateQuizFromTextAction({
      userId,
      text,
      params: {
        questionCount: isNaN(count) ? 10 : Math.max(1, Math.min(50, count)),
        types: finalTypes as QuestionType[]
      }
    })

    if (res.isSuccess) {
      return redirect(`/quizzes/${res.data.quiz.id}`)
    }

    return redirect("/dashboard")
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Quiz from Text</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={generate} className="space-y-4">
            <PendingFieldset>
              <div>
                <Label htmlFor="text">Paste text</Label>
                <Textarea
                  id="text"
                  name="text"
                  rows={10}
                  placeholder="Paste content here..."
                />
              </div>
              <div>
                <Label htmlFor="questionCount">Question count</Label>
                <input
                  id="questionCount"
                  name="questionCount"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={10}
                  className="border-input bg-background text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-24 rounded-md border px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="text-muted-foreground mt-1 text-xs">
                  Generating can take 20–40 seconds depending on input size.
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Question types</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="types"
                      value="multiple_choice"
                      defaultChecked
                    />
                    <span>Multiple Choice</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="types" value="true_false" />
                    <span>True / False</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="types" value="short_answer" />
                    <span>Short Answer</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="types" value="fill_blank" />
                    <span>Fill in the Blank</span>
                  </label>
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  If multiple are selected, questions are evenly distributed.
                </div>
              </div>

              <SubmitButton label="Generate" />
            </PendingFieldset>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
