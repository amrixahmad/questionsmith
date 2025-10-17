ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS trial_started_at timestamp NULL,
  ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false;
