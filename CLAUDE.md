# CLAUDE.md

Konteks project ini dibaca otomatis oleh Claude Code di setiap sesi. Selalu rujuk file ini sebelum membuat asumsi soal struktur atau kontrak data.

## Tentang Project

**Macost** — Pocket Management Information System (MIS) yang membantu mahasiswa mengelola fixed allowance dan side income secara lebih terarah, lewat goal-based saving dan smart allocation. Project semester 4 PSI, Tim Zephyra, UII.

## Tech Stack

- Frontend: Next.js (App Router, TypeScript, Tailwind) — static export untuk Tauri
- Backend: FastAPI (Python)
- Database & Auth: Supabase (PostgreSQL)
- Desktop wrapper: Tauri 2.0 (target: desktop build)
- Local dev: Docker Compose

**MVP target (final, 2026-07-04): Web (Vercel) + Tauri Desktop saja.** Android (Tauri Mobile) dan PWA fallback: **post-MVP**, dikerjakan setelah MVP solid — lihat `.planning/ROADMAP.md` Phase 999.1 dan `.planning/PROJECT.md` Constraints/Out of Scope.

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

## Sumber Desain UI

Desain UI Macost dibuat di Stitch, lalu di-export & di-refine di Figma — **Figma adalah sumber kebenaran visual**, bukan deskripsi teks atau asumsi. Figma MCP server sudah terhubung ke Claude Code.

**Cara pakai saat implementasi UI:**
1. Buka frame/page yang relevan di Figma, klik kanan → "Copy link to selection"
2. Sertakan link itu di prompt, contoh: "Implementasikan desain di link Figma ini sebagai komponen Next.js: [link]"
3. Generate per page/grup kecil sesuai prioritas (lihat `Macost_Sitemap_Pages.md` — P1 dulu, baru P2-P4), JANGAN minta generate banyak page sekaligus dalam satu prompt — hasilnya cenderung tidak presisi
4. Untuk flow multi-screen yang saling terhubung (misal Onboarding 4 slide), konversi tiap frame satu-satu dulu, baru gabungkan lewat prompt terpisah

**Batasan yang perlu diketahui:** Claude Code lebih kuat generate komponen baru dari nol dibanding melakukan update presisi ke komponen yang sudah ada — kalau desain berubah, kemungkinan perlu regenerasi ulang, bukan edit kecil.

## AI Vision & LLM

**Scan Struk & Upload E-Statement (F1 / FR-002, FR-003):**
- Provider: Google AI Studio (Gemini)
- Model: `gemini-2.5-flash` (free tier — data yang diproses adalah data dummy untuk keperluan expo, bukan data user real)
- API key: `AI_VISION_API_KEY` di `backend/.env`
- Arsitektur: dual-path — Gemini Flash ekstrak dulu, kalau gagal atau field kosong langsung fallback ke input manual (FR-017). JANGAN retry otomatis.
- Input: multimodal (gambar untuk scan struk, PDF untuk e-statement)
- Output yang diharapkan: JSON dengan field `extracted` (boolean), `merchant`, `nominal`, `tanggal_transaksi`, `items` (array, opsional), `suggested_category_id`

**AI Financial Assistant (F6 / FR-012):**
- Provider: belum ditentukan final — kemungkinan pakai model yang sama (Gemini Flash) kecuali ada keputusan lain
- Scope: insight satu arah (BUKAN chat interaktif), berbahasa Indonesia natural
- Fallback: jika API tidak merespons dalam 15 detik, tampilkan `fallback_message` dari endpoint `/api/ai-insight` (FR-017)

## Dokumen Acuan Lain

- `API_CONTRACT.md` — kontrak endpoint
- Project Brief & PRD (di luar repo ini / link Notion — sertakan jika sudah disinkronkan)
- `Macost_Sitemap_Pages.md` — daftar page & fitur per halaman