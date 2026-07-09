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
  - "Task 1 latency target (<=2000ms) is NOT met after the 260709-0pc parallelization fix (2329ms avg post-fix vs 2622ms avg pre-fix) -- documented as a known, measured gap rather than force-closed or silently accepted. Root cause of the remaining gap is the number of sequential Supabase REST round-trips still in the critical path (transaction fetch, goals fetch, alokasi fetch, plus the POST /transactions write itself), each paying full Railway<->Supabase network RTT. Closing the remaining gap requires a larger architectural change (e.g. combining reads into a single Postgres RPC/view, or caching goal_settings). Presented to Hidayat as an explicit decision point on 2026-07-09 morning -- Hidayat accepted 2329ms as-is for the demo; no further optimization planned."
  - "Task 2 (human-verify checkpoint: full core loop walkthrough inside the built Tauri desktop app) could not be completed by an AI agent -- required Hidayat physically launching the Tauri desktop window and clicking through the 10-step flow in <how-to-verify>. Completed 2026-07-09 by Hidayat after two blocking bugs surfaced during the attempt were found and fixed (see below) -- Hidayat confirmed all 10 steps pass."
  - "Two bugs were found and fixed live during the Task 2 verification attempt itself, both merged via PR #14 (commit 97f91c6 + 08c8752): (1) a stale/expired Supabase access token silently stranded users on /home or /dashboard with every API call 401ing and no recovery path (no logout button on either landing page) -- fixed by making apiFetch/apiMutate detect 401s, clear the dead token, and redirect to /login; (2) login/register both hardcoded a post-auth redirect to /wallets instead of /home, inconsistent with apps/web/app/page.tsx's own token-presence routing logic -- fixed to /home. Full investigation trail: .planning/debug/401-stale-session-token.md."

requirements-completed: [ALLOC-01]

duration: ~25min Task 1 + ~1.5hr Task 2 (including live debugging of 2 blocking auth/routing bugs found during the verification attempt)
completed: 2026-07-09
---

# Phase 02 Plan 15: Live Integration Verification Summary

**Both tasks complete. Task 1: live latency measurement + a real fix (quick task 260709-0pc), with the remaining gap explicitly accepted by Hidayat. Task 2: full core-loop walkthrough inside the built Tauri desktop app, confirmed passing by Hidayat after fixing 2 auth/routing bugs discovered live during the attempt (PR #14).**

## Performance

- **Duration:** ~25 min (Task 1 + fix + re-measurement) + ~1.5hr (Task 2 attempt, live debugging, fix, PR, retest)
- **Tasks:** 2/2 completed

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

### Task 2: Human verification — full core loop + Tauri desktop — DONE

This task is explicitly `type="checkpoint:human-verify" gate="blocking"` in the plan, requiring a human to run the 10-step `<how-to-verify>` flow inside the actual built Tauri desktop app. AI agent could not execute this directly (no GUI automation tooling available for a native Tauri window) — Hidayat ran it manually.

**First attempt blocked by 2 bugs, found and fixed live:**
- 401 Unauthorized on `/api/dashboard`, `/api/goals`, `/api/transactions` — root cause: a stale/expired access token from an old session silently routed to the dashboard (token-presence check only, no expiry validation) and every API call then failed with no recovery path (no logout button on the landing pages). Fixed via a debug session (`.planning/debug/401-stale-session-token.md`): `apiFetch`/`apiMutate` now detect 401s, clear the dead token, and redirect to `/login`.
- Post-login/register landing on `/wallets` instead of `/home` — found by Hidayat while retesting the 401 fix. Root cause: `login/page.tsx` and `register/page.tsx` both hardcoded `/wallets`, inconsistent with `apps/web/app/page.tsx`'s own `/home` routing for a token-present user. Fixed to `/home`.
- Both fixes shipped in PR #14 (`hidnira-lab/macost#14`), merged to `main` (commit `83808af`), commits `97f91c6` + `08c8752`.

**Second attempt, after PR #14 merged + Vercel redeploy + Tauri rebuild:** Hidayat confirmed all 10 steps pass — registration/login, 2+ goals with differing SAW inputs, side-income transaction triggering the Allocation Suggestion Modal with a 29-40% suggested amount, Confirm updating goal progress immediately, a second side-income transaction skipped and appearing on Pending Allocations, SAW strategy toggle visibly reordering goal ranks, Dashboard's 5 KPIs rendering in fixed order with real data — all inside the built Tauri desktop app window.

## Task Commits

Task 1's fix was committed separately as its own quick task (not part of this plan's commit surface, since 02-15 itself is `files_modified: []` — an integration/verification task):
- `d53b417` — `perf(backend): parallelize independent Supabase queries in fetch_and_rank_goals` (quick task `260709-0pc`)
- `845c7d9` — `docs(quick-260709-0pc): plan + summary for allocation-suggestion latency fix`

