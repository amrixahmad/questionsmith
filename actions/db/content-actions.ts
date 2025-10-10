/*
<ai_context>
Server actions for content sources used as inputs to quiz generation.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
  contentSourcesTable,
  type InsertContentSource,
  type SelectContentSource
} from "@/db/schema/content-sources-schema"
import { ActionState } from "@/types"

export async function createContentSourceAction(
  data: InsertContentSource
): Promise<ActionState<SelectContentSource>> {
  try {
    const [row] = await db.insert(contentSourcesTable).values(data).returning()
    return { isSuccess: true, message: "Content source created", data: row }
  } catch (error) {
    console.error("createContentSourceAction error", error)
    return { isSuccess: false, message: "Failed to create content source" }
  }
}
