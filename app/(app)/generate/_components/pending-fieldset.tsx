/*
<ai_context>
Client helper that disables its children while a parent form is pending.
</ai_context>
*/

"use client"

import { useFormStatus } from "react-dom"

export default function PendingFieldset({
  children
}: {
  children: React.ReactNode
}) {
  const { pending } = useFormStatus()
  return (
    <fieldset
      disabled={pending}
      aria-busy={pending}
      className="disabled:opacity-60"
    >
      {children}
    </fieldset>
  )
}
