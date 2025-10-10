/*
<ai_context>
Defines the database schema for quiz attempts.
</ai_context>
*/

import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core"
import { quizzesTable } from "./quizzes-schema"

export const attemptsTable = pgTable("attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
  score: numeric("score"),
  maxScore: numeric("max_score"),
  durationSeconds: integer("duration_seconds")
})

export type InsertAttempt = typeof attemptsTable.$inferInsert
export type SelectAttempt = typeof attemptsTable.$inferSelect
