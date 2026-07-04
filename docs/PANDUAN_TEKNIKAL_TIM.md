# Panduan Teknikal Tim Zephyra — Macost

> Dokumen ini dibuat untuk Fertika, Khayyira, dan Zarra supaya bisa langsung setup environment dan mulai eksekusi Phase 2 tanpa perlu bertanya balik ke Hidayat soal "phase apa" atau "command apa yang harus dijalankan". Semua instruksi di bawah adalah perintah yang bisa langsung copy-paste. Ditulis: 2026-07-04, direvisi: 2026-07-04 (setelah re-run UAT Phase 1 + fix Supabase/JWT — lihat Section 1).

---

## 1. Ringkasan Status Project Saat Ini

**Phase 1 (Foundation): COMPLETE — 4/4 plan selesai, dan sekarang benar-benar terverifikasi jalan di deployment live (bukan cuma kode jadi, tapi sudah ditest end-to-end).**
Semua requirement `AUTH-01..04` dan `WALL-01..04` sudah ditandai **Complete** di `.planning/REQUIREMENTS.md`. Auth (register/login/logout) dan Wallet CRUD sudah jadi **dan sudah lolos re-run UAT terhadap `https://macost-production.up.railway.app` + `https://macost.vercel.app` pada 2026-07-04** — lihat paragraf di bawah.

**PENTING — JWT verification method berubah, catat kalau kalian pernah baca dokumentasi lama:** Backend **tidak lagi** pakai HS256 + shared secret manual (`SUPABASE_JWT_SECRET`) untuk verifikasi token. Project Supabase live-nya pakai sistem **JWT Signing Keys** yang lebih baru (asimetrik, saat ini ES256), dan Supabase **tidak pernah expose secret HS256 yang bisa di-copy** untuk sistem itu — jadi verifikasi sekarang lewat endpoint publik **JWKS** Supabase (`PyJWKClient`, di `backend/dependencies/auth.py`), bukan secret manual. Kalau kalian lihat referensi lama ke "HS256" atau `SUPABASE_JWT_SECRET` di dokumen lain, itu sudah usang — abaikan.

**Dua bug ditemukan dan diperbaiki hari ini (2026-07-04), sebelum kalian mulai Phase 2:**
1. **Supabase project belum pernah dibuat** — register/login di live deployment sempat 500 karena tidak ada database Supabase sungguhan di baliknya. Sudah diperbaiki: Hidayat bikin project Supabase (`zscrbzdpoklxenfmsanh`), jalankan migration `backend/migrations/001_create_dompet.sql` (bikin tabel `dompet` + RLS policy), dan set credentials di Railway.
2. **Algoritma JWT tidak cocok** — sesaat setelah Supabase live, `GET /api/wallets` dengan token asli tetap 401 karena kode backend expect HS256 sementara Supabase issue token ES256. Diperbaiki dengan rewrite `backend/dependencies/auth.py` ke verifikasi berbasis JWKS (commit `ebadf7c`, sudah di-merge ke `main`).

Detail lengkap kedua fix ini: `.planning/quick/260704-bud-re-run-uat-phase-1-terhadap-stack-live-d/` dan `.planning/quick/260704-d4c-fix-jwt-verification-to-use-supabase-jwk/`.

**Phase 01.1 (Local dev & deployment infra): COMPLETE — 3/3 plan selesai.**
Docker Compose lokal, `.env.example` untuk backend & frontend, dan deployment Vercel+Railway+UptimeRobot sudah live dan terverifikasi.

**Gap dari verifikasi Phase 01.1 — sudah diperbaiki:**
`.planning/phases/01.1-.../01.1-VERIFICATION.md` (status `gaps_found`, di-commit di `0a918d3`) menemukan dua dokumen yang masih basi setelah pivot deploy Render → Railway:
- `.claude/CLAUDE.md` masih tertulis "Railway URL — pending first deploy" di dua tempat, padahal deployment sudah live.
- `API_CONTRACT.md` masih menunjuk domain Render lama (`macost-api.onrender.com`) yang sudah mati.

