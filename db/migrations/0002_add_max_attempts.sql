-- Add per-quiz retake limit. Default to 1 attempt per user.
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 1;
