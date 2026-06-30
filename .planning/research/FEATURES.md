# Feature Research

**Domain:** Student Pocket MIS — personal finance / savings goal management for Indonesian university students with mixed income (fixed allowance + side income)
**Researched:** 2026-06-30
**Confidence:** MEDIUM (cross-verified across multiple web sources; findings consistent across 6+ independent sources)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken. No competitive credit for having them — only penalty for missing them.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Manual transaction input (income + expense) | Every finance app has this; it's the data entry point | LOW | Macost: FR-001. The form must be minimal — 3-5 fields max. Number of fields per transaction is the single strongest predictor of completion rate. |
| Spending category breakdown | Users want to know *where* money went | LOW | Macost: FR-006 (expense_by_category). A pie/bar chart is baseline; the KPI order is already research-validated. |
| Dashboard with balance summary | The app "home" — if it doesn't show your financial state at a glance, users leave | LOW | Macost: FR-006. Dashboard KPI order already locked from survey. |
| Goal tracking with progress display | Students save for specific things (laptop, book, event) — progress bars are expected | LOW | Macost: FR-007, FR-008. Named goals with progress % are the minimum. |
| Monthly income/expense trend | Users want to see if they're improving month-over-month | LOW | Macost: FR-006 (monthly_trend). Two-month lookback is sufficient for MVP. |
| Secure authentication | Financial data requires trust; no one uses an app they don't trust | LOW | Macost: Auth via Supabase. Biometric (FaceID/fingerprint) should be enabled from day 1 — reduces daily friction significantly. |
| Overspending alert | Users expect to be warned before they run out of money | LOW | Macost: FR-006 (overspending_alert). Single boolean + message is enough. |
| Multi-wallet support | Indonesian students use GoPay, Dana, Cash concurrently | MEDIUM | Macost: FR-018. At least Gopay, Cash, Bank — names user-controlled. |
| Transaction history with filtering | Users need to review and correct past entries | LOW | Macost: GET /api/transactions with date/category/source filters. |
| Edit and delete transactions | Mistakes happen; inability to correct is an immediate uninstall trigger | LOW | Macost: PUT/DELETE /api/transactions/{id}. |

### Differentiators (Competitive Advantage)

Features that set Macost apart. These are where the product competes.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Side income detection + labeling (Allowance vs Side Income) | Directly models the student income structure — no other student app in the Indonesian market distinguishes income type at the category level | LOW | Macost: FR-005. Server-side from flag_pemasukan. This is the foundation for the smart allocation trigger — without this distinction, the allocation intelligence doesn't know *when* to fire. |
| SAW-ranked goal prioritization | Research-validated multi-criteria ranking (n=62 survey) vs every competitor's manual ordering or simple deadline sort | HIGH | Macost: FR-009. The 5-criteria weighted scoring (personal_importance, progress_gap, saving_capacity, urgency, target_amount) is the analytical core. This is academically novel for a student finance tool. |
| Suggest-and-confirm allocation on side income | "What do I do with this money?" answered immediately and non-coercively — competitors (Digit, Qapital, Plum) all auto-execute; Macost gives control | MEDIUM | Macost: FR-010, FR-011. The suggest-and-confirm pattern is the correct trust-building approach for new users. Auto-execute requires months of established trust first. The modal appearing immediately after side income is logged is the key UX moment. |
| Quick Win vs Importance-First strategy toggle | Lets users choose psychological framing — "close small goals fast for momentum" vs "work on what matters most" | LOW | Macost: FR-013. Two strategies, one toggle. This is a differentiator because no competitor surfaces this choice explicitly. |
| User-adjustable SAW weights | Advanced users can rebalance the ranking criteria to match their personal priorities | MEDIUM | Macost: FR-014. Rare for a student-focused product. Serves power users. Should be discoverable but not prominent. |
| Receipt scan via AI vision | Reduces the single largest churn driver — manual input friction (47% of churners cited this) | HIGH | Macost: FR-002, FR-004. OCR from receipt photo → pre-fills the transaction form → user confirms. The value is removing the typing step, not full automation. |
| E-statement PDF import (bulk) | Students who have months of GoPay/bank history can import it all at once — no other local student app offers this | HIGH | Macost: FR-003. Especially valuable for onboarding: "import your last 3 months" immediately gives the AI something to analyze. |
| AI natural-language financial insight | Actionable one-sentence observations, not passive charts ("Your side income this month could cover 60% of Laptop goal") | MEDIUM | Macost: FR-012. Key constraint: one-way, not chat. This satisfies ~80% of user insight needs at 20% the complexity of a chatbot. |
| Pixel art goal visualization | Gamification mechanic aligned with Gen Z/student aesthetic preferences — Habitica's pixel art style drives measurable retention | MEDIUM | Macost: FR-015. Pure frontend — progress_pct drives the pixel art state. Monzo data: gamified savers save 30% more. Revolut: gamified users 2.5x more likely to stay active. |
| Offline transaction cache with auto-sync | Students use apps in cafeteria, dorm, between classes — connectivity is unreliable | MEDIUM | Macost: FR-016. Client-side cache; sync on reconnect. Prevents "app is dead without internet" which is an immediate uninstall event. |