Kedua gap ini **sudah diperbaiki oleh commit `03d185c`** ("docs: fix stale Railway URL references from Phase 01.1 verification") — satu commit *sebelum* `0a918d3` yang men-commit laporan verifikasi itu sendiri. Jadi urutan git-nya: `03d185c` (fix) → `0a918d3` (laporan verifikasi yang mendokumentasikan gap yang saat itu sudah selesai diperbaiki). Saat ini `.claude/CLAUDE.md` dan `API_CONTRACT.md` sama-sama sudah benar menunjuk `https://macost-production.up.railway.app`.

**Bukti live deployment (konkret, per hari ini):**
- Frontend (Vercel): `https://macost.vercel.app` — HTTP 200
- Backend (Railway): `https://macost-production.up.railway.app` — `/health` mengembalikan `{"status":"ok"}`
- UptimeRobot: memantau `/health` setiap 5 menit, mendukung GET dan HEAD (bug 405 pada HEAD-based check sudah diperbaiki di commit `1712639`), status dashboard "Up"
- Auto-deploy: push ke `main` otomatis men-deploy ulang Vercel (frontend) dan Railway (backend) — tidak ada staging, tidak ada approval manual

**Status Tauri — desktop vs Android (poin yang sering bikin bingung, disimak baik-baik):**
- **Tauri desktop** (`tauri build`, Windows/WebView2): sempat blank window, ditemukan dan diperbaiki lewat quick task `260702-qs7` (config `app.windows` yang hilang di `tauri.conf.json`, commit `625da25`). Hidayat sudah **verifikasi visual** window desktop render UI asli, bukan blank. Ini **sudah tervalidasi**.
- **Tauri Android**: build & install APK berjalan **tanpa crash**, tapi WebView **tidak pernah render** — `libmacost_lib.so` tidak pernah ter-load ke proses (dikonfirmasi via `/proc/pid/maps`). Masalah ini **belum terselesaikan** dan **sudah di-descope dari MVP** sejak 2026-07-02 ke backlog **Phase 999.1** (lihat `.planning/PROJECT.md` Key Decisions dan `.planning/ROADMAP.md` Phase 999.1).
- **PWA fallback juga resmi post-MVP (keputusan final 2026-07-04).** Sebelumnya PWA tertulis sebagai rencana cadangan aktif kalau Tauri gagal — sekarang keputusan sudah final: MVP = Web + Tauri Desktop saja, PWA tidak lagi jadi cadangan yang dikerjakan sebelum MVP. Tidak ada build PWA yang pernah dibuat atau ditest.
- **MVP yang benar-benar dipakai untuk demo**: web app (`apps/web`, target utama, live di Vercel) + Tauri **desktop** build saja. Android dan PWA dua-duanya **post-MVP** — jangan kerjakan salah satunya kecuali ada instruksi eksplisit baru.

**UAT Phase 1 — SUDAH di-re-run terhadap stack live (2026-07-04), hasil: 6/8 pass.**
`.planning/phases/01-foundation/01-UAT.md` sebelumnya berhenti di 1/8 pass, 7/8 blocked (dicatat 2026-07-02, sebelum Phase 01.1 selesai). Sekarang sudah di-re-run penuh terhadap `https://macost.vercel.app` + `https://macost-production.up.railway.app`, hasil akhir:

- ✅ **Pass (6/8)**: desktop app launch, register, logout+401 (termasuk invalid-token check), create/rename/delete wallet
- 🟡 **Partial (1/8)**: login — API-nya sudah confirmed jalan (200, token valid), tinggal 1x manual test buka-tutup app desktop buat konfirmasi session persist across restart
- ⏸️ **Blocked, non-blocking (1/8)**: toggle `USE_MOCK` — ini butuh rebuild terpisah (env var di-inline saat build time), bukan sesuatu yang bisa dites di satu live deployment snapshot; bukan blocker untuk Phase 2

**Kesimpulan: fondasi Auth + Wallet aman dipakai buat mulai Phase 2.** Detail lengkap tiap item ada di `.planning/phases/01-foundation/01-UAT.md`.

