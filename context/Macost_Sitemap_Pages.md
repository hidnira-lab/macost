# Macost — Sitemap & Daftar Page (Acuan Design UI/UX)

**Tim Zephyra · Pendukung fase UI/UX Design System**
**Tanggal:** 3 Juli 2026
**Acuan:** PRD v1.2 (FR-001 s.d. FR-019) & User Flow

> Dokumen ini memetakan seluruh page yang perlu didesain, isi/komponen tiap page, dan FR yang dicakup — agar tidak ada requirement yang terlewat saat masuk ke Figma.

---

## Ringkasan Struktur Navigasi

```
Macost
│
├── AUTH & ONBOARDING (sebelum login)
│   ├── 1. Splash / Landing
│   ├── 2. Register
│   ├── 3. Login
│   ├── 4. Onboarding Tour
│   └── 5. Create First Goal (opsional)
│
└── MAIN APP (setelah login) ── [Bottom Navigation]
    │
    ├── 🏠 Home (Input Transaksi)      → entry point utama
    │   ├── 22. Quick Access Panel (Should Have) ← NEW
    │   ├── 7. Pilih Metode Input (modal)
    │   ├── 8. Form Input Manual
    │   ├── 9. Scan Struk
    │   ├── 10. Upload E-Statement
    │   └── 16. Modal Saran Alokasi (overlay)
    │
    ├── 📊 Dashboard
    │   └── 11. Dashboard Keuangan
    │
    ├── 🎯 Goals
    │   ├── 12. Daftar Goal
    │   ├── 13. Detail Goal
    │   ├── 14. Buat / Edit Goal
    │   └── 15. Pengaturan Goal Prioritization
    │
    ├── 🤖 AI Assistant
    │   ├── 18. AI Financial Assistant (insight satu arah — MVP)
    │   └── 23. AI Agent Chatbot (Could Have / post-MVP) ← NEW
    │
    └── 👤 Profil
        ├── 19. Riwayat Transaksi
        ├── 17. Notifikasi / Pending Suggestion
        ├── 20. Profil & Pengaturan
        └── 21. Kelola Dompet
```

> **Catatan navigasi:** 5 item utama di bottom navigation (Home, Dashboard, Goals, AI Assistant, Profil). Page lain diakses sebagai sub-page, modal, atau overlay dari kelimanya. Page #22 (Quick Access Panel) adalah komponen di dalam Home, bukan full page terpisah. Page #23 (AI Agent Chatbot) muncul di tab AI Assistant hanya setelah post-MVP dikerjakan.

---

## A. Auth & Onboarding

### 1. Splash / Landing
- Logo Macost + tagline singkat
- Transisi pendek saat app dibuka
- Auto-redirect: ke Home jika sudah login, ke Login/Register jika belum

### 2. Register
- Form: nama, email, password
- Validasi inline (format email, kekuatan password)
- Link ke Login
- *Covers: pembuatan akun*

### 3. Login
- Form: email, password
- Handling 5× gagal → lock 30 menit (NFR-05)
- Link ke Register & forgot password
- *Covers: NFR-05*

### 4. Onboarding Tour
- 3–4 slide swipeable: input mudah, goal, AI insight, visual progress
- Tombol Skip & Next
- *Covers: Workflow 6.5*

### 5. Create First Goal (opsional saat onboarding)
- Form goal + template quick-start (Dana Darurat, Liburan, Kesehatan, Laptop/Gadget)
- Tombol "Lewati untuk sekarang"
- *Covers: FR-007*

---

## B. Core — Transaksi (TPS)

### 6. Home / Input Transaksi — ENTRY POINT UTAMA
- Landing utama tiap buka app
- **Quick Access Panel** (Should Have, FR-018) — panel shortcut visual di bagian atas home: 4 aksi cepat (tambah transaksi, scan struk, goal aktif teratas + %, ringkasan saldo) — lihat detail di #22
- Tombol besar tambah transaksi (+)
- Shortcut Scan Struk yang menonjol (sesuai UX requirement persona)
- Ringkasan saldo singkat
- Akses cepat ke goal aktif + visual progress
- *Covers: FR-001, FR-018 (entry point)*

