-- Survey Reward Automation System - Database Schema
-- Run this in your Supabase SQL Editor

-- Submissions table to store all survey responses
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  tally_response_id TEXT UNIQUE NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  classification TEXT NOT NULL CHECK (classification IN ('valid', 'bot', 'attention_fail')),
  classification_reason TEXT,
  promo_code TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_type TEXT CHECK (email_type IN ('reward', 'abuse', NULL)),
  submission_time_seconds NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster duplicate email lookups
CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);

-- Index for finding pending email sends
CREATE INDEX IF NOT EXISTS idx_submissions_email_sent ON submissions(email_sent) WHERE email_sent = FALSE;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional, for additional protection)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role full access (for API operations)
CREATE POLICY "Service role has full access" ON submissions
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);