**Gap dokumentasi minor (belum diperbaiki, non-blocking):**
Gemini Flash (`gemini-2.5-flash`) sudah terdokumentasi dengan benar di kedua file CLAUDE.md (root `CLAUDE.md` dan `.claude/CLAUDE.md`) di bagian "AI Vision & LLM". Tapi **FR-018 (Quick Access Panel) dan FR-019 (AI Agent Chatbot) belum disebut di kedua file CLAUDE.md itu** — per commit `a96a5ab`, hanya `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, dan `context/Macost_PRD.md` yang di-update. Ini gap dokumentasi kecil, bukan blocker — jangan anggap sudah selesai.

**Kesimpulan Section 1:** Fondasi ini (auth, wallet, Docker/env lokal, auto-deploy Vercel+Railway) adalah yang di atasnya Phase 2 dibangun langsung.

---

## 2. Pembagian Kerja per Orang (Phase 2: Core Product Loop)

Dikutip persis dari `.planning/ROADMAP.md` Phase 2 — **jangan ada nama task/phase yang tidak tertulis di sana**.

**Goal Phase 2**: User bisa input transaksi side income, dapat saran alokasi SAW-ranked dalam ≤2 detik, konfirmasi atau skip, dan progress goal ter-update — loop nilai utama produk berjalan end-to-end.

**Requirements**: `TRAN-01, TRAN-02, TRAN-03, TRAN-04, TRAN-05, DASH-01, DASH-02, GOAL-01, GOAL-02, GOAL-03, GOAL-04, GOAL-05, SAW-01, SAW-02, SAW-03, ALLOC-01, ALLOC-02, ALLOC-03, ALLOC-04, ALLOC-05`

**Team ownership (parallel tracks) — verbatim dari ROADMAP.md:**

- **Fertika** (`backend/`): Transaction CRUD dengan auto `source_label` dari `flag_pemasukan`; SAW engine dengan edge case guard (0 goal, 1 goal, nilai kriteria identik); `allocation_service` yang menghitung saran 29-40%; endpoint agregasi dashboard (5 KPI + filter periode); endpoint GET pending allocations.
- **Khayyira** (`apps/web/` area Goals): Halaman goal list, goal detail, goal create/edit/delete per Figma; modal konfirmasi alokasi (Sitemap #16); halaman pending allocations (Sitemap #17); toggle strategi SAW.
- **Zarra** (`apps/web/` area Home/Dashboard): Halaman dashboard dengan 5 KPI dan filter periode per Figma; form input transaksi (maksimum 3 field wajib); riwayat transaksi dengan filter, edit, delete; update saldo wallet setelah transaksi.
- **Hidayat** (integrasi): Sesi integrasi `USE_MOCK=false` Hari 6-8; end-to-end test memverifikasi modal alokasi muncul ≤2 detik setelah POST side income terhadap backend Railway live; smoke test Tauri **desktop** untuk full flow alokasi (bukan test Android APK — Android backlog-only).

**Key risks (dari riset, dikutip dari ROADMAP.md):**
- SAW division-by-zero pada 0 atau 1 goal mengembalikan HTTP 500 untuk user baru — guard edge case `SAW-02` wajib sebelum integrasi backend.
- Drift kontrak API antara interface TypeScript mock dan bentuk response backend asli — validasi terhadap response API sungguhan saat sesi integrasi, bukan di akhir.
- Modal alokasi harus muncul ≤2 detik di backend asli (bukan cuma mock) — test di deployment live (Railway), bukan hanya localhost.
- Cold start harus dijaga tetap warm — UptimeRobot keep-alive (sudah aktif di Railway) harus diverifikasi tetap aktif sebelum sesi integrasi Phase 2 dimulai.

**UI hint**: yes (Phase 2 butuh desain Figma — lihat Section 4 soal `/gsd-ui-phase`).

---

## 3. Setup Awal Tiap Orang

Jalankan urutan ini persis, di terminal masing-masing:

```bash
git clone https://github.com/hidnira-lab/macost.git
cd macost
git checkout main && git pull
```

**Prasyarat versi** (per `.claude/CLAUDE.md` Platform Requirements): Node.js >= 20, Python 3.12.

**Install GSD Core** (satu kali per orang, dari root repo):

- **Fertika** (pakai Claude Code):
  ```bash
  npx -y @opengsd/gsd-core@latest --claude --local
  ```
  Ini cocok dengan instalasi `.claude/gsd-core/` yang sudah ada di repo ini.

- **Khayyira dan Zarra** (pakai Cline):
  ```bash
  npx -y @opengsd/gsd-core@latest --cline --local
  ```
  Ini mendaftarkan command `/gsd-*` yang sama untuk Cline, tanpa mengganggu instalasi Claude Code yang sudah ada — kedua runtime bisa hidup berdampingan dalam satu checkout repo yang sama.

**Setup environment variable:**

```bash
cp backend/.env.example backend/.env
```
Isi value asli di `backend/.env` (minta ke Hidayat — project Supabase-nya **sudah live** per 2026-07-04, bukan lagi placeholder): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `AI_VISION_API_KEY`. **Jangan pernah commit file ini** — sudah di-gitignore.

> **Catatan `SUPABASE_JWT_SECRET`:** kalau masih ada di `backend/.env.example` sebagai baris terpisah, itu **sudah tidak dipakai kode** sejak commit `ebadf7c` (2026-07-04) — verifikasi JWT sekarang lewat JWKS endpoint Supabase, bukan secret manual. Boleh diisi apa saja atau dikosongkan, tidak berpengaruh.

```bash
cp apps/web/.env.example apps/web/.env.local
```
Isi `NEXT_PUBLIC_API_BASE_URL` (pakai `http://localhost:8000` untuk dev lokal, atau `https://macost-production.up.railway.app` kalau mau test langsung ke prod) dan `NEXT_PUBLIC_USE_MOCK`.

