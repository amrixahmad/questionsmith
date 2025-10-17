import { pgEnum, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core"

export const planEnum = pgEnum("plan", ["free", "trial", "pro"])

export const userPlansTable = pgTable("user_plans", {
  userId: text("user_id").primaryKey(),
  plan: planEnum("plan").notNull().default("free"),
  trialEnd: timestamp("trial_end"),
  trialStartedAt: timestamp("trial_started_at"),
  trialUsed: boolean("trial_used").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
})

export type InsertUserPlan = typeof userPlansTable.$inferInsert
export type SelectUserPlan = typeof userPlansTable.$inferSelect
