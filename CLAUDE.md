# CLAUDE.md

Konteks project ini dibaca otomatis oleh Claude Code di setiap sesi. Selalu rujuk file ini sebelum membuat asumsi soal struktur atau kontrak data.

## Tentang Project

**Macost** — Pocket Management Information System (MIS) yang membantu mahasiswa mengelola fixed allowance dan side income secara lebih terarah, lewat goal-based saving dan smart allocation. Project semester 4 PSI, Tim Zephyra, UII.

## Tech Stack

- Frontend: Next.js (App Router, TypeScript, Tailwind) — static export untuk Tauri
- Backend: FastAPI (Python)
- Database & Auth: Supabase (PostgreSQL)
- Mobile wrapper: Tauri 2.0 (target Android), fallback PWA
- Local dev: Docker Compose

## Struktur Folder

```
macost/
├── apps/
│   ├── web/          # Next.js frontend
│   └── native/        # Tauri wrapper
├── backend/            # FastAPI
├── docker-compose.yml  # local dev only
├── API_CONTRACT.md     # SELALU rujuk ini untuk bentuk request/response API
└── .github/workflows/  # CI/CD
```

## Aturan Penting

1. **SELALU patuhi `API_CONTRACT.md`** saat membuat atau mengubah endpoint backend, maupun saat memanggil API dari frontend. Jangan mengubah bentuk request/response tanpa mendiskusikan ke seluruh tim dulu.
2. **Pelabelan source (Allowance/Side Income) ditentukan server-side** dari kategori yang dipilih (field `flag_pemasukan`), bukan dikirim manual oleh frontend.
3. **Algoritma SAW** untuk goal ranking ada di `backend/services/saw_engine.py`. 5 kriteria: personal_importance (22.5%), progress_gap (21.9%), saving_capacity (21.5%), urgency (17.8%), target_amount (16.2%) — bobot default ini hasil survey n=62, lihat `Macost_Riset_Tambahan_Variabel.md`.
4. **Smart Allocation selalu suggest & confirm**, tidak pernah auto-execute tanpa konfirmasi user.

## Pembagian Kerja (Parallel Development)

| Orang | Tool | Area |
|---|---|---|
| Hidayat | Claude Code | `apps/native`, integrasi, arsitektur |
| Fertika | Claude Code | `backend/` |
| Khayyira | Cline | `apps/web` — area Goals |
| Zarra | Cline | `apps/web` — area Home/Dashboard |

Setiap orang kerja di branch sendiri (`backend/...`, `frontend/...`, `native/...`), PR ke `main` setelah modul selesai — bukan langsung commit ke `main`.

## Dokumen Acuan Lain

- `API_CONTRACT.md` — kontrak endpoint
- Project Brief & PRD (di luar repo ini / link Notion — sertakan jika sudah disinkronkan)
- `Macost_Sitemap_Pages.md` — daftar page & fitur per halaman
