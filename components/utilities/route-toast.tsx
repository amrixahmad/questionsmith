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

    if (notice === "limit_monthly") {
      const cap = Number(params.get("cap") || 0)
      const used = Number(params.get("used") || 0)
      const left = Number(params.get("left") || 0)
      toast({
        title: "Monthly limit reached",
        description: `You've used ${used}/${cap} generations this month. Start a 7-day trial to get up to 30 more during your trial period.`
      })
      firedRef.current = true
      return
    }

    if (notice === "limit_trial") {
      const cap = Number(params.get("cap") || 0)
      const used = Number(params.get("used") || 0)
      const left = Number(params.get("left") || 0)
      toast({
        title: "Trial limit reached",
        description: `You've used ${used}/${cap} trial generations. Upgrade to Pro for 100/month and no watermark.`
      })
      firedRef.current = true
      return
    }
  }, [params])

  return null
}
