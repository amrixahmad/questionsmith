/*
<ai_context>
Client utility component that reads a `notice` from the URL and shows a toast.
Whitelisted notices only.
</ai_context>
*/

"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

export default function RouteToast() {
  const params = useSearchParams()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    const notice = params.get("notice")
    if (!notice) return

    if (notice === "no_attempts") {
      toast({
        title: "No attempts remaining",
        description: "You have used all allowed attempts for this quiz."
      })
      firedRef.current = true
      return
    }
  }, [params])

  return null
}
