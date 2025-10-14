/*
<ai_context>
Client beacon component to increment share link views via API on mount.
</ai_context>
*/

"use client"

import { useEffect } from "react"

export default function ShareViewBeacon({ token }: { token: string }) {
  useEffect(() => {
    const ac = new AbortController()
    fetch(`/api/share-links/${encodeURIComponent(token)}/view`, {
      method: "POST",
      keepalive: true,
      signal: ac.signal
    }).catch(() => {})
    return () => ac.abort()
  }, [token])
  return null
}
