-- Run via: Supabase Dashboard -> SQL Editor -> paste and execute
-- Migration: 002_create_kategori
-- Purpose: Create kategori (category) table with RLS policies. Read-only for
-- MVP — categories are seeded from research data (007_seed_kategori.sql),
-- not managed by regular users.

-- Create the kategori table
CREATE TABLE IF NOT EXISTS public.kategori (
    id_kategori      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kategori    TEXT        NOT NULL,
    tipe             TEXT        NOT NULL CHECK (tipe IN ('Pemasukan', 'Pengeluaran')),
    flag_pemasukan   TEXT        NULL,
    flag_pengeluaran TEXT        NULL
);

-- Enable Row Level Security
ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;

-- RLS Policy: SELECT — all authenticated users can read the shared category list
CREATE POLICY "kategori_select_all" ON public.kategori
    FOR SELECT
    USING (true);

-- No INSERT/UPDATE/DELETE policy for regular users — kategori is read-only
-- for MVP (API_CONTRACT.md §3). Seeding is done via the service-role client,
-- which bypasses RLS.
