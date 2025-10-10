/*
<ai_context>
Defines the database schema for questions within a quiz.
</ai_context>
*/

import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core"
import { quizzesTable } from "./quizzes-schema"

export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice",
  "true_false",
  "short_answer",
  "fill_blank"
])

export const questionsTable = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzesTable.id, { onDelete: "cascade" }),
  type: questionTypeEnum("type").notNull(),
  stem: text("stem").notNull(),
  options: jsonb("options"),
  answer: jsonb("answer").notNull(),
  explanation: text("explanation"),
  tags: text("tags").array(),
  order: integer("order"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertQuestion = typeof questionsTable.$inferInsert
export type SelectQuestion = typeof questionsTable.$inferSelect