### 7. Pilih Metode Input *(modal / bottom sheet)*
- 3 opsi: Manual · Scan Struk · Upload E-Statement
- *Covers: FR-001, FR-002, FR-003*

### 8. Form Input Manual
- Field: nominal (wajib), jenis (pemasukan/pengeluaran), kategori, tanggal (default hari ini), catatan opsional
- Jika Pemasukan → muncul pilihan sumber: Allowance / Side Income
- Validasi: nominal hanya angka, tombol Simpan nonaktif sampai field wajib terisi
- Auto-save draft jika app ditutup di tengah
- *Covers: FR-001, FR-005*

### 9. Scan Struk — Kamera & Hasil Ekstraksi
- View kamera (akses langsung dari app)
- States: loading parsing, sukses (form pra-isi: merchant, nominal, tanggal, item — bisa diedit), gagal (fallback manual)
- Handling: foto buram (opsi foto ulang), timeout (retry + opsi manual), duplikat
- *Covers: FR-002, FR-004, FR-017*

### 10. Upload E-Statement — Preview & Bulk Import
- Upload file + panduan format yang didukung
- Loading parsing (progress bar untuk file besar)
- Tabel preview transaksi: tanggal, deskripsi, nominal, kategori auto-suggest
- Aksi: edit kategori, hapus baris, edit label sumber, tandai duplikat
- Tombol Impor Semua / Impor yang Dipilih + ringkasan hasil
- Handling: format tidak dikenali, file ter-password
- *Covers: FR-003, FR-004*

---

## C. Dashboard (MIS)