Task 2's blocking bugs were fixed via a debug session and shipped in PR #14, merged to `main` at `83808af`:
- `97f91c6` — `fix(auth): redirect to login on stale/expired session token instead of silent 401 stall`
- `08c8752` — `fix(web): redirect to /home instead of /wallets after login/register`
- `b1e669f` — `docs(debug): record 401-stale-session-token investigation trail`

This SUMMARY's own commit documents both tasks' findings; no new application code changes belong to this specific commit (all code changes above were committed separately, as listed).

## Files Created/Modified

None directly by this plan's own commit (integration/verification task, `files_modified: []`) — see the quick task and debug-session commits above for the actual code changes (`backend/services/goal_service.py`; `apps/web/lib/api/client.ts`, `apps/web/app/home/page.tsx`, `apps/web/app/dashboard/page.tsx`, `apps/web/app/(auth)/login/page.tsx`, `apps/web/app/(auth)/register/page.tsx`).

## Decisions Made

- Latency gap (2329ms vs ≤2000ms target) is documented as a known, measured, partially-improved issue. Presented to Hidayat as an open decision on 2026-07-09 morning — **accepted as-is for the demo**, no further optimization planned.
- Task 2's two blocking bugs (stale-session 401 stall, wrong post-login redirect) were root-caused, fixed, PR'd, and merged before re-attempting verification — no shortcuts taken to force a pass.
- The SmartAllocationModal/AllocationSuggestionModal duplication (found in the same code-review pass that surfaced other Phase 2 issues) was NOT part of Task 2's blockers — Hidayat approved a narrow stopgap fix (quick task `260709-3c4`) rather than full consolidation, deferred post-demo.

## Deviations from Plan

- The plan's Task 1 `<action>` said to "investigate ... and document which [cause]" — it did not originally scope an actual code fix. A fix was implemented anyway (as quick task `260709-0pc`) because Hidayat explicitly authorized it mid-session ("fix sekarang") after seeing the root-cause finding.
- Task 2 uncovered 2 bugs not anticipated by the plan (stale-session handling, post-login redirect) — both were diagnosed and fixed as part of getting Task 2 to a genuine pass, rather than treating them as separate unscoped work. This is the expected behavior of a human-verify checkpoint: it exists specifically to catch exactly this class of issue before Phase 3 starts.

## Issues Encountered

- See "Two bugs were found and fixed live" above — both resolved, both merged.

## Next Phase Readiness

- **Phase 2 is now fully verified.** 22/22 plans have SUMMARY.md. ROADMAP.md Phase 2 success criteria 1-5 are confirmed true end-to-end against the live stack, inside the actual Tauri desktop app, per Hidayat's manual walkthrough.
- Latency: 2329ms average for allocation-suggestion, above the original ≤2000ms target but explicitly accepted by Hidayat for the demo. Not a blocker for Phase 3.
- Known non-blocking follow-ups carried forward (not Phase 2 blockers): (1) other authenticated pages besides home/dashboard share the same bare-catch-no-401-handling pattern and would benefit from the same fix; (2) `goals/page.tsx` has a dead `handleLogout` function never wired to a button, and only `wallets/page.tsx` has a visible logout affordance; (3) SmartAllocationModal/AllocationSuggestionModal full consolidation still deferred post-demo (stopgap validation guard already shipped); (4) no refresh-token flow exists, so any session will still need re-login after Supabase's default token TTL (~1hr).
- Phase 3 planning can now proceed.

---
*Phase: 02-core-product-loop*
*Completed: 2026-07-09*

## Self-Check: PASSED

Both tasks fully executed and verified. Task 1: live measurements before/after, root cause identified, fix committed at `d53b417`, test suite 75/75 passing. Task 2: Hidayat manually confirmed all 10 verification steps pass inside the built Tauri desktop app, after 2 blocking bugs found during the attempt were fixed and merged via PR #14 (`83808af`).
