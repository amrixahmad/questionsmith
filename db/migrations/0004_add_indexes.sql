-- Performance indexes for common queries

-- Share links: lookup active link by quiz
CREATE INDEX IF NOT EXISTS idx_share_links_quiz_public
  ON share_links (quiz_id, is_public);

-- Share links: lookup by token
CREATE INDEX IF NOT EXISTS idx_share_links_token
  ON share_links (token);

-- Attempts: enforce retake policy (per user, submitted attempts)
CREATE INDEX IF NOT EXISTS idx_attempts_quiz_user_submitted
  ON attempts (quiz_id, user_id)
  WHERE submitted_at IS NOT NULL;

-- Attempts: analytics by quiz (submitted attempts)
CREATE INDEX IF NOT EXISTS idx_attempts_quiz_submitted
  ON attempts (quiz_id)
  WHERE submitted_at IS NOT NULL;

-- Questions: fetch questions by quiz
CREATE INDEX IF NOT EXISTS idx_questions_quiz
  ON questions (quiz_id);

-- Answers: load answers by attempt
CREATE INDEX IF NOT EXISTS idx_answers_attempt
  ON answers (attempt_id);

-- Quizzes: list quizzes by owner
CREATE INDEX IF NOT EXISTS idx_quizzes_user
  ON quizzes (user_id);
