-- ============================================================
-- Streakly — Schema Migration: Habit Types + Performance
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add frequency columns to habits
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS frequency_type TEXT NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS frequency_target INTEGER NOT NULL DEFAULT 1;

-- 2. Constrain valid frequency_type values
ALTER TABLE habits
  DROP CONSTRAINT IF EXISTS habits_frequency_type_check;
ALTER TABLE habits
  ADD CONSTRAINT habits_frequency_type_check
    CHECK (frequency_type IN ('daily', 'weekly'));

-- 3. Constrain frequency_target to 1–7
ALTER TABLE habits
  DROP CONSTRAINT IF EXISTS habits_frequency_target_check;
ALTER TABLE habits
  ADD CONSTRAINT habits_frequency_target_check
    CHECK (frequency_target BETWEEN 1 AND 7);

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date
  ON habit_completions(habit_id, date);

CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date
  ON habit_completions(user_id, date);

CREATE INDEX IF NOT EXISTS idx_habits_user_id
  ON habits(user_id);

-- 5. Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'habits'
ORDER BY ordinal_position;
