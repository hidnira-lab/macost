---
phase: 02-core-product-loop
plan: 15
subsystem: integration
tags: [live-verification, latency, railway, supabase, tauri, human-checkpoint]

requires:
  - phase: 02-core-product-loop
    provides: "02-01 through 02-14 (full Phase 2 backend + frontend build)"
provides:
  - "Live-stack latency measurement for GET /api/transactions/{id}/allocation-suggestion, before and after quick task 260709-0pc"
  - "Root-cause documentation for the sequential-Supabase-query latency pattern"
affects: [phase-3-ai-integration, demo-readiness]

tech-stack:
  added: []
  patterns:
    - "Live-network latency testing done via a standalone Node script (register throwaway test account -> create wallet/goal -> timed POST /transactions + GET allocation-suggestion), not an automated test in the repo -- this is inherently a manual/live-network verification per the plan's own <verify> spec"

key-files:
  created: []
  modified: []

key-decisions:
  - "Task 1 latency target (<=2000ms) is NOT met after the 260709-0pc parallelization fix (2329ms avg post-fix vs 2622ms avg pre-fix) -- documented as a known, measured gap rather than force-closed or silently accepted. Root cause of the remaining gap is the number of sequential Supabase REST round-trips still in the critical path (transaction fetch, goals fetch, alokasi fetch, plus the POST /transactions write itself), each paying full Railway<->Supabase network RTT. Closing the remaining gap requires a larger architectural change (e.g. combining reads into a single Postgres RPC/view, or caching goal_settings) that was judged out of scope for an unsupervised overnight session against a live production financial app -- left as an explicit decision point for Hidayat."
  - "Task 2 (human-verify checkpoint: full core loop walkthrough inside the built Tauri desktop app) cannot be completed by an AI agent -- it requires a human physically launching the Tauri desktop window and clicking through the 10-step flow in <how-to-verify>. This plan is left genuinely incomplete pending that human session; no fabricated pass is recorded."

requirements-completed: []

duration: ~25min (Task 1 only; Task 2 not executable by this session)
completed: 2026-07-09
---

# Phase 02 Plan 15: Live Integration Verification Summary

**Task 1 (live latency measurement) executed in full, including root-cause investigation and a real fix (quick task 260709-0pc). Task 2 (human Tauri desktop walkthrough) is a blocking human-verify checkpoint that could not be executed autonomously — this plan is partially complete.**

## Performance

- **Duration:** ~25 min active work (Task 1 + fix + re-measurement), spread across an autonomous overnight session
- **Tasks:** 1/2 completed (Task 1 done; Task 2 blocked on human availability)

## Accomplishments

### Task 1: Live latency measurement — DONE, with a documented gap

**Pre-fix measurement** (against live `https://macost-production.up.railway.app`, Railway Serverless toggle confirmed OFF by Hidayat before testing):

| Run | Total | POST /transactions | GET allocation-suggestion |
|-----|-------|---------------------|----------------------------|
| 1 | 2470ms | 824ms | 1646ms |
| 2 | 2440ms | 840ms | 1600ms |
| 3 | 2956ms | 858ms | 2098ms |
| **Avg** | **2622ms** | **841ms** | **1781ms** |

**Verdict: FAIL** against the ≤2000ms ROADMAP.md success criterion.

**Root-cause investigation** (reading `backend/services/allocation_service.py` and `backend/services/goal_service.py`): confirmed this is NOT an N+1 query bug — `fetch_and_rank_goals()` was already batched by design (4 queries regardless of goal count, per its own docstring). The actual cause: 5 Supabase REST queries execute **fully sequentially** in the request's critical path even though 2 of them (`get_avg_monthly_side_income`, `get_or_create_goal_settings`) have no data dependency on the others or each other.

**Fix applied:** Quick task `260709-0pc` (commit `d53b417`, merged to `main`, pushed and auto-deployed via Railway per D-06) parallelized the two independent queries using `concurrent.futures.ThreadPoolExecutor(max_workers=2)` (the Supabase client in this codebase is sync/blocking — confirmed by reading `backend/core/supabase.py` — so threading, not `asyncio.gather`, was the correct mechanism). Backend test suite: 75/75 passing after the change, including the existing `_CountingSupabaseClient` query-count regression guard in `test_goals.py`.

**Post-fix measurement** (same live endpoint, after confirming Railway had redeployed):

| Run | Total | POST /transactions | GET allocation-suggestion |
|-----|-------|---------------------|----------------------------|
| 1 | 2182ms | 813ms | 1369ms |
| 2 | 2610ms | 1281ms | 1329ms |
| 3 | 2196ms | 857ms | 1339ms |
| **Avg** | **2329ms** | **984ms** | **1346ms** |