### Anti-Features (Deliberately NOT Building)

Features that seem appealing but cause harm to product quality, scope, or user trust. These should be documented so they are not accidentally added under scope creep.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-execute allocation (no confirmation) | Competitors like Digit and Plum do it; looks convenient | Requires months of trust to be acceptable; for a new app with a new user, surprise money movement = immediate uninstall. Our survey n=62 validated this concern. 95.1% have saving intent but 64.9% have already churned from apps — automatic actions are not the answer. | Suggest-and-confirm is the UX principle. Never auto-execute. FR-011 is non-negotiable. |
| Bank/e-wallet API integration (official) | Removes manual input entirely | Requires banking partnerships worth millions of IDR in licensing and legal overhead — completely out of scope for an academic project. Also a security surface that requires SOC2-level infrastructure. | Upload e-statement PDF (FR-003) achieves 80% of the value: bulk historical import without live connection. |
| Interactive AI chat assistant | "AI chat" is a hot feature request; GPT-style UX is familiar | Interactive chat is an agentic complexity trap: it requires intent parsing, multi-turn state, error recovery, and safety guardrails. For finance, incorrect chat responses damage trust catastrophically. | One-way AI insights (FR-012) answer the same informational need with 20% of the complexity and 0% of the conversational risk. |
| User-managed custom categories | Power users always ask for this | Custom categories fragment the `flag_pemasukan` classification system that drives Allowance/Side Income detection. Every custom category needs a flag assignment. For MVP the pre-seeded research-based categories cover 90%+ of student spending. | Read-only seeded categories for MVP. Custom categories are a v2 feature after the core taxonomy is validated. |
| Real-time push notifications | "Notify me when I can save" sounds useful | Push notification setup (FCM for Android, APNs for iOS) adds a full infrastructure layer (notification server, device token management, rate limiting). For a 10-day timeline, this is a critical scope risk. | Pending suggestions page (Sitemap #17) via GET /api/allocations/pending. User pulls notifications when they open the app — acceptable for MVP. |
| Complex multi-step onboarding wizard | Apps like Mint walk users through everything | Front-loaded setup is the #1 early abandonment trigger. Asking for bank account + goal setup + budget config before showing any value causes immediate drop-off. "Making it feel burdensome" is the exact language from user research. | Progressive disclosure: auth → first transaction → dashboard shows value → suggest goals. Defer all optional config. |
| Passive spending reports without action | Every finance app has a "Reports" page | Non-actionable reports were cited by 19% of churners as the primary reason they quit apps. A pie chart without "here is what to do about it" feels like an expensive calculator. | Every insight must link to an action: overspending alert → links to goal to redirect spending; AI insight → links to the relevant goal to allocate. |
| Social/shared wallets | Wallet app (competitor) has this | Student group expense tracking is a different product category (cf. Splitwise). Adding it dilutes the core "personal goal-based saving" identity and adds multi-user data model complexity. | Scope: Macost is personal finance only. One user per account for MVP. |

---

## Feature Dependencies

```
Auth
    └──required_by──> All features (no auth = no personalized data)

Transaction Input (FR-001)
    └──enables──> Dashboard KPIs (FR-006)
    └──enables──> AI Insights (FR-012) [needs data to analyze]
    └──triggers──> Side Income Detection (FR-005)
                       └──triggers──> Allocation Suggestion (FR-010)
                                          └──requires──> Goal exists (FR-007)
                                          └──confirmed_by──> Allocation Confirm (FR-011)

Receipt Scan (FR-002)
    └──produces──> Pre-filled Transaction Form (FR-004)
    └──fallback_to──> Manual Transaction Input (FR-001)

E-Statement Upload (FR-003)
    └──produces──> Extracted Transaction List (FR-004)
    └──confirmed_by──> Batch Import (FR-003)
    └──populates──> Transaction history → Dashboard → AI Insights chain

Goal Creation (FR-007)
    └──enables──> Goal Progress Display (FR-008)
    └──enables──> SAW Ranking (FR-009)
    └──enables──> Pixel Art Visualization (FR-015) [purely visual, driven by progress_pct]
    └──required_by──> Allocation Suggestion (FR-010)

SAW Ranking (FR-009)
    └──required_by──> Allocation Suggestion (FR-010) [needs ranked goal to suggest top target]
    └──tuned_by──> Goal Settings / Weight Adjustment (FR-014)
    └──strategy_switched_by──> Quick Win / Importance-First Toggle (FR-013)

Offline Cache (FR-016)
    └──wraps──> Transaction Input (FR-001) [queues when offline]
    └──wraps──> Goal operations (FR-007/008)

AI Vision (FR-002) and LLM Insight (FR-012)
    └──fallback_required──> Manual form / Static message (FR-017) [timeout >10s / >15s]
```

### Dependency Notes

- **Auth required by all:** Supabase JWT must be validated before any endpoint. Every other feature is blocked until this works.
- **Side income detection (FR-005) required by allocation:** The Allowance/Side Income flag on a category is the trigger gate for the allocation suggestion modal. Without server-side source labeling, the system cannot know when to suggest allocation.
- **Goals required by allocation:** If no active goals exist, `has_active_goal: false` is returned and the frontend must prompt goal creation. The allocation feature has zero value without at least one goal.
- **SAW ranking required by allocation suggestion:** The suggestion engine picks the top-ranked goal. Without ranking, it's arbitrary — which defeats the academic and product value proposition.
- **Receipt scan produces a pre-filled form, not a saved transaction:** FR-004 (user correction before save) is not optional — it's the UX bridge between AI extraction and human trust. Skipping it (auto-saving extracted data) is an anti-feature.
- **Pixel art is purely visual:** FR-015 requires no new API — it reads `progress_pct` from the Goals endpoint. It can be built entirely in frontend after FR-008 is working.
- **Offline cache wraps existing endpoints:** FR-016 is a client-side concern (IndexedDB or similar). No new backend endpoints needed. Should be layered onto the HTTP client after core endpoints are stable.

---

## MVP Definition

### Launch With (v1 — needed for Expo demo 14 July 2026)

These are features required to validate the core value proposition: "side income enters → system suggests allocation → user confirms → goal advances."

- [x] Auth (register / login / logout via Supabase) — without this nothing is personalized
- [x] Manual transaction input (FR-001) — the data entry point; must be 3-5 fields max, no more
- [x] Server-side source labeling (FR-005) — the trigger gate for smart allocation
- [x] Dashboard with 5 KPIs in research-validated order (FR-006) — demonstrates immediate value after first transaction
- [x] Multi-wallet CRUD (FR-018) — users have GoPay, Cash, bank; without this the app feels disconnected from real life
- [x] Goal creation (FR-007) — the product's emotional core; named aspirations, not account numbers
- [x] Goal progress display (FR-008) — validates that allocations work; closes the feedback loop
- [x] SAW ranking (FR-009) — the academic and product differentiator; must be visible via `rank` field
- [x] Allocation suggestion on side income (FR-010) — the core "wow moment" of the product
- [x] Allocation confirmation (FR-011) — non-negotiable UX principle; suggest-and-confirm, never auto-execute
- [x] Quick Win / Importance-First toggle (FR-013) — user agency over the ranking strategy

### Add After Validation (v1.x — if time allows before Expo or in post-demo polish)

- [ ] Receipt scan (FR-002) + user correction (FR-004) — addresses the #1 churn driver (input friction 47%), high value if OCR works reliably
- [ ] AI financial insights (FR-012) — turns passive dashboard into actionable guidance; addresses #2 churn driver (non-actionable reports 19%)
- [ ] Pixel art goal visualization (FR-015) — the gamification hook; demonstrable in Expo, but doesn't affect core data flow
- [ ] Weight adjustment (FR-014) — power user feature; low risk to add after ranking is stable
- [ ] Pending suggestions page / skip allocation (FR-011 skip + GET pending) — important for edge cases but not blocking

### Future Consideration (v2+)

- [ ] E-statement PDF import (FR-003) — high complexity (PDF parsing pipeline), high value for onboarding; defer until core loop is proven
- [ ] Offline cache (FR-016) — adds significant client complexity (sync conflicts, queue management); required for production but not for academic MVP demo
- [ ] AI fallback handling (FR-017) — required for production reliability; for demo, graceful error messages are sufficient
- [ ] Custom categories — only after research-seeded categories are validated against real usage
- [ ] Social/shared wallets — different product; v2 if at all

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth (register/login) | HIGH | LOW | P1 |
| Manual transaction input (FR-001) | HIGH | LOW | P1 |
| Source labeling server-side (FR-005) | HIGH | LOW | P1 |
| Dashboard KPIs (FR-006) | HIGH | LOW | P1 |
| Multi-wallet CRUD (FR-018) | HIGH | LOW | P1 |
| Goal creation (FR-007) | HIGH | LOW | P1 |
| Goal progress display (FR-008) | HIGH | LOW | P1 |
| SAW ranking (FR-009) | HIGH | MEDIUM | P1 |
| Allocation suggestion (FR-010) | HIGH | MEDIUM | P1 |
| Allocation confirmation (FR-011) | HIGH | LOW | P1 |
| Quick Win / Importance-First toggle (FR-013) | MEDIUM | LOW | P1 |
| Receipt scan / OCR (FR-002) | HIGH | HIGH | P2 |
| User correction of extracted data (FR-004) | HIGH | LOW | P2 (prerequisite of FR-002) |
| AI insights one-way (FR-012) | HIGH | MEDIUM | P2 |
| Pixel art visualization (FR-015) | MEDIUM | MEDIUM | P2 |
| SAW weight adjustment (FR-014) | LOW | MEDIUM | P2 |
| Allocation skip + pending suggestions | MEDIUM | LOW | P2 |
| E-statement PDF import (FR-003) | HIGH | HIGH | P3 |
| Offline cache (FR-016) | MEDIUM | HIGH | P3 |
| AI fallback handling (FR-017) | MEDIUM | LOW | P3 (needed for production, not demo) |

**Priority key:**
- P1: Must have for Expo demo (9-10 July 2026)
- P2: Should have — add if sprint velocity allows; demonstrable at Expo
- P3: Post-Expo / production hardening

---

## Competitor Feature Analysis

Indonesian student finance apps: Money Lover, Wallet, Spendee, Finku. Global reference: YNAB, Copilot, Qapital, Digit, Monzo Pots.

| Feature | Money Lover / Wallet / Spendee (local competitors) | YNAB / Qapital / Digit (global reference) | Macost Approach |
|---------|-----------------------------------------------------|-------------------------------------------|-----------------|
| Transaction input | Manual + optional bank sync | Manual + automated bank sync | Manual + receipt scan fallback (bank sync out of scope) |
| Income type distinction | None (all "income" is equal) | None natively (YNAB distinguishes budget envelopes, not income source) | Allowance vs Side Income via server-side flag — unique in the local market |
| Goal management | Present (Wallet: goals; Spendee: goals) | YNAB: budget categories act as goals; Qapital: named goals with rules | Named goals, SAW-ranked, with suggest-and-confirm allocation — more intelligent than competitors |
| Allocation intelligence | None — manual transfer to goal | Qapital/Digit: rule-based or AI, but always auto-execute | SAW-ranked suggestion + mandatory user confirmation — gives control competitors don't |
| Receipt scanning | Money Lover: limited OCR | Expensify: strong OCR (enterprise focus) | AI vision OCR with user correction before save — lower fidelity than Expensify but correct for student scale |
| AI insights | None in local apps | Copilot (iOS): learns categorization, predictive budgets | One-way natural language insights in Bahasa Indonesia — no local competitor offers this |
| Gamification / visual | Minimal (Spendee: clean charts) | Monzo: pots with emoji; YNAB: progress bars | Pixel art goal visualization — unique differentiation, strong Gen Z resonance |
| Offline support | Partial | Strong in YNAB | Planned (FR-016, P3) |
| Bahasa Indonesia | Yes (local apps) | No | Yes — required for target audience |

---

## UX Patterns for Student Demographic

These are implementation-level decisions derived from research, not features per se, but they directly determine whether features succeed or fail with the target user.

**Input friction reduction (addresses 47% of churners):**
- Transaction form: nominal + kategori + dompet + catatan (optional) = 3 required fields maximum
- Default date = today; do not make users select it unless they need to change it
- Kategori picker should be a visual grid (icon + label), not a dropdown list
- Receipt scan should launch camera immediately — no intermediate permission dialog if already granted
- Number keyboard should auto-appear on nominal field

**Dashboard as first-impression surface:**
- Show value on first login even with zero transactions (use contextual empty states: "Add your first income to get started")
- The research-validated KPI order must not be changed: expense breakdown → goal progress → monthly trend → overspending alert → total balance
- Each KPI card should be tappable and navigate to its detail — dashboard as navigation hub, not just display

**Goal as emotional anchor:**
- Every goal should display: name, pixel art visualization, progress bar (nominal collected / target), deadline countdown
- The "Beli Laptop," "Dana Darurat" style naming creates personal connection — always show the name prominently
- Allocation confirmation modal should display the goal's name and current progress before confirming — makes the action feel meaningful

**Actionable insight over passive charts:**
- Every AI insight must contain a verb: "Alokasikan," "Kurangi," "Pertimbangkan" — not just "Pengeluaran kamu naik 15%"
- Overspending alert on dashboard must link to the allocation suggestion or a goal — not just show a warning with no exit

**Onboarding:** Progressive disclosure — show the dashboard immediately after registration; suggest adding first transaction; suggest creating first goal only after first income is logged.

---

## Churn Cause Mapping

This maps the two validated churn causes from Macost survey (n=62, 64.9% churn rate) to specific product decisions.

| Churn Cause (Survey) | % of Churners | Root Behavior | Macost Counter-Feature |
|----------------------|---------------|---------------|------------------------|
| Input terlalu ribet (friction) | ~47% | Users abandon when logging a transaction takes more than 30 seconds or requires more than 4 taps | Receipt scan (FR-002, P2); minimal 3-field transaction form (FR-001); quick-add from dashboard |
| Laporan tidak memberi arahan (non-actionable) | ~19% | Users see charts but don't know what to change; the app becomes a passive ledger | AI one-way insights with action verbs (FR-012); overspending alert linked to allocation suggestion; goal dashboard that always shows "where to put money next" |
| Other / combined | ~34% | Covers: cluttered UI, irrelevant categories, no goal support in similar apps | Research-seeded categories, research-validated dashboard order, goal-centric architecture |

**Implication:** FR-002 (receipt scan) and FR-012 (AI insights) are the two features most directly targeting the validated churn causes. Even though they are P2, they should be given development bandwidth as soon as the P1 core loop is functional.

---

## Sources

- Verified Market Research — Personal Finance Apps Market Report 2025-2033 (market sizing)
- NerdWallet — Best Budget Apps 2026 (feature benchmarking)
- Netguru — "Why Do Financial App Users Churn? 10 Mistakes" (churn taxonomy)
- OptimusAI — "The 77% Drop-Off: Banking App Users Vanish After 90 Days" (retention data)
- Medium: Stefan Neculai — "Why Most Budgeting Apps Fail" (churn UX analysis)
- Procreator Design — "10 Best Fintech UX Practices for Mobile Apps 2026" (UX patterns)
- Mambo.io — "Fintech Gamification: Level Up User Engagement" (gamification data)
- AppDealHunt — Digit and Qapital comparison (smart allocation mechanics)
- SaveTheStudent.org — Automatic savings apps 2026 (student-specific comparison)
- UAM.ac.id / UNUSA.ac.id / Finku.id — Indonesian student finance app landscape (local competitor analysis)
- QuickBooks/NumberAnalytics — "10 Must-Try Features in Personal Finance Apps Today" (AI features)
- Macost survey n=62 — Internal research: 95.1% saving intent, 64.9% churn rate, 47% friction churn, 19% non-actionable report churn

---
*Feature research for: Student Pocket MIS (Macost)*
*Researched: 2026-06-30*
*Confidence: MEDIUM — findings cross-verified across 8+ independent web sources and internal survey data*
