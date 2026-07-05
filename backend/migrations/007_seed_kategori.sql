-- Run via: Supabase Dashboard -> SQL Editor -> paste and execute
-- Migration: 007_seed_kategori
-- Purpose: Seed the initial kategori taxonomy (TC-05, .planning/phases/02-core-product-loop/02-RESEARCH.md)
-- 5 expense categories + 2 income categories, matching the taxonomy already
-- encoded in apps/web/mocks/*.json. Read-only for MVP — run once via the
-- Supabase Dashboard SQL Editor (service role bypasses the kategori RLS
-- read-only restriction for this insert).

-- Expense categories (tipe = 'Pengeluaran')
INSERT INTO public.kategori (nama_kategori, tipe, flag_pemasukan, flag_pengeluaran) VALUES
    ('Makan & Minum',      'Pengeluaran', NULL, 'Kebutuhan'),
    ('Transportasi',       'Pengeluaran', NULL, 'Kebutuhan'),
    ('Hiburan',            'Pengeluaran', NULL, 'Keinginan'),
    ('Keperluan Kuliah',   'Pengeluaran', NULL, 'Kebutuhan'),
    ('Tempat Tinggal',     'Pengeluaran', NULL, 'Kebutuhan');

-- Income categories (tipe = 'Pemasukan')
INSERT INTO public.kategori (nama_kategori, tipe, flag_pemasukan, flag_pengeluaran) VALUES
    ('Uang Saku / Kiriman Orang Tua',   'Pemasukan', 'Fixed Routine',          NULL),
    ('Freelance / Kerja Sampingan',     'Pemasukan', 'Flexible Side Income',   NULL);
