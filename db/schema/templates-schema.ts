/*
<ai_context>
Defines the database schema for generation templates.
</ai_context>
*/

import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const templatesTable = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id"), // null => global template
  name: text("name").notNull(),
  config: jsonb("config").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertTemplate = typeof templatesTable.$inferInsert
export type SelectTemplate = typeof templatesTable.$inferSelect
