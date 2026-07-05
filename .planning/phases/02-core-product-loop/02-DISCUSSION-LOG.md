# Phase 2: Core Product Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05
**Phase:** 2-Core Product Loop
**Areas discussed:** Form transaksi cepat, Timing modal alokasi, Toggle strategi SAW (Quick Win vs Importance-First), Empty state dashboard & goals

---

## Form transaksi cepat

**Q1: Bagaimana tipe_transaksi ditentukan tanpa jadi field wajib terpisah?**

| Option | Description | Selected |
|--------|-------------|----------|
| Diturunkan dari kategori | Kategori sudah punya flag_pemasukan, backend resolve tipe_transaksi dari kategori_id | ✓ |
| Dua tombol/tab terpisah di UI | User pilih tab Pemasukan/Pengeluaran dulu, kategori difilter sesuai tab | |

**User's choice:** Diturunkan dari kategori (Recommended)

**Q2: Apa perilaku default tanggal_transaksi di form?**

| Option | Description | Selected |
|--------|-------------|----------|
| Default hari ini, bisa diubah | Field tanggal tetap tampil, auto-terisi hari ini | ✓ |
| Disembunyikan di belakang "Advanced/Detail lainnya" | Form utama benar-benar cuma 3 field terlihat | |

**User's choice:** Default hari ini, bisa diubah (Recommended)

---

## Timing modal alokasi

**Q1: Apa yang ditampilkan sambil menunggu GET allocation-suggestion?**

| Option | Description | Selected |
|--------|-------------|----------|
| Spinner/loading overlay langsung muncul | Overlay "Menghitung saran alokasi..." lalu transisi ke modal | ✓ |
| Diam dulu, modal baru muncul saat data siap | Tidak ada indikator loading terpisah | |

**User's choice:** Spinner/loading overlay langsung muncul (Recommended)

**Q2: Apa yang terjadi kalau GET allocation-suggestion gagal atau lambat?**

| Option | Description | Selected |
|--------|-------------|----------|
| Tetap tunggu, tampilkan modal begitu datang; kalau gagal, tutup overlay + toast error | Tidak ada hard timeout frontend | ✓ |
| Frontend enforce timeout keras lalu fallback ke halaman transaksi biasa | Berhenti menunggu setelah waktu tertentu | |

**User's choice:** Tetap tunggu, tampilkan modal begitu datang; kalau gagal, tutup overlay + toast error (Recommended)

---

## Toggle strategi SAW (Quick Win vs Importance-First)

**Q1: Apakah toggle langsung PUT ke /api/goal-settings atau preview client-side dulu?**

| Option | Description | Selected |
|--------|-------------|----------|
| Langsung persist via PUT | Toggle langsung PUT /api/goal-settings, refetch GET /api/goals | ✓ |
| Preview client-side, perlu tombol "Simpan" terpisah | Toggle awalnya cuma ubah urutan tampilan lokal | |

**User's choice:** Langsung persist via PUT (Recommended)

---

## Empty state dashboard & goals

**Q1: Apa yang tampil di Dashboard dan halaman Goals saat user baru belum punya data?**

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder ringan + CTA per section | Pesan singkat kondisi kosong plus 1 CTA relevan per KPI/section | ✓ |
| Full-page empty state dengan ilustrasi besar | Satu layar onboarding dengan ilustrasi besar, butuh aset tambahan | |

**User's choice:** Placeholder ringan + CTA per section (Recommended)

---

## Claude's Discretion

- Exact component structure for the transaction form, allocation modal, and empty-state components.
- Precise wording of empty-state messages and toast copy (Bahasa Indonesia, matching existing tone).
- Where exactly the SAW strategy toggle control sits in the Goals page layout (per Figma frame once implemented).
- SAW engine edge-case implementation details (0 goals, 1 goal, identical values) — behavior already locked by SAW-02, only code structure is Claude's call.

## Deferred Ideas

None — discussion stayed within Phase 2 scope.
