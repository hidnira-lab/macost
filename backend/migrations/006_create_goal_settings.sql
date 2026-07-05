-- Run via: Supabase Dashboard -> SQL Editor -> paste and execute
-- Migration: 006_create_goal_settings
-- Purpose: Create goal_settings table (one row per user, get-or-create'd in
-- application code) with RLS policies

-- Create the goal_settings table
CREATE TABLE IF NOT EXISTS public.goal_settings (
    id_pengguna UUID  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy    TEXT  NOT NULL DEFAULT 'quick_win' CHECK (strategy IN ('quick_win', 'importance_first')),
    weights     JSONB NOT NULL DEFAULT '{"personal_importance":0.225,"progress_gap":0.219,"saving_capacity":0.215,"urgency":0.178,"target_amount":0.162}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.goal_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: SELECT — user can only read their own settings
CREATE POLICY "goal_settings_select_own" ON public.goal_settings
    FOR SELECT
    USING (auth.uid() = id_pengguna);

-- RLS Policy: INSERT — user can only insert settings for themselves
CREATE POLICY "goal_settings_insert_own" ON public.goal_settings
    FOR INSERT
    WITH CHECK (auth.uid() = id_pengguna);

-- RLS Policy: UPDATE — user can only update their own settings
CREATE POLICY "goal_settings_update_own" ON public.goal_settings
    FOR UPDATE
    USING (auth.uid() = id_pengguna);

-- No DELETE policy — a user's settings row is never deleted, only
-- get-or-create'd/updated in application code.
