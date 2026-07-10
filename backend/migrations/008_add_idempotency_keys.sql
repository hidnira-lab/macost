-- Run via: Supabase Dashboard -> SQL Editor -> paste and execute
-- Migration: 008_add_idempotency_keys
-- Purpose: Add idempotency_key column + partial UNIQUE index to transaksi, goal, alokasi

-- transaksi: nullable idempotency_key + partial unique index (id_pengguna, idempotency_key)
-- Column stays nullable so every existing/online (non-offline) write path keeps
-- omitting this field without failing (04-RESEARCH.md Pitfall 4). The partial
-- index (WHERE idempotency_key IS NOT NULL) is what actually enforces
-- per-user uniqueness among non-null values — many NULLs are always allowed.
ALTER TABLE public.transaksi ADD COLUMN idempotency_key UUID NULL;
CREATE UNIQUE INDEX transaksi_idempotency_unique
    ON public.transaksi (id_pengguna, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- goal: same nullable column + partial unique index pattern
ALTER TABLE public.goal ADD COLUMN idempotency_key UUID NULL;
CREATE UNIQUE INDEX goal_idempotency_unique
    ON public.goal (id_pengguna, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- alokasi: same nullable column + partial unique index pattern
ALTER TABLE public.alokasi ADD COLUMN idempotency_key UUID NULL;
CREATE UNIQUE INDEX alokasi_idempotency_unique
    ON public.alokasi (id_pengguna, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
