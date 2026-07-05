# macost

A pocket MIS helping students turn aimless money into goal-driven savings through smart allocation and AI-powered insights.

## Tentang Project

Macost adalah Pocket Management Information System (MIS) yang membantu mahasiswa Indonesia dengan pendapatan campuran — fixed allowance dari orang tua dan side income dari freelance/part-time — mengelola keuangan secara lebih terarah. Aplikasi ini membantu mencatat transaksi, mengelola goal tabungan lewat visual pixel art, dan mendapatkan saran alokasi cerdas (berbasis algoritma SAW) setiap kali side income masuk. Project ini merupakan tugas semester 4 mata kuliah PSI, dikerjakan oleh Tim Zephyra UII, empat orang secara paralel.

## Core Value

Saat side income masuk, sistem langsung menyarankan alokasi ke goal prioritas tertinggi — lewat proses suggest-and-confirm yang tidak pernah auto-execute, sehingga user tetap memegang kendali penuh atas keuangannya.

## Tech Stack

- **Frontend:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4) di `apps/web/` — dikonfigurasi untuk static export guna mendukung Tauri wrapper
- **Backend:** FastAPI (Python 3.12) di `backend/`, dijalankan lewat Uvicorn
- **Database & Auth:** Supabase (managed PostgreSQL + Auth, JWT diverifikasi lewat Supabase JWKS)
- **Desktop wrapper:** Tauri 2.0 di `apps/native/` — target MVP hanya Desktop; Android (Tauri Mobile) adalah post-MVP
- **Local dev orchestration:** Docker Compose (`docker-compose.yml`)

## Struktur Folder

```
macost/
├── apps/
│   ├── web/                        # Next.js frontend
│   └── native/                     # Tauri desktop wrapper
├── backend/                        # FastAPI backend (routers, services, models, migrations)
├── docs/                           # Panduan teknis tim (docs/PANDUAN_TEKNIKAL_TIM.md)
├── context/                        # Dokumen referensi PRD dan sitemap
├── .planning/                      # Artefak planning GSD (PROJECT.md, ROADMAP.md, phase plans)
├── docker-compose.yml               # Orkestrasi dev lokal
├── API_CONTRACT.md                  # Kontrak request/response API (sumber kebenaran)
└── CLAUDE.md                        # Instruksi project + AI agent
```

## Setup Development Lokal

1. **Prerequisites:** Node.js >= 20, Python 3.12, Docker + Docker Compose.
2. **Clone:**
   ```bash
   git clone https://github.com/hidnira-lab/macost.git
   cd macost
   ```
3. **Salin template env** lalu isi dengan nilai asli (URL/keys Supabase, `AI_VISION_API_KEY` untuk backend; `NEXT_PUBLIC_API_BASE_URL` dan `NEXT_PUBLIC_USE_MOCK` untuk frontend). Kedua file ini sudah masuk `.gitignore` — jangan pernah di-commit.
   ```bash
   cp backend/.env.example backend/.env
   cp apps/web/.env.example apps/web/.env.local
   ```
4. **Jalankan dari root repo:**
   ```bash
   docker compose up
   ```
   Perintah ini menjalankan dua service: `backend` di `http://localhost:8000` (Uvicorn dengan `--reload`, mounted dari `./backend`) dan `frontend` di `http://localhost:3000` (`npm run dev`, mounted dari `./apps/web`).
5. Tidak ada container Postgres lokal — Supabase tetap hosted-only, dev berbicara langsung ke project Supabase yang sudah hosted.

## Dokumen Acuan

- [`API_CONTRACT.md`](./API_CONTRACT.md) — kontrak endpoint kanonik, wajib dirujuk sebelum mengubah bentuk request/response apa pun
- [`CLAUDE.md`](./CLAUDE.md) — konvensi project dan instruksi AI agent
- [`docs/PANDUAN_TEKNIKAL_TIM.md`](./docs/PANDUAN_TEKNIKAL_TIM.md) — panduan onboarding teknis dan alur kerja tim
- [`.planning/PROJECT.md`](./.planning/PROJECT.md) — konteks project, requirements, dan keputusan
- [`.planning/ROADMAP.md`](./.planning/ROADMAP.md) — roadmap phase
- [`context/Macost_PRD.md`](./context/Macost_PRD.md) — PRD lengkap

## Deployment

- Frontend: Vercel — `https://macost.vercel.app`
- Backend: Railway — `https://macost-production.up.railway.app`
- Keduanya auto-deploy setiap push ke `main` (tanpa staging environment, tanpa manual approval step)

## Tim

| Orang | Tool | Area |
|---|---|---|
| Hidayat | Claude Code | `apps/native`, integrasi, arsitektur |
| Fertika | Claude Code | `backend/` |
| Khayyira | Cline | `apps/web` — area Goals |
| Zarra | Cline | `apps/web` — area Home/Dashboard |

Setiap orang kerja di branch sendiri dan membuka PR ke `main` setelah modul selesai.
