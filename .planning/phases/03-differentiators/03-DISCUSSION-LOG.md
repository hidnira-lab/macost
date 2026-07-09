# Phase 3: Differentiators - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-09
**Phase:** 3-Differentiators
**Areas discussed:** Receipt scan image capture, E-statement duplicate detection, AI insight contract shape, SAW weight validation, Cross-team consequences handling, AI insight generation timing

---

## Receipt scan — image capture (SCAN-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Upload file saja | File picker only (JPG/PNG); simplest, consistent Web+Desktop, no camera permission | ✓ |
| Upload + webcam capture | Add getUserMedia capture; closer to "photograph" but heavier for timeline | |
| Bahas dulu | Compare effort vs demo value first | |

**User's choice:** Upload file saja
**Notes:** MVP is Web + Tauri Desktop only (no mobile); desktop rarely has a camera. "Photograph" is satisfied by uploading an existing photo.

---

## E-statement import — duplicate detection & selection (ESTAT-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Match tgl+nominal, default terpilih kecuali duplikat | Flag duplicate on (date+nominal) match; all checked by default except flagged rows | ✓ |
| Match tgl+nominal+deskripsi, semua manual | Stricter match incl. description similarity; user checks manually from empty | |
| Bahas dulu | Discuss heuristic & default selection | |

**User's choice:** Match tgl+nominal, default terpilih kecuali duplikat
**Notes:** Description-similarity matching deferred as unnecessary for MVP.

---

## AI insight — contract shape (AIINS-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Perluas kontrak: tambah action_verb + related_category_id | Extend /api/ai-insight response; requires team sign-off (API contract change) | ✓ |
| Selipkan verb di message, hanya link goal | No contract change; verb inside message text, goal link only; AIINS-02 not fully met | |
| Bahas dulu | Consider other options / team impact | |

**User's choice:** Perluas kontrak: tambah action_verb + related_category_id
**Notes:** Recorded as a mandatory follow-up — contract change must be communicated to all 4 team members before implementation.

---

## SAW weight editor & validation (SAW-04/05)

| Option | Description | Selected |
|--------|-------------|----------|
| Longgarkan toleransi ke ±0.002, input manual + reset | Manual 5-value entry, live re-rank preview, reset; tolerance 0.002 so 0.999 defaults pass | ✓ |
| Slider auto-normalisasi ke 1.0 | Interlinked sliders always summing to 1.0; avoids tolerance issue but alters displayed defaults | |
| Bahas dulu | Discuss 0.001 vs 0.999 conflict deeper | |

**User's choice:** Longgarkan toleransi ke ±0.002, input manual + reset
**Notes:** Matches previously-recorded SAW weight tolerance decision. SAW-04 requirement text must be updated 0.001→0.002.

---

## Cross-team consequences handling

| Option | Description | Selected |
|--------|-------------|----------|
| Catat sebagai follow-up wajib | Contract extension needs team sign-off; SAW-04 text update; both prerequisites | ✓ |
| Aku mau atur beda | User defines handling themselves | |

**User's choice:** Catat sebagai follow-up wajib
**Notes:** Both captured in CONTEXT.md <deferred> → Required Follow-Ups.

---

## AI insight — generation timing (AIINS-01/03)

| Option | Description | Selected |
|--------|-------------|----------|
| On-demand saat buka halaman AI + tombol refresh | Server-side LLM call on page open, 15s hard timeout → fallback; manual refresh | ✓ |
| Cache hasil, regenerate manual via refresh | Show last cached instantly; call LLM only on refresh/empty; cheaper but staler | |
| Bahas dulu | Discuss freshness vs latency/quota | |

**User's choice:** On-demand saat buka halaman AI + tombol refresh
**Notes:** Hard 15s timeout enforced server-side, not only frontend.

---

## Claude's Discretion

- Component/file structure for all five features' UI and backend services.
- Bahasa Indonesia copy for fallback/toast/empty/error states.
- Gemini vision/PDF extraction service structure and insight generator internals.
- Figma-driven layouts (request frame links per page).
- E-statement duplicate matching scope (same-wallet vs all-wallets) beyond the date+nominal rule.

## Deferred Ideas

- Webcam/live-camera receipt capture — revisit if mobile (Phase 999.1) returns.
- Description-similarity duplicate detection for e-statements.
- Insight caching / scheduled regeneration.
- Interactive AI agent chatbot (AIAGENT-01 / FR-019) — explicitly post-MVP, Phase 999.2.
