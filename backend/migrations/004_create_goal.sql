-- Run via: Supabase Dashboard -> SQL Editor -> paste and execute
-- Migration: 004_create_goal
-- Purpose: Create goal (savings goal) table with RLS policies

-- Create the goal table
CREATE TABLE IF NOT EXISTS public.goal (
    id_goal        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pengguna    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_goal      TEXT        NOT NULL,
    nominal_target INTEGER     NOT NULL CHECK (nominal_target > 0),
    deadline       DATE        NOT NULL,
    skor_keinginan INTEGER     NOT NULL CHECK (skor_keinginan BETWEEN 1 AND 5),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NOTE: skor_kepentingan, nominal_terkumpul, progress_pct, and rank are
    -- deliberately NOT columns on this table. They are always computed in
    -- application code (backend/services/saw_engine.py and the goals router)
    -- on every read/write, never persisted — persisting them would silently
    -- go stale as deadlines approach and allocations accrue.
);

-- Enable Row Level Security
ALTER TABLE public.goal ENABLE ROW LEVEL SECURITY;

-- RLS Policy: SELECT — user can only read their own goals
CREATE POLICY "goal_select_own" ON public.goal
    FOR SELECT
    USING (auth.uid() = id_pengguna);

-- RLS Policy: INSERT — user can only insert goals for themselves
CREATE POLICY "goal_insert_own" ON public.goal
    FOR INSERT
    WITH CHECK (auth.uid() = id_pengguna);

-- RLS Policy: UPDATE — user can only update their own goals
CREATE POLICY "goal_update_own" ON public.goal
    FOR UPDATE
    USING (auth.uid() = id_pengguna);

-- RLS Policy: DELETE — user can only delete their own goals
CREATE POLICY "goal_delete_own" ON public.goal
    FOR DELETE
    USING (auth.uid() = id_pengguna);
