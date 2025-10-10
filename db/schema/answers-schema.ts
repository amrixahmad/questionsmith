/*
<ai_context>
Defines the database schema for answers submitted during an attempt.
</ai_context>
*/

import {
  boolean,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uuid
} from "drizzle-orm/pg-core"
import { attemptsTable } from "./attempts-schema"
import { questionsTable } from "./questions-schema"

export const answersTable = pgTable("answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  attemptId: uuid("attempt_id")
    .notNull()
    .references(() => attemptsTable.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questionsTable.id, { onDelete: "cascade" }),
  response: jsonb("response").notNull(),
  isCorrect: boolean("is_correct").default(false).notNull(),
  score: numeric("score"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertAnswer = typeof answersTable.$inferInsert
export type SelectAnswer = typeof answersTable.$inferSelect