**Verdict: still FAIL** against ≤2000ms, but a real, measured improvement: the `GET allocation-suggestion` call itself dropped from 1781ms → 1346ms average (~24% faster), with much tighter variance (1329–1369ms vs. the pre-fix 1600–2098ms spread) — consistent with successfully removing one sequential round-trip from that call's critical path.

**Why the target is still missed:** The remaining critical path still has effectively 4 sequential Supabase round-trips: (1) `POST /transactions` itself (transaction insert), (2) the transaction re-fetch + IDOR/business-rule validation inside `GET .../allocation-suggestion`, (3) the `goal` fetch, (4) the `alokasi` fetch (dependent on (3)'s goal_ids). Each pays a full Railway↔Supabase network round-trip (roughly 300–450ms observed). Closing the remaining gap would require a more invasive change — e.g. combining the goals+alokasi+settings+income reads into a single Postgres RPC/view call, or caching `goal_settings` — which is a larger architectural decision than "parallelize what's independent," and was judged out of scope to make unilaterally, unreviewed, against a live production financial app during an unsupervised overnight session. **This is an open decision point for Hidayat**, not a silently-accepted gap or a forced pass.

### Task 2: Human verification — full core loop + Tauri desktop — NOT EXECUTED (blocking)

This task is explicitly `type="checkpoint:human-verify" gate="blocking"` in the plan, requiring a human to:
1. Set `NEXT_PUBLIC_USE_MOCK=false` and launch the actual Tauri desktop app window (`tauri dev`/`tauri build`)
2. Register/log in, create 2+ goals, add side-income and expense transactions
3. Visually confirm the Allocation Suggestion Modal, goal progress updates, the Pending Allocations page, the SAW strategy toggle, and the Dashboard's 5 KPIs — **inside the actual Tauri desktop GUI window**, not just via API calls

No part of this is scriptable by an AI agent without GUI automation tooling that isn't available in this environment (no Playwright/Puppeteer MCP configured for a native Tauri window, and this is a desktop app, not a browser page). Reporting this as "done" would be a fabricated result. **This step remains open and requires Hidayat to run it manually.**

## Task Commits

Task 1's fix was committed separately as its own quick task (not part of this plan's commit surface, since 02-15 itself is `files_modified: []` — an integration/verification task):
- `d53b417` — `perf(backend): parallelize independent Supabase queries in fetch_and_rank_goals` (quick task `260709-0pc`)
- `845c7d9` — `docs(quick-260709-0pc): plan + summary for allocation-suggestion latency fix`

This SUMMARY's own commit documents Task 1's findings; no application code changes belong to this commit.

## Files Created/Modified

None directly by this plan (per its own `files_modified: []` — see `260709-0pc`'s SUMMARY for the actual code change).

## Decisions Made

- Latency gap (2329ms vs ≤2000ms target) is documented as a known, measured, partially-improved issue — not force-closed, not silently dropped. See `key-decisions` above.
- Task 2 is left genuinely incomplete. No pass was fabricated.

## Deviations from Plan

- The plan's Task 1 `<action>` said to "investigate ... and document which [cause]" — it did not originally scope an actual code fix. A fix was implemented anyway (as quick task `260709-0pc`) because Hidayat explicitly authorized it mid-session ("fix sekarang") after seeing the root-cause finding. This is a deliberate, user-authorized scope expansion beyond the plan's literal text, not an unrequested deviation.
- Task 2 could not be executed at all in this session — see above. This is the one plan in Phase 2 that cannot be closed out by an AI agent working alone.

## Issues Encountered

- None beyond the latency gap and Task 2's inherent human-only nature, both documented above.

## Next Phase Readiness

- **Phase 2 is NOT fully verified.** 21/22 plans have SUMMARY.md; this plan (02-15, the 22nd) is partially complete: Task 1 done (with a documented, non-blocking-but-real perf gap), Task 2 blocked on human availability.
- **Action needed from Hidayat when available:**
  1. Run the 10-step manual verification from `02-15-PLAN.md` Task 2's `<how-to-verify>` against the live stack, inside the actual Tauri desktop app build.
  2. Decide whether the remaining ~2.3s allocation-suggestion latency is acceptable for the demo, or whether to invest in the larger architectural fix (single combined Postgres RPC/view) described above before Phase 2 is considered fully closed.
- Phase 3 planning should not start until this plan's Task 2 is resolved and Hidayat has made the latency call above — ROADMAP.md Phase 2 success criteria 1–5 are not yet fully confirmed true end-to-end (specifically criterion tied to the Tauri desktop app, and the ≤2s latency criterion).

---
*Phase: 02-core-product-loop*
*Completed: 2026-07-09 (Task 1 only — Task 2 open)*

## Self-Check: PARTIAL

Task 1 fully executed and verified (live measurements before/after, root cause identified, fix committed at `d53b417`, test suite 75/75 passing). Task 2 not executable by this session — requires human GUI interaction with the Tauri desktop app. This plan should NOT be treated as phase-closing until Task 2 is run by a human.
