# Requirements: Macost

**Defined:** 2026-06-30
**Core Value:** Saat side income masuk, sistem langsung menyarankan alokasi ke goal prioritas tertinggi (SAW) — dengan suggest-and-confirm yang tidak pernah auto-execute

## v1 Requirements

Requirements untuk MVP (target: demo siap 9-10 Juli, Expo 14 Juli 2026). Dikelompokkan per prioritas build.

---

### Kelompok 1 — Foundation (Tulang Punggung)

#### Authentication

- [x] **AUTH-01**: User dapat mendaftar akun baru dengan nama, email, dan password
- [x] **AUTH-02**: User dapat login dengan email dan password; sesi persisten di Tauri Android (via tauri-plugin-store, bukan localStorage)
- [x] **AUTH-03**: User dapat logout dari aplikasi
- [x] **AUTH-04**: Semua endpoint terproteksi oleh JWT Supabase (HS256 + audience: "authenticated")

#### Wallets

- [x] **WALL-01**: User dapat membuat dompet baru (nama, misal: Gopay, Cash, Bank BCA)
- [x] **WALL-02**: User dapat melihat daftar dompet beserta saldo masing-masing
- [x] **WALL-03**: User dapat mengedit nama dompet
- [x] **WALL-04**: User dapat menghapus dompet

#### Transactions

- [x] **TRAN-01**: User dapat mencatat transaksi manual (nominal, tipe Pemasukan/Pengeluaran, kategori, tanggal, dompet, catatan opsional) — maksimum 3 field wajib untuk mencegah friction (FR-001)
- [x] **TRAN-02**: Sistem secara otomatis melabeli pemasukan sebagai "Allowance" atau "Side Income" berdasarkan flag_pemasukan kategori yang dipilih — tidak pernah dikirim manual oleh frontend (FR-005)
- [x] **TRAN-03**: User dapat melihat riwayat transaksi dengan filter (tanggal, kategori, source, pagination)
- [x] **TRAN-04**: User dapat mengedit transaksi yang sudah tersimpan
- [x] **TRAN-05**: User dapat menghapus transaksi

#### Dashboard

- [x] **DASH-01**: User dapat melihat dashboard dengan 5 KPI dalam urutan yang telah divalidasi riset: (1) breakdown pengeluaran per kategori, (2) progress goal aktif, (3) tren bulanan income vs expense, (4) alert overspending, (5) total saldo (FR-006)
- [x] **DASH-02**: Dashboard mendukung filter periode: bulan ini, bulan lalu, atau custom date range

---

### Kelompok 2 — Inti Produk (Nilai Utama)

#### Goals

- [x] **GOAL-01**: User dapat membuat goal baru (nama, nominal target, deadline, skor keinginan 1-5) (FR-007)
- [x] **GOAL-02**: User dapat melihat daftar goal dengan nominal terkumpul dan progress percentage (dihitung dari SUM Alokasi) (FR-008)
- [x] **GOAL-03**: User dapat melihat detail goal termasuk riwayat alokasi
- [x] **GOAL-04**: User dapat mengedit goal yang sudah ada
- [x] **GOAL-05**: User dapat menghapus goal

#### SAW Engine & Prioritization

- [x] **SAW-01**: Goal diranking otomatis oleh algoritma SAW dengan 5 kriteria berbobot dari riset (n=62): personal_importance 22.5%, progress_gap 21.9%, saving_capacity 21.5%, urgency 17.8%, target_amount 16.2% (FR-009)
- [x] **SAW-02**: SAW engine menangani edge case: 0 goal (return empty), 1 goal (return rank=1 tanpa normalisasi), goal dengan nilai identik (tidak crash)
- [x] **SAW-03**: User dapat toggle strategi ranking: Quick Win (default — prioritaskan goal hampir selesai) vs Importance-First (FR-013)

#### Smart Allocation