**Jalankan dev lokal:**

```bash
docker compose up
```
Dari root repo. Ini menjalankan backend di `:8000` dan frontend di `:3000` — tidak ada container Postgres lokal, Supabase tetap hosted-only (keputusan D-02).

---

## 4. Langkah Eksekusi Step-by-Step per Orang

**Phase 2 belum di-plan** — `.planning/ROADMAP.md` masih menulis `**Plans**: TBD`. Jadi urutan kerjanya dua tahap:

**Tahap A — SATU orang saja, sekali, di awal** (rekomendasi: Hidayat atau Fertika, siapa yang available duluan, keduanya pakai Claude Code), jalankan berurutan:

```
/gsd-discuss-phase 2
/gsd-ui-phase 2
/gsd-plan-phase 2
```

(`/gsd-ui-phase 2` wajib dijalankan karena ROADMAP.md menandai Phase 2 **UI hint: yes**.) Urutan ini menghasilkan file `PLAN.md` untuk Phase 2 (satu atau lebih per track/wave paralel). **Commit dan push ke `main` dulu** sebelum orang lain mulai.

**Tahap B — Fertika, Khayyira, Zarra masing-masing**, setelah Tahap A selesai dan sudah ada di `main`:

1. `git pull origin main`
2. Checkout branch sendiri sesuai konvensi project (lihat Section 5), contoh:
   - Fertika: `git checkout -b backend/phase-2-core-loop`
   - Khayyira: `git checkout -b frontend/phase-2-goals`
   - Zarra: `git checkout -b frontend/phase-2-dashboard`
3. Kerjakan **hanya** file `PLAN.md` yang menyebut track/area kalian — dengan salah satu dari dua cara ini:
   - Jalankan `/gsd-execute-phase 2` sendiri terhadap plan track kalian, ATAU
   - Kalau tool kalian justru mencoba menjalankan semua plan dalam satu phase sekaligus, minta assistant kalian langsung mengeksekusi file `{phase}-0N-PLAN.md` spesifik yang menyebut nama/area kalian — GSD sudah menjamin tidak ada overlap file antar plan dalam satu wave yang sama.
4. Setelah implementasi selesai, jalankan `/gsd-verify-work` untuk bagian kalian sendiri.
5. Jalankan `/gsd-ship` untuk membuka PR ke `main`. **Jangan merge PR sendiri tanpa minimal satu self-review pass**, dan umumkan di channel tim (lihat Section 6).

**Aturan enforcement penting**: `/gsd-execute-phase` adalah entry point wajib per aturan `GSD Workflow Enforcement` di `.claude/CLAUDE.md` repo ini — **tidak boleh** langsung `Edit`/`Write` file di luar command GSD.

---

## 5. Branching & Worktree — Cara Kerja GSD Core

Berdasarkan `.planning/config.json`:

- **`git.branching_strategy: "none"`** — artinya command GSD **tidak** otomatis membuatkan branch phase untuk kalian. Setiap orang **harus manual** `git checkout -b <branch-sendiri>` (lihat Section 4 Tahap B).
- **`workflow.use_worktrees`** tidak di-override di config (default: `true`) — artinya setiap kali seseorang menjalankan `/gsd-execute-phase` atau `/gsd-quick`, GSD **otomatis** membuat git worktree terisolasi dan berumur pendek per executor subagent, supaya eksekusi plan paralel tidak saling menimpa perubahan yang belum di-commit — lalu GSD otomatis merge branch worktree itu kembali dan membersihkannya setelah selesai. **Tidak perlu command `git worktree` manual** dari siapapun.

