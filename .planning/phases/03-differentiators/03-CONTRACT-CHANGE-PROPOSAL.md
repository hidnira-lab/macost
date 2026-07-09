# Proposal Perubahan Dokumen Bersama — Phase 3

**Status:** DRAF — menunggu sign-off tim
**Tanggal:** 2026-07-09
**Diusulkan oleh:** (isi nama) via `/gsd-discuss-phase 3`
**Sumber keputusan:** `.planning/phases/03-differentiators/03-CONTEXT.md` (D-03, D-05)

> ⚠ Dokumen ini adalah **draf proposal**. `API_CONTRACT.md` dan `.planning/REQUIREMENTS.md`
> **belum diubah**. Perubahan #1 (kontrak API) baru boleh diterapkan **setelah disepakati
> keempat anggota tim** (aturan wajib: setiap perubahan shape endpoint dikomunikasikan dulu).

---

## Ringkasan

| # | Dokumen | Perubahan | Alasan | Butuh sign-off tim? |
|---|---------|-----------|--------|---------------------|
| 1 | `API_CONTRACT.md` §9 | Tambah field `action_verb` + `related_category_id` pada tiap item `insights[]` di `GET /api/ai-insight` | `AIINS-02` mewajibkan tiap insight punya action verb + link ke goal **atau kategori**; shape sekarang belum menampungnya | **Ya** (ubah kontrak) |
| 2 | `.planning/REQUIREMENTS.md` | Toleransi validasi bobot SAW di `SAW-04`: `0.001` → `0.002` | Bobot default riset (n=62) berjumlah **0.999**, tidak lolos toleransi ±0.001; sudah ada keputusan tercatat toleransi 0.002 | Sebaiknya (doc planning internal) |

---

## Perubahan #1 — `API_CONTRACT.md` §9 (GET /api/ai-insight)

**Lokasi:** blok "Response (200) — sukses" di bawah `### GET /api/ai-insight`.
Blok "Response (200) — fallback" **tidak berubah**.

### SEBELUM

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

### SESUDAH (usulan)

```json
{
  "insight_available": true,
  "insights": [
    {
      "id": "string",
      "message": "Side income kamu bulan ini bisa nutup 60% goal Laptop kalau dialokasikan penuh.",
      "action_verb": "Alokasikan",
      "related_goal_id": "string",
      "related_category_id": null,
      "generated_at": "2026-06-27T10:00:00Z"
    }
  ]
}
```

### Aturan field baru (usulkan ditambahkan sebagai catatan di kontrak)

- **`action_verb`** — string, **wajib**. Enum tetap: `"Alokasikan"` | `"Kurangi"` | `"Pertimbangkan"`. Ditentukan server-side oleh generator insight.
- **`related_category_id`** — string UUID, **nullable**. Diisi jika insight merujuk ke sebuah kategori pengeluaran/pemasukan.
- **`related_goal_id`** — string UUID, **nullable** (klarifikasi: sebelumnya dicontohkan `"string"`; ditegaskan boleh `null`). Diisi jika insight merujuk ke sebuah goal.
- **Invariant:** minimal salah satu dari `related_goal_id` / `related_category_id` terisi (tidak boleh keduanya `null`) — memenuhi "link ke goal **atau** kategori" di AIINS-02.

### Dampak & kompatibilitas

- **Backward-compatible secara aditif** untuk konsumen yang mengabaikan field baru, TAPI `action_verb` bersifat wajib di output baru — frontend harus dirender memakainya (AIINS-02), jadi perlakukan sebagai perubahan yang dikoordinasikan, bukan opsional.
- **Backend (Fertika):** generator insight harus mengeluarkan `action_verb` dari vocab tetap + mengisi salah satu `related_*`.
- **Web (Zarra/Khayyira):** kartu insight menampilkan `action_verb` sebagai CTA dan nge-link ke goal/kategori terkait; update `apps/web/lib/api/types.ts` + mock `ai-insight`.
- **Mock:** tambahkan field baru ke fixture mock insight agar dev frontend paralel jalan sebelum LLM live.

---

## Perubahan #2 — `.planning/REQUIREMENTS.md` (SAW-04)

### SEBELUM

```
- [ ] **SAW-04**: User dapat menyesuaikan bobot 5 kriteria SAW secara manual; validasi: total bobot harus = 100% (toleransi 0.001) (FR-014)
```

### SESUDAH (usulan)

```
- [ ] **SAW-04**: User dapat menyesuaikan bobot 5 kriteria SAW secara manual; validasi: total bobot harus = 100% (toleransi 0.002) (FR-014)
```

### Alasan

- Bobot default hasil survey n=62 berjumlah **0.999** (personal_importance 0.225 + progress_gap 0.219 + saving_capacity 0.215 + urgency 0.178 + target_amount 0.162), disengaja dan **tidak boleh "diperbaiki"**.
- Toleransi ±0.001 akan **menolak bobot default itu sendiri** saat divalidasi — kontradiktif.
- Toleransi ±0.002 lolos untuk default 0.999 sekaligus menjaga jumlah tetap ~100%. Sudah sesuai keputusan tim yang tercatat.

### Catatan sinkronisasi

`API_CONTRACT.md` §`PUT /api/goal-settings` saat ini menulis "jumlah seluruh `weights` harus = 1.0". Agar konsisten, disarankan sekalian menambah catatan toleransi ±0.002 di kontrak tersebut saat sign-off (opsional, tapi mencegah drift validasi backend vs requirement).

---

## Langkah setelah disepakati

1. Terapkan Perubahan #1 ke `API_CONTRACT.md` §9 (+ catatan field baru) — setelah 4 anggota setuju.
2. Terapkan Perubahan #2 ke `.planning/REQUIREMENTS.md` (dan opsional catatan toleransi di §goal-settings).
3. Update `03-CONTEXT.md` <deferred> → tandai kedua follow-up sebagai selesai.
4. Lanjut `/gsd-plan-phase 3`.
