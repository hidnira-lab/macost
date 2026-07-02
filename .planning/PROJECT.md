# Macost

## What This Is

Pocket Management Information System (MIS) untuk mahasiswa Indonesia yang berpendapatan campuran — fixed allowance dari orang tua dan side income dari freelance/part-time. Macost membantu pengguna mencatat transaksi, mengelola goal tabungan dengan visual pixel art, dan mendapatkan saran alokasi cerdas (berbasis SAW) setiap kali side income masuk. Project semester 4 PSI, Tim Zephyra UII, dikerjakan 4 orang secara paralel.

## Core Value

Saat side income masuk, sistem langsung menyarankan alokasi ke goal prioritas tertinggi — dengan proses suggest-and-confirm yang tidak pernah auto-execute, sehingga user tetap memegang kendali penuh atas keuangannya.

## Business Context

- **Customer:** Mahasiswa Indonesia dengan kombinasi fixed allowance + side income
- **Revenue model:** Proyek akademik (PSI semester 4 UII) — tidak ada monetisasi
- **Success metric:** MVP siap demo 9-10 Juli 2026, lolos Expo 14 Juli 2026
- **Strategy notes:** Survey n=62 mahasiswa memvalidasi kebutuhan (95.1% punya niat nabung tapi uang habis; 64.9% berhenti pakai app sejenis karena input ribet ~47% dan laporan tidak memberi arahan ~19%)

## Requirements

### Validated

Keputusan arsitektur dan desain yang sudah dikunci sebelum pembangunan fitur:

- ✓ Arsitektur 3-tier (Next.js → FastAPI → Supabase) — existing codebase scaffold
- ✓ API contract v0.1 dikunci dengan 17 FR dipetakan ke endpoint — `API_CONTRACT.md`
- ✓ Data model finalized: 6 entitas (Pengguna, Dompet, Kategori, Transaksi, Goal, Alokasi)
- ✓ SAW algorithm weights dari survey n=62: personal_importance 22.5%, progress_gap 21.9%, saving_capacity 21.5%, urgency 17.8%, target_amount 16.2% — `backend/services/saw_engine.py` (planned path)
- ✓ Mock data untuk frontend dev: `apps/web/mocks/` (goals, transactions, allocation-suggestion)
- ✓ Source labeling (Allowance/Side Income) server-side only, dari `flag_pemasukan` kategori
- ✓ Smart Allocation: selalu suggest-and-confirm, tidak pernah auto-execute
- ✓ UI di-desain di Figma (21 halaman, hasil refine dari Stitch) — Figma adalah sumber kebenaran visual
- ✓ Dashboard KPI order research-validated: expense breakdown → goal progress → monthly trend → overspending alert → total balance

### Active

**Kelompok 1 — Foundation (tulang punggung):**
- [ ] FR-001: User dapat input transaksi manual (nominal, jenis, kategori, tanggal, catatan)
- [ ] FR-005: Sistem otomatis melabeli pemasukan sebagai Allowance/Side Income dari kategori (server-side)
- [ ] FR-006: Dashboard dengan urutan KPI spesifik hasil riset
- [ ] FR-018: User dapat mengelola dompet (wallet) — CRUD nama & saldo
- [ ] Auth: User dapat register, login, dan logout via Supabase Auth

**Kelompok 2 — Inti Produk (nilai utama):**
- [ ] FR-007: User dapat membuat goal baru (nama, target nominal, deadline, skor keinginan)
- [ ] FR-008: User dapat melihat progress goal (nominal terkumpul vs target, dari SUM Alokasi)
- [ ] FR-009: Goal diranking otomatis pakai SAW dengan 5 kriteria berbobot
- [ ] FR-010: Saat side income masuk, sistem tampilkan saran alokasi ke goal prioritas (≈30-40%, dalam ≤2 detik)
- [ ] FR-011: User wajib konfirmasi alokasi — tidak pernah auto-execute
- [ ] FR-013: Toggle strategi Quick Win (default) vs Importance-First
- [ ] FR-014: User dapat adjust bobot kriteria SAW secara manual

**Kelompok 3 — Pelengkap (memperkaya input & insight):**
- [ ] FR-002: Ekstraksi otomatis dari foto struk via AI vision
- [ ] FR-004: User dapat koreksi hasil ekstraksi sebelum disimpan
- [ ] FR-003: Ekstraksi & klasifikasi dari file e-statement PDF (bulk import)
- [ ] FR-012: AI Financial Assistant — insight satu arah berbahasa natural (bukan chat interaktif)

