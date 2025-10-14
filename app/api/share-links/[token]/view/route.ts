/*
<ai_context>
API route to increment a share link's view count when the shared page is visited.
</ai_context>
*/

import { db } from "@/db/db"
import { shareLinksTable } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

export async function POST(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token
  if (!token) return new Response(null, { status: 400 })

  const row = await db.query.shareLinks.findFirst({
    where: eq(shareLinksTable.token, token)
  })
  if (!row || !row.isPublic) return new Response(null, { status: 204 })
  if (row.expiresAt && new Date(row.expiresAt) < new Date())
    return new Response(null, { status: 204 })

  await db
    .update(shareLinksTable)
    .set({ views: sql`${shareLinksTable.views} + 1` })
    .where(eq(shareLinksTable.id, row.id))

  return Response.json({ ok: true })
}

export async function GET() {
  return new Response(null, { status: 405 })
}
