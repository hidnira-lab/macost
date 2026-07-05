-- Run via: Supabase Dashboard -> SQL Editor -> paste and execute
-- Migration: 003_create_transaksi
-- Purpose: Create transaksi (transaction) table with RLS policies

-- Create the transaksi table
CREATE TABLE IF NOT EXISTS public.transaksi (
    id_transaksi      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pengguna       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipe_transaksi    TEXT        NOT NULL CHECK (tipe_transaksi IN ('Pemasukan', 'Pengeluaran')),
    nominal           INTEGER     NOT NULL CHECK (nominal > 0),
    tanggal_transaksi DATE        NOT NULL,
    metode_input      TEXT        NOT NULL DEFAULT 'Manual',
    dompet_id         UUID        NOT NULL REFERENCES public.dompet(id_dompet) ON DELETE CASCADE,
    kategori_id       UUID        NOT NULL REFERENCES public.kategori(id_kategori),
    source_label      TEXT        NULL,
    catatan           TEXT        NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;

-- RLS Policy: SELECT — user can only read their own transactions
CREATE POLICY "transaksi_select_own" ON public.transaksi
    FOR SELECT
    USING (auth.uid() = id_pengguna);

-- RLS Policy: INSERT — user can only insert transactions for themselves
CREATE POLICY "transaksi_insert_own" ON public.transaksi
    FOR INSERT
    WITH CHECK (auth.uid() = id_pengguna);

-- RLS Policy: UPDATE — user can only update their own transactions
CREATE POLICY "transaksi_update_own" ON public.transaksi
    FOR UPDATE
    USING (auth.uid() = id_pengguna);

-- RLS Policy: DELETE — user can only delete their own transactions
CREATE POLICY "transaksi_delete_own" ON public.transaksi
    FOR DELETE
    USING (auth.uid() = id_pengguna);