- [x] **ALLOC-01**: Saat transaksi Side Income tersimpan, sistem menampilkan modal saran alokasi ke goal prioritas tertinggi dalam ≤2 detik (FR-010)
- [x] **ALLOC-02**: Saran alokasi menganjurkan ≈30-40% dari nominal transaksi side income, dengan goal alternatif tersedia
- [x] **ALLOC-03**: User wajib mengkonfirmasi alokasi melalui modal — sistem tidak pernah auto-execute alokasi tanpa persetujuan eksplisit (FR-011)
- [x] **ALLOC-04**: User dapat melewati (skip) saran alokasi; suggestion tersimpan sebagai pending
- [x] **ALLOC-05**: User dapat melihat daftar pending allocation suggestion yang belum direspons

---

### Kelompok 3 — Pelengkap (Memperkaya Input & Insight)

#### Receipt Scan

- [ ] **SCAN-01**: User dapat mengupload foto struk; sistem mengekstrak merchant, nominal, tanggal, item, dan suggested_category_id via AI vision (FR-002)
- [ ] **SCAN-02**: User dapat mereview dan mengoreksi hasil ekstraksi sebelum transaksi disimpan — data tidak pernah auto-save tanpa review (FR-004)
- [ ] **SCAN-03**: Jika ekstraksi gagal (gambar buram, timeout >10 detik), sistem menampilkan pesan fallback dan arahkan ke input manual (FR-017)

#### E-Statement Import

- [ ] **ESTAT-01**: User dapat mengupload file PDF e-statement; sistem mengekstrak daftar transaksi dengan tanggal, deskripsi, nominal, tipe, dan suggested_category_id (FR-003)
- [ ] **ESTAT-02**: User dapat mereview transaksi yang diekstrak, tandai possible duplicate, dan konfirmasi sebelum batch import
- [ ] **ESTAT-03**: Sistem melaporkan imported_count dan skipped_count setelah batch import selesai

#### AI Financial Assistant

- [ ] **AIINS-01**: User dapat melihat insight keuangan satu arah (bukan chat interaktif) dalam Bahasa Indonesia, dihasilkan dari data transaksi dan goal aktif (FR-012)
- [ ] **AIINS-02**: Setiap insight memiliki action verb (Alokasikan, Kurangi, Pertimbangkan) dan link ke goal atau kategori yang relevan
- [ ] **AIINS-03**: Jika LLM gagal merespons dalam >15 detik, sistem menampilkan fallback_message yang mengarahkan user ke halaman Goals (FR-017)

#### SAW Weight Adjustment

- [ ] **SAW-04**: User dapat menyesuaikan bobot 5 kriteria SAW secara manual; validasi: total bobot harus = 100% (toleransi 0.001) (FR-014)
- [ ] **SAW-05**: User dapat mereset bobot ke default hasil riset (n=62)

#### Quick Access Panel

- [ ] **QAP-01**: User melihat panel shortcut di halaman Home (setelah login) berisi maksimal 4 aksi cepat: tambah transaksi, scan struk, goal aktif teratas (nama + progress %), dan ringkasan saldo terkini (FR-018, PRD v1.2/Final)

---

### Kelompok 4 — Polish (Kualitas & Ketahanan)

#### Visual

- [ ] **VIS-01**: Progress setiap goal divisualisasikan dalam bentuk pixel art yang berubah seiring progress_pct bertambah (FR-015)

#### Offline & Reliability

- [ ] **OFF-01**: Transaksi yang diinput saat offline disimpan ke IndexedDB (via idb package); sync otomatis ke backend saat koneksi kembali (FR-016)
- [ ] **OFF-02**: UI menampilkan status offline/syncing/synced yang jelas kepada user

---

## v2 Requirements

Diakui namun ditangguhkan ke rilis berikutnya.

### Extended Features

