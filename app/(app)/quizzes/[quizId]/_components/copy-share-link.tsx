/*
<ai_context>
Client button that copies the absolute share URL for a token.
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard"
import { useEffect, useState } from "react"

export default function CopyShareLink({ token }: { token: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({})

  // Hydration-safe: start with relative path to match SSR HTML, then upgrade to absolute on mount
  const [href, setHref] = useState(`/s/${token}`)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHref(`${window.location.origin}/s/${token}`)
    }
  }, [token])

  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground select-all text-xs">{href}</div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => copyToClipboard(href)}
      >
        {isCopied ? "Copied" : "Copy link"}
      </Button>
    </div>
  )
}
