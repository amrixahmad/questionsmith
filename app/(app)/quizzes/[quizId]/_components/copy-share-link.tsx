/*
<ai_context>
Client button that copies the absolute share URL for a token.
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard"

export default function CopyShareLink({ token }: { token: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({})

  const href =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${token}`
      : `/s/${token}`

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
