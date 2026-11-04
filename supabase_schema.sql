-- ===================================================================
-- TRIPLE T FORM & SME FAN 2026 - SUPABASE DATABASE SCHEMA
-- Copy and paste this script into your Supabase SQL Editor and click RUN
-- ===================================================================

-- 1. Table: registrations (ผู้ลงทะเบียน, บัตร, ชำระเงิน, เสื้อ, เช็คอิน, ของขวัญ, รูปถ่าย)
CREATE TABLE IF NOT EXISTS public.registrations (
    ticket_no TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nickname TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    reg_type TEXT DEFAULT 'member', -- 'member' | 'guest'
    club TEXT DEFAULT 'สงสพัท',
    amount NUMERIC DEFAULT 500,
    paid_amount NUMERIC DEFAULT 500,
    payment_status TEXT DEFAULT 'paid', -- 'paid' | 'pending' | 'free'
    payment_slip TEXT,
    slip_uploaded_at TIMESTAMPTZ,
    has_shirt BOOLEAN DEFAULT true,
    shirt_size TEXT DEFAULT 'L',
    shirt_gender TEXT DEFAULT 'ชาย',
    shirt_received BOOLEAN DEFAULT false,
    shirt_received_at TIMESTAMPTZ,
    checked_in BOOLEAN DEFAULT false,
    checked_in_at TIMESTAMPTZ,
    gift_number INTEGER,
    gift_registered_at TIMESTAMPTZ,
    photo_url TEXT,
    costume_photo TEXT,
    shirt_photo TEXT,
    recommender_name TEXT DEFAULT '',
    guest_title TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- เพิ่มคอลัมน์ shirt_photo สำหรับตารางเดิมที่มีอยู่แล้ว
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS shirt_photo TEXT;

-- 2. Table: event_config (การตั้งค่าระบบ, ธีมสี, รูปหน้าปก)
CREATE TABLE IF NOT EXISTS public.event_config (
    id TEXT PRIMARY KEY DEFAULT 'current',
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table: contest_teams (กลุ่มผู้เข้าประกวดแต่งกาย)
CREATE TABLE IF NOT EXISTS public.contest_teams (
    id TEXT PRIMARY KEY,
    team_name TEXT NOT NULL,
    member_count INTEGER DEFAULT 1,
    members JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table: contest_votes (ผลคะแนนกรรมการตัดสิน พร้อม Audit Trail)
CREATE TABLE IF NOT EXISTS public.contest_votes (
    id TEXT PRIMARY KEY,
    judge_id TEXT,
    judge_name TEXT NOT NULL,
    judge_nickname TEXT DEFAULT '',
    judge_ticket_no TEXT,
    judge_phone TEXT,
    beauty_scores JSONB DEFAULT '{}'::jsonb,
    creativity_scores JSONB DEFAULT '{}'::jsonb,
    team_beauty_scores JSONB DEFAULT '{}'::jsonb,
    team_creativity_scores JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    audit_logs JSONB DEFAULT '[]'::jsonb
);

-- 5. Table: form_responses (คำตอบสำหรับแบบฟอร์ม 1, 2, 3, 4)
CREATE TABLE IF NOT EXISTS public.form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id INTEGER NOT NULL,
    form_key TEXT NOT NULL,
    respondent_name TEXT,
    respondent_phone TEXT,
    answers JSONB NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- อนุญาตให้อ่านและบันทึกข้อมูลได้อย่างราบรื่น
-- ===================================================================

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Create open policies for anonymous client access
DROP POLICY IF EXISTS "Public access registrations" ON public.registrations;
CREATE POLICY "Public access registrations" ON public.registrations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access event_config" ON public.event_config;
CREATE POLICY "Public access event_config" ON public.event_config FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access contest_teams" ON public.contest_teams;
CREATE POLICY "Public access contest_teams" ON public.contest_teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access contest_votes" ON public.contest_votes;
CREATE POLICY "Public access contest_votes" ON public.contest_votes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access form_responses" ON public.form_responses;
CREATE POLICY "Public access form_responses" ON public.form_responses FOR ALL USING (true) WITH CHECK (true);

-- Helpful Indexing for Ultra-fast Search
CREATE INDEX IF NOT EXISTS idx_registrations_name ON public.registrations(name);
CREATE INDEX IF NOT EXISTS idx_registrations_phone ON public.registrations(phone);
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in ON public.registrations(checked_in);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON public.form_responses(form_id);
