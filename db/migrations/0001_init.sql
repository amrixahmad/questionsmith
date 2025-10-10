-- Enable extensions required for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership') THEN
    CREATE TYPE membership AS ENUM ('free','pro');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
    CREATE TYPE content_type AS ENUM ('text','topic','url','custom');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_status') THEN
    CREATE TYPE quiz_status AS ENUM ('draft','published');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty') THEN
    CREATE TYPE difficulty AS ENUM ('easy','medium','hard');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE question_type AS ENUM ('multiple_choice','true_false','short_answer','fill_blank');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pref_difficulty') THEN
    CREATE TYPE pref_difficulty AS ENUM ('easy','medium','hard');
  END IF;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS profiles (
  user_id text PRIMARY KEY,
  membership membership NOT NULL DEFAULT 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type content_type NOT NULL,
  title text,
  body text,
  url text,
  hash text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  source_id uuid REFERENCES content_sources(id) ON DELETE SET NULL,
  title text NOT NULL,
  status quiz_status NOT NULL DEFAULT 'draft',
  difficulty difficulty,
  question_count integer NOT NULL DEFAULT 0,
  template_id uuid,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type question_type NOT NULL,
  stem text NOT NULL,
  options jsonb,
  answer jsonb NOT NULL,
  explanation text,
  tags text[],
  "order" integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  started_at timestamp NOT NULL DEFAULT now(),
  submitted_at timestamp,
  score numeric,
  max_score numeric,
  duration_seconds integer
);

CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  response jsonb NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  score numeric,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_questions (
  user_id text NOT NULL,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  name text NOT NULL,
  config jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS preferences (
  user_id text PRIMARY KEY,
  default_template_id uuid,
  ai_model text,
  question_count integer NOT NULL DEFAULT 10,
  difficulty pref_difficulty,
  with_explanations boolean NOT NULL DEFAULT true,
  language text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  is_public boolean NOT NULL DEFAULT true,
  expires_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
