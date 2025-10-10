/*
<ai_context>
Defines the database schema for saved questions by a user.
</ai_context>
*/

import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { questionsTable } from "./questions-schema"

export const savedQuestionsTable = pgTable(
  "saved_questions",
  {
    userId: text("user_id").notNull(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  t => ({
    pk: primaryKey({ columns: [t.userId, t.questionId] })
  })
)

export type InsertSavedQuestion = typeof savedQuestionsTable.$inferInsert
export type SelectSavedQuestion = typeof savedQuestionsTable.$inferSelect
