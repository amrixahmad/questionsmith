/*
<ai_context>
Client submit button that reflects server action pending state.
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useFormStatus } from "react-dom"

export default function SubmitButton({
  label = "Generate"
}: {
  label?: string
}) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      {pending ? "Generating..." : label}
    </Button>
  )
}
