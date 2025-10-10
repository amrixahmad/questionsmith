/*
<ai_context>
Defines the database schema for tokenized share links for quizzes.
</ai_context>
*/

import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { quizzesTable } from "./quizzes-schema"

export const shareLinksTable = pgTable("share_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzesTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  isPublic: boolean("is_public").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertShareLink = typeof shareLinksTable.$inferInsert
export type SelectShareLink = typeof shareLinksTable.$inferSelect
