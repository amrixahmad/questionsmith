/*
<ai_context>
Defines the database schema for user-submitted content sources used to generate quizzes.
</ai_context>
*/

import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const contentTypeEnum = pgEnum("content_type", [
  "text",
  "topic",
  "url",
  "custom"
])

export const contentSourcesTable = pgTable("content_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  type: contentTypeEnum("type").notNull(),
  title: text("title"),
  body: text("body"),
  url: text("url"),
  hash: text("hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertContentSource = typeof contentSourcesTable.$inferInsert
export type SelectContentSource = typeof contentSourcesTable.$inferSelect