- **EXT-01**: Custom user-managed categories — merusak flag_pemasukan taxonomy yang menjadi basis source detection; defer post-MVP
- **EXT-02**: Push notification real-time — butuh FCM infrastructure; halaman pending suggestions cukup untuk MVP
- **EXT-03**: Social/shared wallets — berbeda product category; dilutes personal finance identity
- **AIAGENT-01**: AI Agent Chatbot — antarmuka percakapan yang mengeksekusi aksi keuangan (catat transaksi, scan struk, tanya saldo, alokasi ke goal) via chat (FR-019, PRD v1.2/Final, Could Have). Diakses dari Quick Access Panel (QAP-01). Eksplisit post-MVP: JANGAN dikerjakan sebelum seluruh Must Have + Should Have selesai dan tanpa instruksi eksplisit user — butuh conversation state & tool-calling yang jauh lebih kompleks dari AIINS-01 (insight satu arah). Tracked di ROADMAP.md Phase 999.2 (backlog).

---

## Out of Scope

| Fitur | Alasan |
|-------|--------|
| Integrasi API resmi bank/e-wallet | Butuh partnership berbayar di luar jangkauan proyek akademik; digantikan e-statement manual |
| Chat AI interaktif | FR-012 hanya insight satu arah; agentic AI di luar scope dan timeline |
| Auto-execute Smart Allocation | Prinsip UX inti — user harus selalu punya kendali penuh atas keuangan |
| User-managed categories (MVP) | Fragmentasi flag_pemasukan taxonomy menghancurkan source detection logic |
| Real-time sync (WebSocket) | HTTP polling + pending suggestions page cukup untuk MVP |
| Multi-currency | Target pengguna mahasiswa Indonesia — IDR saja |
| Export laporan (PDF/Excel) | Di luar scope penelitian yang memvalidasi kebutuhan ini |

---

## Traceability

Pemetaan requirements ke phase roadmap. Diisi saat roadmap dibuat.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| WALL-01 | Phase 1 | Complete |
| WALL-02 | Phase 1 | Complete |
| WALL-03 | Phase 1 | Complete |
| WALL-04 | Phase 1 | Complete |
| TRAN-01 | Phase 2 | Complete |
| TRAN-02 | Phase 2 | Complete |
| TRAN-03 | Phase 2 | Complete |
| TRAN-04 | Phase 2 | Complete |
| TRAN-05 | Phase 2 | Complete |
| DASH-01 | Phase 2 | Complete |
| DASH-02 | Phase 2 | Complete |
| GOAL-01 | Phase 2 | Complete |
| GOAL-02 | Phase 2 | Complete |
| GOAL-03 | Phase 2 | Complete |
| GOAL-04 | Phase 2 | Complete |
| GOAL-05 | Phase 2 | Complete |
| SAW-01 | Phase 2 | Complete |
| SAW-02 | Phase 2 | Complete |
| SAW-03 | Phase 2 | Complete |
| ALLOC-01 | Phase 2 | Complete |
| ALLOC-02 | Phase 2 | Complete |
| ALLOC-03 | Phase 2 | Complete |
| ALLOC-04 | Phase 2 | Complete |
| ALLOC-05 | Phase 2 | Complete |
| SCAN-01 | Phase 3 | Pending |
| SCAN-02 | Phase 3 | Pending |
| SCAN-03 | Phase 3 | Pending |
| ESTAT-01 | Phase 3 | Pending |
| ESTAT-02 | Phase 3 | Pending |
| ESTAT-03 | Phase 3 | Pending |
| AIINS-01 | Phase 3 | Pending |
| AIINS-02 | Phase 3 | Pending |
| AIINS-03 | Phase 3 | Pending |
| SAW-04 | Phase 3 | Pending |
| SAW-05 | Phase 3 | Pending |
| QAP-01 | Phase 3 | Pending |
| VIS-01 | Phase 4 | Pending |
| OFF-01 | Phase 4 | Pending |
| OFF-02 | Phase 4 | Pending |
| AIAGENT-01 | Phase 999.2 (backlog) | Not started — post-MVP, do not start without explicit instruction |

**Coverage:**

- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0 ✓
- v2/backlog requirements: 4 total (EXT-01, EXT-02, EXT-03, AIAGENT-01)

---
*Requirements defined: 2026-06-30*
*Last updated: 2026-07-04 — added QAP-01 (FR-018, Phase 3) and AIAGENT-01 (FR-019, backlog Phase 999.2) per PRD Final revision (dosen feedback, 2026-07-03)*
