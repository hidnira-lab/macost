-- Migration: 001_create_dompet
-- Run via: Supabase Dashboard -> SQL Editor -> paste and execute
-- Purpose: Create dompet (wallet) table with RLS policies

-- Create the dompet table
CREATE TABLE IF NOT EXISTS public.dompet (
    id_dompet   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pengguna UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_dompet TEXT        NOT NULL,
    saldo       INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.dompet ENABLE ROW LEVEL SECURITY;

-- RLS Policy: SELECT — user can only read their own wallets
CREATE POLICY "dompet_select_own" ON public.dompet
    FOR SELECT
    USING (auth.uid() = id_pengguna);

-- RLS Policy: INSERT — user can only insert wallets for themselves
CREATE POLICY "dompet_insert_own" ON public.dompet
    FOR INSERT
    WITH CHECK (auth.uid() = id_pengguna);

-- RLS Policy: UPDATE — user can only update their own wallets
CREATE POLICY "dompet_update_own" ON public.dompet
    FOR UPDATE
    USING (auth.uid() = id_pengguna);

-- RLS Policy: DELETE — user can only delete their own wallets
CREATE POLICY "dompet_delete_own" ON public.dompet
    FOR DELETE
    USING (auth.uid() = id_pengguna);