**Kelompok 4 — Polish (kualitas & ketahanan):**
- [ ] FR-015: Progress goal divisualisasikan sebagai pixel art
- [ ] FR-016: Offline cache untuk transaksi, sync otomatis saat online kembali
- [ ] FR-017: Fallback manual/template jika AI vision (>10s) atau LLM (>15s) gagal merespons

### Out of Scope

- Integrasi API resmi bank/e-wallet — butuh partnership berbayar di luar jangkauan proyek akademik; digantikan upload e-statement manual
- Chat AI interaktif — FR-012 hanya insight satu arah; kompleksitas agentic AI di luar scope MVP
- User-managed categories — kategori read-only untuk MVP, di-seed dari data riset
- Auto-execute allocation — prinsip UX inti produk melarang ini tanpa pengecualian
- Push notification real-time — pending suggestion cukup ditampilkan di halaman Notifikasi (Sitemap #17)

## Context

**Tim & pembagian kerja:**
- Hidayat → `apps/native/`, integrasi, arsitektur (Claude Code)
- Fertika → `backend/` (Claude Code)
- Khayyira → `apps/web/` area Goals (Cline)
- Zarra → `apps/web/` area Home/Dashboard (Cline)

Setiap orang kerja di branch sendiri (`backend/...`, `frontend/...`, `native/...`); PR ke `main` setelah modul selesai.

**Figma workflow:** Figma MCP server terhubung. Saat implementasi UI, selalu minta link frame Figma yang relevan → implementasi persis sesuai desain. Jangan generate UI dari deskripsi teks atau asumsi.

**Mock-first development:** Frontend menggunakan `apps/web/mocks/` selama backend belum siap; integrasi dilakukan setelah kedua sisi selesai.

## Constraints

- **Timeline:** MVP siap 9-10 Juli 2026, Expo 14 Juli 2026 — sangat ketat, ~10 hari dari sekarang (per 30 Juni 2026)
- **Tech stack:** Next.js harus dikonfigurasi sebagai static export untuk Tauri wrapper (belum dikonfigurasi di `next.config.ts`)
- **UX non-negotiable:** Smart Allocation selalu suggest-and-confirm; tidak ada pengecualian
- **API contract:** Setiap perubahan shape endpoint di `API_CONTRACT.md` harus dikomunikasikan ke 4 anggota tim sebelum diimplementasikan
- **Source labeling:** Frontend tidak pernah mengirim field `source` — selalu baca `source_label` dari response backend
- **SAW weights:** Default weights dari survey n=62 adalah baku; user hanya bisa override lewat FR-014 di goal-settings
- **Tauri target (revised 2026-07-02):** Web app (Next.js) adalah MVP utama; Tauri dipakai untuk compile desktop app saja. Tauri mobile/Android APK di-skip dari scope MVP — lihat Key Decisions.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SAW untuk goal ranking | Divalidasi survey n=62; bobot mencerminkan prioritas aktual mahasiswa | — Pending |
| Source labeling server-side | Mencegah drift semantik kategori di sisi frontend | ✓ Good |
| Suggest-and-confirm allocation | Prinsip UX inti — user mempertahankan kendali keuangan | ✓ Good |
| Tanpa API bank/e-wallet resmi | Kendala biaya & partnership untuk proyek akademik | ✓ Good |
| Static export untuk Tauri | Desktop & Android target butuh output statis dari Next.js | ✓ Good |
| Skip Tauri mobile/Android, fokus web + Tauri desktop (2026-07-02) | Sisa waktu ~1 minggu ke expo; native Android build gagal (blank-screen, `libmacost_lib.so` never loads) dan berat untuk hardware dev; web app + Tauri desktop compile cukup untuk MVP & demo | ✓ Good |
| Dashboard KPI order locked | Urutan dari riset — bukan asumsi; tidak boleh diubah tanpa justifikasi penelitian baru | ✓ Good |
| AI insight satu arah | Chat interaktif di luar scope MVP; insight satu arah cukup untuk menambah nilai | ✓ Good |
| Mock-first frontend dev | Memungkinkan paralel development frontend & backend tanpa blocking | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-30 after initialization*
