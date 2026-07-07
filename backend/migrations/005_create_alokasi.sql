-- Run via: Supabase Dashboard -> SQL Editor -> paste and execute
-- Migration: 005_create_alokasi
-- Purpose: Create alokasi (allocation) table with RLS policies

-- Create the alokasi table
CREATE TABLE IF NOT EXISTS public.alokasi (
    id_alokasi      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pengguna     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id         UUID        NOT NULL REFERENCES public.goal(id_goal) ON DELETE CASCADE,
    transaksi_id    UUID        NOT NULL REFERENCES public.transaksi(id_transaksi) ON DELETE CASCADE,
    nominal_alokasi INTEGER     NOT NULL CHECK (nominal_alokasi > 0),
    tanggal_alokasi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.alokasi ENABLE ROW LEVEL SECURITY;

-- RLS Policy: SELECT — user can only read their own allocations
CREATE POLICY "alokasi_select_own" ON public.alokasi
    FOR SELECT
    USING (auth.uid() = id_pengguna);

-- RLS Policy: INSERT — user can only insert allocations for themselves
CREATE POLICY "alokasi_insert_own" ON public.alokasi
    FOR INSERT
    WITH CHECK (auth.uid() = id_pengguna);

-- RLS Policy: UPDATE — user can only update their own allocations
CREATE POLICY "alokasi_update_own" ON public.alokasi
    FOR UPDATE
    USING (auth.uid() = id_pengguna);

-- RLS Policy: DELETE — user can only delete their own allocations
CREATE POLICY "alokasi_delete_own" ON public.alokasi
    FOR DELETE
    USING (auth.uid() = id_pengguna);
