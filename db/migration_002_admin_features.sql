-- ============================================================
-- Migration: Add missing ENUM values and fix position constraint
-- Run this against your database to enable line breaks,
-- admin redact, and drag-and-drop reordering.
-- ============================================================

-- 1. Add missing status values to the word_status ENUM
ALTER TYPE word_status ADD VALUE IF NOT EXISTS 'linebreak';

ALTER TYPE word_status ADD VALUE IF NOT EXISTS 'admin_redacted';

ALTER TYPE word_status ADD VALUE IF NOT EXISTS 'protected';

-- 2. Allow content to be NULL (line breaks use NULL-ish content)
ALTER TABLE words ALTER COLUMN content DROP NOT NULL;

-- 3. Make position UNIQUE constraint DEFERRABLE so reorder
--    can shift positions within a transaction without collision.
--    Drop the old constraint and re-create as deferrable.
ALTER TABLE words DROP CONSTRAINT IF EXISTS words_position_key;

ALTER TABLE words
ADD CONSTRAINT words_position_key UNIQUE (position) DEFERRABLE INITIALLY DEFERRED;

-- 4. Add content_length column if missing (used by admin panel)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'words' AND column_name = 'content_length'
  ) THEN
    ALTER TABLE words ADD COLUMN content_length INTEGER NOT NULL DEFAULT 0;
    UPDATE words SET content_length = COALESCE(LENGTH(content), 0);
  END IF;
END
$$;