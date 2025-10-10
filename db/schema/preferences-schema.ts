/*
<ai_context>
Defines the database schema for per-user generation preferences.
</ai_context>
*/

import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core"

export const prefDifficultyEnum = pgEnum("pref_difficulty", [
  "easy",
  "medium",
  "hard"
])

export const preferencesTable = pgTable("preferences", {
  userId: text("user_id").primaryKey().notNull(),
  defaultTemplateId: uuid("default_template_id"),
  aiModel: text("ai_model"),
  questionCount: integer("question_count").default(10).notNull(),
  difficulty: prefDifficultyEnum("difficulty"),
  withExplanations: boolean("with_explanations").default(true).notNull(),
  language: text("language"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertPreference = typeof preferencesTable.$inferInsert
export type SelectPreference = typeof preferencesTable.$inferSelect
