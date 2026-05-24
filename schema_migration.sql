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

-- ============================================================
-- Email Templates: Template Service (issue #7)
-- ============================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT UNIQUE NOT NULL,
  subject    TEXT NOT NULL,
  html_body  TEXT NOT NULL,
  text_body  TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO email_templates (name, subject, html_body, text_body) VALUES
(
  'welcome',
  'Welcome to Streakly, {{name}}!',
  '<h1>Hi {{name}}</h1><p>You are all set. Your first streak starts today.</p>',
  'Hi {{name}}, you are all set. Your first streak starts today.'
),
(
  'streak-reminder',
  'Keep your streak alive, {{name}}!',
  '<p>Hi {{name}}, you have a <strong>{{streak}}-day streak</strong>. Do not break it!</p>',
  'Hi {{name}}, you have a {{streak}}-day streak. Do not break it!'
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Forgot Password: Token Table + Email Template (issue #9)
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prt_token   ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);

INSERT INTO email_templates (name, subject, html_body, text_body) VALUES (
  'forgot-password',
  'Reset your Streakly password',
  '<div style="font-family:sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#00c853">Reset your password</h2>
    <p>Hi {{name}},</p>
    <p>We received a request to reset your Streakly password. Click the button below — this link expires in <strong>1 hour</strong>.</p>
    <a href="{{resetUrl}}" style="display:inline-block;padding:12px 24px;background:#00c853;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
      Reset Password
    </a>
    <p style="color:#888;font-size:13px">If you did not request this, ignore this email. Your password will not change.</p>
    <p style="color:#888;font-size:12px">Link: {{resetUrl}}</p>
  </div>',
  'Hi {{name}}, reset your Streakly password here: {{resetUrl}} — expires in 1 hour. If you did not request this, ignore this email.'
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Email OTP Verification (issue #10)
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing users are considered verified (they pre-date email verification)
UPDATE users SET is_verified = true WHERE is_verified = false;

CREATE TABLE IF NOT EXISTS email_verification_otps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp        TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evo_user_id ON email_verification_otps(user_id);

INSERT INTO email_templates (name, subject, html_body, text_body) VALUES (
  'email-verification',
  'Verify your Streakly account',
  '<div style="font-family:sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#00c853">Verify your email</h2>
    <p>Hi {{name}}, welcome to Streakly!</p>
    <p>Enter this code to confirm your email address. It expires in <strong>10 minutes</strong>.</p>
    <div style="font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;padding:24px;background:#1a1a1a;border-radius:12px;color:#00c853;margin:16px 0">
      {{otp}}
    </div>
    <p style="color:#888;font-size:13px">If you did not create a Streakly account, ignore this email.</p>
  </div>',
  'Hi {{name}}, your Streakly verification code is: {{otp}} — expires in 10 minutes.'
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Completion Notes (issue #12)
-- ============================================================

ALTER TABLE habit_completions
  ADD COLUMN IF NOT EXISTS notes TEXT;
