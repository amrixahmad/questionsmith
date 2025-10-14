-- Track share link views for simple analytics
ALTER TABLE share_links
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;
