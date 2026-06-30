# Macost — API Contract

**Versi:** v0.1 (draft awal — review bersama Hidayat & Fertika sebelum dikunci)
**Base URL (dev):** `http://localhost:8000`
**Base URL (prod):** `https://macost-api.onrender.com` *(sesuaikan setelah deploy)*
**Format:** REST, JSON. Semua request/response berikut adalah **body**, bukan termasuk header.
**Auth:** Bearer token (Supabase Auth JWT) di header `Authorization: Bearer <token>` untuk semua endpoint kecuali Auth.

> **Status kontrak:** Living document. Boleh direvisi, tapi setiap revisi WAJIB dikomunikasikan ke seluruh tim (Hidayat, Fertika, Khayyira, Zarra) sebelum dipakai — supaya mock data & implementasi backend tidak diam-diam berbeda.

---

## Konvensi Umum

- Semua `id` berupa string (UUID)
- Semua nominal uang berupa `number` (integer, dalam Rupiah, tanpa desimal)
- Semua tanggal berupa string ISO 8601 (`"2026-06-27"` untuk date, `"2026-06-27T10:00:00Z"` untuk datetime)
- Error response konsisten:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nominal harus lebih besar dari 0"
  }
}
```

---

## 1. Auth

### POST /api/auth/register
*Covers: FR pendukung (pembuatan akun, Workflow 6.5)*

Request:
```json
{
  "nama": "string",
  "email": "string",
  "password": "string"
}
```

Response (201):
```json
{
  "id_pengguna": "string",
  "nama": "string",
  "email": "string",
  "access_token": "string"
}
```

### POST /api/auth/login
Request:
```json
{ "email": "string", "password": "string" }
```

Response (200):
```json
{ "access_token": "string", "id_pengguna": "string" }
```

Response (423 — locked, sesuai NFR-05):
```json
{ "error": { "code": "ACCOUNT_LOCKED", "message": "Terlalu banyak percobaan gagal. Coba lagi dalam 30 menit." } }
```

---

## 2. Wallets / Dompet

> Entitas ini ada di ERD tapi belum punya FR eksplisit di PRD — ditambahkan di sini agar konsisten. **Catatan untuk Hidayat: usulkan tambah FR-018 di update PRD berikutnya.**

### GET /api/wallets
Response (200):
```json
{
  "wallets": [
    { "id_dompet": "string", "nama_dompet": "Gopay", "saldo": 250000 },
    { "id_dompet": "string", "nama_dompet": "Cash", "saldo": 50000 }
  ]
}
```

### POST /api/wallets
Request:
```json
{ "nama_dompet": "string" }
```
Response (201): sama seperti satu objek wallet di atas, `saldo` default `0`.

### PUT /api/wallets/{id}
Request: `{ "nama_dompet": "string" }`
Response (200): objek wallet terbaru.

### DELETE /api/wallets/{id}
Response (204): no content.

---

## 3. Categories / Kategori

### GET /api/categories
Response (200):
```json
{
  "categories": [
    {
      "id_kategori": "string",
      "nama_kategori": "Makan & Minum",
      "tipe": "Pengeluaran",
      "flag_pengeluaran": "Kebutuhan",
      "flag_pemasukan": null
    },
    {
      "id_kategori": "string",
      "nama_kategori": "Freelance",
      "tipe": "Pemasukan",
      "flag_pemasukan": "Flexible Side Income",
      "flag_pengeluaran": null
    }
  ]
}
```

> Daftar kategori awal di-seed dari hasil riset (`Macost_Riset_Tambahan_Variabel.md`). Endpoint ini read-only untuk MVP (kategori tidak dikelola user).

---

## 4. Transactions / Transaksi

### POST /api/transactions
*Covers: FR-001 (manual), FR-005 (pelabelan otomatis)*

Request:
```json
{
  "tipe_transaksi": "Pemasukan",
  "nominal": 500000,
  "tanggal_transaksi": "2026-06-27",
  "metode_input": "Manual",
  "dompet_id": "string",
  "kategori_id": "string",
  "catatan": "string | null"
}
```

> Catatan: `source` (Allowance/Side Income) **tidak dikirim manual oleh frontend** — sistem menentukannya otomatis dari `flag_pemasukan` milik kategori yang dipilih (sesuai FR-005). Frontend cukup kirim `kategori_id`.

Response (201):
```json
{
  "id_transaksi": "string",
  "tipe_transaksi": "Pemasukan",
  "nominal": 500000,
  "tanggal_transaksi": "2026-06-27",
  "metode_input": "Manual",
  "dompet_id": "string",
  "kategori_id": "string",
  "source_label": "Flexible Side Income",
  "created_at": "2026-06-27T10:00:00Z",
  "allocation_suggestion_available": true
}
```

> `allocation_suggestion_available: true` adalah sinyal ke frontend untuk langsung memanggil endpoint #7 (Allocation Suggestion) jika transaksi ini Side Income — ini yang men-trigger Modal Saran Alokasi (lihat Sitemap halaman #16).

### GET /api/transactions
Query params: `?start_date=&end_date=&category_id=&source=&page=&limit=`

Response (200):
```json
{
  "transactions": [ /* array objek transaksi seperti di atas */ ],
  "total": 42,
  "page": 1
}
```

### PUT /api/transactions/{id}
*Covers: FR-004 (koreksi hasil ekstraksi)*

Request: sama seperti POST. Response (200): objek transaksi terbaru.

### DELETE /api/transactions/{id}
Response (204): no content.

### POST /api/transactions/scan-receipt
*Covers: FR-002 (scan struk)*

Request: `multipart/form-data` dengan field `image` (file).

Response (200) — sukses ekstraksi:
```json
{
  "extracted": true,
  "merchant": "Indomaret",
  "nominal": 27500,
  "tanggal_transaksi": "2026-06-27",
  "items": ["Aqua 600ml", "Roti Tawar"],
  "suggested_category_id": "string"
}
```

Response (200) — gagal ekstraksi (fallback FR-017):
```json
{
  "extracted": false,
  "error_message": "Foto kurang jelas, silakan input manual atau coba lagi"
}
```

### POST /api/transactions/upload-statement
*Covers: FR-003 (e-statement)*

Request: `multipart/form-data` dengan field `file` (PDF).

Response (200):
```json
{
  "extracted_transactions": [
    {
      "temp_id": "string",
      "tanggal_transaksi": "2026-06-27",
      "deskripsi": "TRANSFER MASUK - PT KLIEN ABC",
      "nominal": 750000,
      "tipe_transaksi": "Pemasukan",
      "suggested_category_id": "string",
      "is_possible_duplicate": false
    }
  ]
}
```

### POST /api/transactions/import-batch
Request:
```json
{
  "transactions": [ /* array, masing-masing bentuknya sama seperti POST /api/transactions, plus temp_id untuk tracing */ ]
}
```
Response (201): `{ "imported_count": 12, "skipped_count": 1 }`

---

## 5. Goals

### GET /api/goals
*Covers: FR-008, FR-009 (ranking SAW disertakan)*

Response (200):
```json
{
  "goals": [
    {
      "id_goal": "string",
      "nama_goal": "Beli Laptop",
      "nominal_target": 8000000,
      "nominal_terkumpul": 3200000,
      "deadline": "2026-12-31",
      "skor_keinginan": 5,
      "skor_kepentingan": 4,
      "progress_pct": 40,
      "rank": 1
    }
  ]
}
```

> `nominal_terkumpul` dan `progress_pct` adalah derived value (dihitung dari SUM Alokasi terhadap goal ini — lihat PRD §10.1). `rank` adalah hasil SAW real-time.

### POST /api/goals
*Covers: FR-007*

Request:
```json
{
  "nama_goal": "string",
  "nominal_target": 8000000,
  "deadline": "2026-12-31",
  "skor_keinginan": 5
}
```
Response (201): objek goal (skor_kepentingan dihitung otomatis dari deadline, lihat PRD §10.1).

### GET /api/goals/{id}
Response (200): objek goal + field tambahan:
```json
{
  "...": "field standar seperti di atas",
  "allocation_history": [
    { "id_alokasi": "string", "nominal_alokasi": 175000, "tanggal_alokasi": "2026-06-27", "transaksi_id": "string" }
  ]
}
```

### PUT /api/goals/{id}
Request: sama seperti POST. Response (200): objek goal terbaru.

### DELETE /api/goals/{id}
Response (204): no content.

---

## 6. Goal Prioritization Settings

### GET /api/goal-settings
*Covers: FR-013, FR-014*

Response (200):
```json
{
  "strategy": "quick_win",
  "weights": {
    "personal_importance": 0.225,
    "progress_gap": 0.219,
    "saving_capacity": 0.215,
    "urgency": 0.178,
    "target_amount": 0.162
  }
}
```

### PUT /api/goal-settings
Request:
```json
{
  "strategy": "quick_win" | "importance_first",
  "weights": { "personal_importance": 0.3, "progress_gap": 0.2, "saving_capacity": 0.2, "urgency": 0.15, "target_amount": 0.15 }
}
```
> Validasi: jumlah seluruh `weights` harus = 1.0 (atau 100%). Response (400) jika tidak.

Response (200): objek settings terbaru.

---

## 7. Smart Allocation

### GET /api/transactions/{id}/allocation-suggestion
*Covers: FR-010 — dipanggil otomatis oleh frontend setelah transaksi side income tersimpan*

Response (200) — ada goal aktif:
```json
{
  "has_active_goal": true,
  "suggested_goal_id": "string",
  "suggested_goal_name": "Beli Laptop",
  "suggested_amount": 175000,
  "suggested_pct": 35,
  "alternative_goals": [
    { "goal_id": "string", "goal_name": "Dana Darurat", "rank": 2 }
  ]
}
```

Response (200) — belum ada goal aktif:
```json
{ "has_active_goal": false }
```
> Frontend menampilkan prompt "Buat goal dulu" jika `has_active_goal: false` (lihat Workflow 6.1, decision point).

### POST /api/allocations
*Covers: FR-011 (konfirmasi alokasi)*

Request:
```json
{
  "transaksi_id": "string",
  "goal_id": "string",
  "nominal_alokasi": 175000
}
```
Response (201):
```json
{
  "id_alokasi": "string",
  "nominal_alokasi": 175000,
  "tanggal_alokasi": "2026-06-27T10:05:00Z",
  "goal_updated": { "id_goal": "string", "nominal_terkumpul": 3375000, "progress_pct": 42 }
}
```

### POST /api/allocations/{transaction_id}/skip
*Covers: alokasi dilewati (edge case Workflow 6.1) — disimpan sebagai pending suggestion*

Response (200): `{ "status": "skipped", "pending_until": "2026-06-28T10:05:00Z" }`

### GET /api/allocations/pending
*Covers: halaman Notifikasi/Pending Suggestion (Sitemap #17)*

Response (200):
```json
{
  "pending": [
    { "transaksi_id": "string", "nominal": 500000, "suggested_goal_name": "Beli Laptop", "expires_at": "2026-06-28T10:05:00Z" }
  ]
}
```

---

## 8. Dashboard

### GET /api/dashboard
*Covers: FR-006 — urutan field di response SENGAJA mengikuti urutan prioritas KPI hasil survey (lihat PRD §3 & Sitemap §C), bukan urutan acak*

Query params: `?period=this_month|last_month|custom&start_date=&end_date=`

Response (200):
```json
{
  "expense_by_category": [
    { "kategori_id": "string", "nama_kategori": "Makan & Minum", "total": 850000, "pct": 35 }
  ],
  "active_goals_summary": [
    { "id_goal": "string", "nama_goal": "Beli Laptop", "progress_pct": 40 }
  ],
  "monthly_trend": [
    { "month": "2026-05", "income": 2500000, "expense": 1800000 },
    { "month": "2026-06", "income": 2750000, "expense": 1650000 }
  ],
  "overspending_alert": {
    "is_active": false,
    "message": null
  },
  "total_balance": 1900000
}
```

---

## 9. AI Financial Assistant

### GET /api/ai-insight
*Covers: FR-012, FR-017 (fallback)*

Response (200) — sukses:
```json
{
  "insight_available": true,
  "insights": [
    {
      "id": "string",
      "message": "Side income kamu bulan ini bisa nutup 60% goal Laptop kalau dialokasikan penuh.",
      "related_goal_id": "string",
      "generated_at": "2026-06-27T10:00:00Z"
    }
  ]
}
```

Response (200) — fallback (API LLM gagal, FR-017):
```json
{
  "insight_available": false,
  "fallback_message": "Insight AI sedang tidak tersedia. Cek progress goal kamu langsung di halaman Goals ya!"
}
```

---

## Ringkasan Endpoint per FR (untuk cross-check)

| FR | Endpoint |
|---|---|
| FR-001 | `POST /api/transactions` |
| FR-002 | `POST /api/transactions/scan-receipt` |
| FR-003 | `POST /api/transactions/upload-statement` |
| FR-004 | `PUT /api/transactions/{id}`, `POST /api/transactions/import-batch` |
| FR-005 | otomatis di dalam `POST /api/transactions` (server-side, dari kategori) |
| FR-006 | `GET /api/dashboard` |
| FR-007 | `POST /api/goals` |
| FR-008 | `GET /api/goals`, `GET /api/goals/{id}` |
| FR-009 | field `rank` di `GET /api/goals` (dihitung server-side) |
| FR-010 | `GET /api/transactions/{id}/allocation-suggestion` |
| FR-011 | `POST /api/allocations`, `POST /api/allocations/{id}/skip` |
| FR-012 | `GET /api/ai-insight` |
| FR-013, FR-014 | `GET/PUT /api/goal-settings` |
| FR-015 | tidak butuh endpoint baru — dihitung dari `progress_pct` di response Goals (visual murni di frontend) |
| FR-016 | ditangani di sisi client (offline cache), tidak butuh endpoint khusus selain endpoint normal |
| FR-017 | pola fallback diterapkan di tiap endpoint terkait AI (`scan-receipt`, `ai-insight`) |
| *(belum ada FR)* | `GET/POST/PUT/DELETE /api/wallets` — lihat catatan di §2 |

---

## Revision Log

| Versi | Tanggal | Perubahan |
|---|---|---|
| v0.1 | 27 Juni 2026 | Draft awal, diturunkan dari PRD v1.1 (FR-001 s.d. FR-017) dan Data Entity. Perlu direview bersama Fertika sebelum dipakai sebagai basis implementasi/mock. |