**Branch yang benar-benar ada saat ini**: `main`, dan `phase-1-foundation-and-environment` (branch kerja Hidayat untuk Phase 1 + 01.1 + fix Supabase/JWT hari ini — sudah di-push langsung ke `main`, jadi keduanya sekarang identik; bukan template yang harus di-copy, dan bukan branch permanen per-fitur). Fertika, Khayyira, dan Zarra: **branch baru dari `main`**, bukan dari `phase-1-foundation-and-environment`.

---

## 6. Aturan Kerja Bersama

- Selalu `git pull origin main` sebelum mulai sesi kerja apapun.
- Jangan pernah menjalankan `/gsd-new-project` lagi — project sudah diinisialisasi.
- Jangan hand-edit `.planning/STATE.md` atau `.planning/ROADMAP.md` secara langsung — biarkan command GSD yang mengelolanya, supaya tidak terjadi merge conflict antar 4 branch orang berbeda.
- Umumkan di channel tim segera setelah menjalankan `/gsd-ship` (sertakan link PR) supaya yang lain tahu harus pull dulu sebelum lanjut kerja.
- Perubahan apapun ke bentuk request/response `API_CONTRACT.md` **wajib didiskusikan ke seluruh 4 orang dulu** — aturan lama, diulang di sini karena ini titik risiko drift paling tinggi.
- Kalau `.env`/`.env.local` lokal kalian berbeda dari value asli project Supabase bersama, jangan commit — tanya Hidayat mana yang canonical.

---

## 7. Constraint Teknis Wajib (dari CLAUDE.md)

Dikutip langsung, tidak diperlunak:

- **Smart Allocation selalu suggest-and-confirm, tidak pernah auto-execute**, tanpa pengecualian.
- **AI Financial Assistant (FR-012)** adalah insight satu arah, **BUKAN** chat interaktif.
- **Source pemasukan** (Allowance/Side Income) ditentukan **server-side** dari `flag_pemasukan` kategori — frontend hanya mengirim `kategori_id`, **tidak pernah** mengirim field `source` secara manual.
- **SAW weights** baku dari survey n=62 (`personal_importance` 22.5%, `progress_gap` 21.9%, `saving_capacity` 21.5%, `urgency` 17.8%, `target_amount` 16.2%) — jumlah bobot di `PUT /api/goal-settings` harus tepat 1.0.
- **AI vision** pakai Gemini Flash (`gemini-2.5-flash`, free tier), dual-path — ekstraksi dulu, kalau gagal atau field kosong langsung fallback ke input manual, **JANGAN retry otomatis**.
- **Timeout fallback**: 10 detik untuk AI vision (SCAN-03), 15 detik untuk AI insight (AIINS-03).
- **Setiap perubahan bentuk endpoint** di `API_CONTRACT.md` wajib dikomunikasikan ke seluruh tim dulu.

---

## 8. Garis Waktu Realistis

Hari ini: **2026-07-04**.

- **H-5** menuju demo pertama (9 Juli 2026)
- **H-6** menuju demo kedua (10 Juli 2026)
- **H-10** menuju Expo (14 Juli 2026)

Catatan critical-path dari `.planning/ROADMAP.md`, diulang persis — **jangan diperhalus atau dihilangkan**: **kalau waktu benar-benar kritis, Phase 2 saja (loop lengkap: side income → SAW ranking → saran alokasi → konfirmasi → progress goal) adalah demo minimum yang sudah bisa ditunjukkan.** Phase 3 (scan struk, e-statement, AI insight, kustomisasi bobot SAW, Quick Access Panel) dan Phase 4 (pixel art, offline sync) adalah diferensiator untuk hari Expo, ditambahkan setelahnya, dalam urutan itu, hanya kalau waktu memungkinkan.

---

*Dokumen ini dibuat oleh quick task `260704-axu`, direvisi oleh quick task `260704-dbh` — 2026-07-04, setelah UAT Phase 1 re-run (`260704-bud`) dan fix JWT/Supabase (`260704-d4c`).*
