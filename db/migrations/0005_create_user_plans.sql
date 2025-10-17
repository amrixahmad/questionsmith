DO $$ BEGIN
  CREATE TYPE plan AS ENUM ('free','trial','pro');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS user_plans (
  user_id text PRIMARY KEY,
  plan plan NOT NULL DEFAULT 'free',
  trial_end timestamp NULL,
  stripe_customer_id text NULL,
  stripe_subscription_id text NULL,
  current_period_end timestamp NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_plans_customer ON user_plans (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_subscription ON user_plans (stripe_subscription_id);
