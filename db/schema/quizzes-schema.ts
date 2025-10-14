/*
<ai_context>
Defines the database schema for quizzes.
</ai_context>
*/

import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core"
import { contentSourcesTable } from "./content-sources-schema"

export const quizStatusEnum = pgEnum("quiz_status", ["draft", "published"])
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"])

export const quizzesTable = pgTable("quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  sourceId: uuid("source_id").references(() => contentSourcesTable.id, {
    onDelete: "set null"
  }),
  title: text("title").notNull(),
  status: quizStatusEnum("status").notNull().default("draft"),
  difficulty: difficultyEnum("difficulty"),
  questionCount: integer("question_count").notNull().default(0),
  templateId: uuid("template_id"),
  maxAttempts: integer("max_attempts").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertQuiz = typeof quizzesTable.$inferInsert
export type SelectQuiz = typeof quizzesTable.$inferSelect