### 11. Dashboard Keuangan
Urutan KPI sesuai hasil survey (n=62) — **bukan asumsi**:
1. **Breakdown kategori pengeluaran** (paling banyak dipilih prioritas #1)
2. **Progress goal aktif** (top 1–2 berdasar ranking SAW)
3. **Tren bulanan** (pemasukan vs pengeluaran)
4. **Alert overspending / sisa anggaran**
5. **Total saldo saat ini**
- Filter periode (bulan ini / bulan lalu / custom)
- *Covers: FR-006, FR-009*

---

## D. Goals (DSS)

### 12. Daftar Goal
- List semua goal dengan ranking SAW
- Progress bar tiap goal (nominal terkumpul vs target)
- Tombol tambah goal
- *Covers: FR-008*

### 13. Detail Goal
- Progress detail + riwayat alokasi (dari entitas Alokasi)
- Visual pixel-art goal tersebut
- Tombol edit / hapus
- *Covers: FR-008, FR-015*

### 14. Buat / Edit Goal
- Form: nama goal, nominal target, deadline, skor keinginan (1–5)
- Template quick-start
- Validasi: nominal > 0, deadline harus di masa depan
- *Covers: FR-007*

### 15. Pengaturan Goal Prioritization
- Toggle strategi: **Quick Win** (default) / **Importance-First**
- Slider adjust bobot 5 kriteria manual (personal importance, progress gap, kemampuan menabung, urgency, nominal)
- *Covers: FR-013, FR-014*

---

## E. Smart Allocation (DSS)

### 16. Modal Saran Alokasi *(overlay, bukan full page)*
- Muncul otomatis saat side income masuk (≤ 2 detik, NFR-02)
- Isi: nominal saran (≈30–40%), goal tujuan (ranking #1)
- Aksi: Konfirmasi / Edit nominal / Pilih goal lain / Lewati
- Jika user belum punya goal → redirect ke prompt buat goal dulu
- *Covers: FR-010, FR-011*
- ⚠️ **Page krusial** — momen inti produk, desain harus terasa "suggest" bukan "memaksa"

### 17. Notifikasi / Pending Suggestion
- Daftar saran alokasi yang sempat di-skip (accessible 24 jam)
- *Covers: edge case Workflow 6.1*

---

## F. AI Assistant

### 18. AI Financial Assistant (Insight)
- Insight satu arah berbahasa natural dari data MIS
- Card-based insight (BUKAN chat interaktif — sesuai scope MVP)
- States: loading, fallback template jika API gagal
- *Covers: FR-012, FR-017*

---

## G. Pendukung

### 19. Riwayat Transaksi
- List semua transaksi
- Filter (tanggal, kategori, sumber) + search
- Edit / hapus per item

### 20. Profil & Pengaturan
- Data akun + edit profil
- Akses ke Kelola Dompet
- Logout

### 21. Kelola Dompet
- CRUD dompet/sumber dana (Cash, Gopay, Bank, dll) + saldo masing-masing
- Tiap transaksi terhubung ke dompet (sesuai ERD entitas Dompet)
- *Covers: entitas Dompet*
- ⚠️ **Catatan:** fitur ini berasal dari ERD namun belum punya FR eksplisit di PRD — sebaiknya tambahkan FR untuk multi-dompet di update PRD berikutnya agar konsisten antar dokumen.

---

## H. Fitur Baru (Masukan Dosen — PRD v1.2)

### 22. Quick Access Panel *(komponen di dalam Home, bukan full page)* 🟡 Should Have
- Panel shortcut visual yang tampil di bagian atas halaman Home setelah user login
- Berisi 4 aksi cepat yang bisa diakses satu tap:
  - **Tambah Transaksi** → buka modal Pilih Metode Input (#7)
  - **Scan Struk** → langsung buka kamera (#9)
  - **Goal Aktif Teratas** → tampilkan nama goal + persentase progress, tap → buka Detail Goal (#13)
  - **Ringkasan Saldo** → tampilkan total saldo saat ini
- Terinspirasi dari pola navigasi cepat Livin by Mandiri
- *Covers: FR-018*
- ⚠️ **Desain krusial:** panel ini harus terasa clean & informatif, bukan penuh sesak. Maksimal 4 shortcut, prioritaskan tap target yang besar (mudah dijangkau ibu jari).

### 23. AI Agent Chatbot 🟢 Could Have / Post-MVP
- Antarmuka percakapan berbasis AI berbahasa Indonesia
- User bisa mengeksekusi aksi keuangan langsung via chat (bukan hanya baca insight):
  - "Catat pengeluaran makan 25rb" → sistem catat transaksi
  - "Scan struk ini" → attach foto, AI ekstrak & simpan
  - "Berapa saldo aku sekarang?" → AI baca data & jawab
  - "Alokasikan 200rb ke goal laptop" → AI proses alokasi
- Dapat diakses sebagai salah satu shortcut di Quick Access Panel (#22)
- *Covers: FR-019*
- ⚠️ **JANGAN dikerjakan sebelum semua Must Have & Should Have selesai.** Berbeda fundamental dari F6 (AI Financial Assistant) yang hanya insight satu arah — AI Agent butuh conversation state, tool-calling ke API internal, dan orkestrasi multi-turn. Ini dikerjakan setelah MVP jadi.

---

## Prioritas Design (saran urutan pengerjaan)

Mengikuti prioritas pembangunan MVP (tulang punggung dulu):

| Prioritas | Page | Alasan |
|---|---|---|
| **P1 — Wajib duluan** | 6, 7, 8, 11 | Entry point + input manual + dashboard = tulang punggung TPS/MIS |
| **P2 — Inti berikutnya** | 12, 13, 14, 16 | Goal & smart allocation = nilai inti produk |
| **P3 — Pelengkap** | 9, 10, 15, 18, 22 | Scan/e-statement, pengaturan SAW, AI insight, Quick Access Panel |
| **P4 — Pendukung** | 1–5, 17, 19, 20, 21 | Auth, onboarding, profil, dompet, riwayat |
| **P5 — Post-MVP** | 23 | AI Agent Chatbot — dikerjakan setelah seluruh MVP selesai |

> Catatan: P1–P2 adalah yang paling sering jadi sorotan saat demo Expo, jadi worth dipoles paling matang. Page #22 (Quick Access Panel) masuk P3 karena dia Should Have — setelah Must Have solid baru dikerjakan. Page #23 (AI Agent) tidak dikerjakan dalam sprint MVP.

---

## Total: 23 page/screen

Terbagi: 5 auth/onboarding · 5 transaksi · 1 dashboard · 4 goals · 2 smart allocation · 2 AI (assistant + agent) · 3 pendukung · 1 quick access panel.

*(Beberapa di antaranya berupa modal/overlay atau komponen, bukan full page: #7, #16, #22 — bisa didesain sebagai komponen, bukan layar penuh. #23 belum dikerjakan sampai post-MVP.)*
