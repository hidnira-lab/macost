---
phase: 02-core-product-loop
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/02-core-product-loop/02-UI-SPEC.md
autonomous: true
requirements: [TRAN-01, DASH-01, DASH-02, GOAL-01, GOAL-02, GOAL-03, GOAL-04, GOAL-05, SAW-03, ALLOC-01, ALLOC-02, ALLOC-03, ALLOC-04]

must_haves:
  truths:
    - "A developer reading 02-UI-SPEC.md sees concrete Figma-sourced component/layout descriptions (not placeholder language) for Dashboard, Transactions (entry + manual form + history), Goals (list + detail + create + prioritization settings + empty state), and the Allocation modal."
    - "A developer can look up the Figma file key, page node, and per-frame node-IDs directly in 02-UI-SPEC.md to re-pull any of the 11 extracted frames later."
    - "A developer sees all 5 Figma-vs-spec discrepancies listed as explicitly open/unresolved — none silently decided one way or the other."
    - "A developer sees the theme resolution recorded: Figma (light theme, Inter/Bricolage Grotesque) is now source of truth; the built dark-themed apps/web pages (wallets/goals/auth) are stale and need a separate follow-up revision, out of scope here."
    - "Every previously-locked interaction/state/copy/timing contract (D-01 through D-06, the Copywriting Contract table, the Interaction & State Contracts section, the Checker Sign-Off checklist) reads identically in substance to before this update — only additive changes and one addendum note."
  artifacts:
    - .planning/phases/02-core-product-loop/02-UI-SPEC.md
  key_links:
    - "FIGMA-CONTEXT.md Global Design Tokens -> 02-UI-SPEC.md Design System / Typography / Color sections"
    - "FIGMA-CONTEXT.md Per-Frame Findings -> 02-UI-SPEC.md per-area visual-detail subsections (replacing '## Figma Gap')"
    - "FIGMA-CONTEXT.md Open Questions/Discrepancies (5 items) -> 02-UI-SPEC.md new 'Open Questions / Flagged Discrepancies' section"
    - "02-CONTEXT.md D-06 (lightweight section-scoped empty state) -> flagged conflict with Figma's 'Create First Goal' full onboarding frame (156:1438)"
---

<objective>
Update `.planning/phases/02-core-product-loop/02-UI-SPEC.md` to replace its placeholder "Figma Gap" section and dark-theme-guess design tokens with the real visual detail extracted from Figma (file `vKQLNfdx7yKSzWvxhmkhg5`, page `156:2`, 11 frames), while preserving every already-locked interaction/state/copy/timing contract verbatim and surfacing — not resolving — the 5 discrepancies the extraction uncovered.

Purpose: The orchestrator (not this executor) already pulled the Figma frames via MCP and recorded findings in FIGMA-CONTEXT.md, because only the orchestrator has Figma MCP tool access in this session. This plan's job is a pure documentation transcription/reconciliation task — get that real design detail into the canonical spec file so future phase execution for Phase 2's Dashboard/Transactions/Goals/Allocation UI does not build against guessed dark-theme placeholders.

Output: `.planning/phases/02-core-product-loop/02-UI-SPEC.md` updated in place — no source code changes, no other files touched.
</objective>

<execution_context>
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/workflows/execute-plan.md
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-core-product-loop/02-UI-SPEC.md
@.planning/phases/02-core-product-loop/02-CONTEXT.md
@.planning/quick/260706-jaq-update-02-ui-spec-md-dengan-detail-visua/260706-jaq-FIGMA-CONTEXT.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Replace guessed dark-theme design tokens with real Figma-sourced tokens + theme resolution note</name>
  <files>.planning/phases/02-core-product-loop/02-UI-SPEC.md</files>
  <action>
  In the "## Design System" table and the "## Spacing Scale", "## Typography", and "## Color" sections of 02-UI-SPEC.md, replace the currently-documented values — which were derived only from the existing hand-written dark-themed pages (`wallets/page.tsx`, `login/page.tsx`, `register/page.tsx`) because no Figma frame link had been supplied to that research session — with the real tokens confirmed by the Figma extraction in FIGMA-CONTEXT.md's "Global Design Tokens" section:
  - Design System table Font row: change from Neulis/Helvetica local fonts to **Inter** (body/UI text — Regular/Medium/Semi Bold/Bold weights) for general UI and **Bricolage Grotesque ExtraBold** (with `font-variation-settings: "opsz" 14, "wdth" 100`) for the brand wordmark and large page H1s / hero stat numbers. Keep the existing note about the local Neulis/Helvetica font files still being wired in `apps/web/app/layout.tsx`, but mark it explicitly as describing the OLD/stale theme, not the current target.
  - Color table: replace the dominant/secondary/accent roles with the light-theme roles from FIGMA-CONTEXT.md — background `#fcfcfc`/`#ffffff`, primary text `#1e1e1e`, muted/secondary text `rgba(30,30,30,0.65)`, borders `rgba(30,30,30,0.15)`, subtle fills `rgba(30,30,30,0.05)`–`rgba(30,30,30,0.08)`, accent orange `#ff8929` (gradient to `#ffb787` on progress fills, used for goals/priority/positive), accent blue `#298dff` (gradient to `#065fc5` on buttons/FABs, or `#a8c8ff` on progress fills, used for primary actions/links/active nav), destructive/error background `#ffdad6` / border `#ba1a1a` / text `#93000a` (overspending alert, error states). Preserve the existing "Accent reserved for" and "Secondary interactive color" bullet lists' *intent* (which CTAs/links get which color) but update the literal hex values to match the new roles above.
  - Typography table: update the type scale to what FIGMA-CONTEXT.md observed — 12px (labels/badges), 14px (secondary), 16px (body/card title), 18-20px (section headings), 24px (page H1), 28-32px (hero stat numbers) — and the weight set to Inter Regular/Medium/Semi Bold/Bold plus Bricolage Grotesque ExtraBold for H1/hero/wordmark only.
  - Spacing Scale / component-pattern notes: add the concrete radii and heights FIGMA-CONTEXT.md documented (standard cards `rounded-xl`/12px, hero/priority cards `rounded-3xl`/24px, progress bar track height 8-12px with `rounded-full`, icon chips circular or 8-16px rounded-square) as an addition alongside the existing 4px-multiple spacing scale — do not delete the existing spacing scale table, since FIGMA-CONTEXT.md did not contradict it, only supplement it with these component-level radius/height values.
  - Add a clearly-labeled **"Theme Resolution (2026-07-06)"** callout near the top of the Design System section stating: Figma is confirmed source of truth per user decision 2026-07-06; the design is a **light theme** (not the dark theme previously assumed); the currently-built `apps/web` pages (`wallets`, `goals`, `(auth)/login`, `(auth)/register`) still use the old dark theme (`bg-[#1e1e1e]`, Neulis/Helvetica) and are now stale relative to this spec — retrofitting those pages to the new theme is a **separate follow-up task, explicitly out of scope for this update**.
  - Do NOT touch the "shadcn Gate Decision" or "Registry Safety" subsections — they are unaffected by the theme change.
  - Do NOT alter the "## Interaction & State Contracts (Phase 2-specific)" section, the "## Copywriting Contract" table, or any D-01–D-06 reference in this task — those are handled by preservation, not modification, per this task's scope.
  </action>
  <verify>
    <automated>grep -c "Bricolage Grotesque" .planning/phases/02-core-product-loop/02-UI-SPEC.md; grep -c "fcfcfc" .planning/phases/02-core-product-loop/02-UI-SPEC.md; grep -c "Theme Resolution" .planning/phases/02-core-product-loop/02-UI-SPEC.md</automated>
  </verify>
  <done>Design System, Color, Typography, and Spacing sections in 02-UI-SPEC.md reflect the real Figma light-theme tokens (Inter + Bricolage Grotesque, `#fcfcfc` background, updated accent/destructive values) and a "Theme Resolution" callout documents that Figma now supersedes the dark-theme assumption, with the stale-built-pages follow-up noted as separate/out-of-scope. Existing Interaction & State Contracts, Copywriting Contract, and D-01–D-06 content is untouched.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Replace "Figma Gap" placeholder with real per-area visual detail and the frame node-ID reference map</name>
  <files>.planning/phases/02-core-product-loop/02-UI-SPEC.md</files>
  <action>
  Remove the existing "## Figma Gap" section's placeholder content (the section that tells the executor to go request frame links before building layout) and replace it with a new section — keep it at the same position in the document, retitled something like "## Figma Reference — Frame Map & Visual Detail" — containing:
  1. The Figma source identity: file key `vKQLNfdx7yKSzWvxhmkhg5` ("ZEPHYRA"), page `156:2` ("MACOST"), link `https://www.figma.com/design/vKQLNfdx7yKSzWvxhmkhg5/ZEPHYRA?node-id=156-2`.
  2. A per-area frame node-ID mapping table covering all 11 extracted frames, grouped under the 4 Phase 2 areas: **Dashboard** → `156:198` (Dashboard - MIS Overview); **Transactions** → `156:65` (Home / Add Transaction entry), `156:3` (Choose Input Method bottom sheet), `156:366` (Manual Transaction Form), `156:1526` (Transaction History); **Goals** → `156:430` (Goal List), `156:558` (Goal Detail), `156:713` (Create Goal Form), `156:824` (Goal Prioritization Settings), `156:1438` (Create First Goal / empty state); **Allocation modal** → `156:653` (Smart Allocation Suggestion) — and note `156:1646` (Pending Suggestions) as recommended OUT of the Allocation-modal scope per discrepancy #4 (see Open Questions section from Task 3), belonging instead to the F6 AI Assistant feature. Also list the frames noted as "not yet pulled in detail" from FIGMA-CONTEXT.md (`156:939` AI Financial Assistant, `156:1040` Upload Statement, `156:1192` Scan Receipt Flow, `156:1740` Profile & Settings, `156:1837` Manage Wallets, auth/onboarding frames `156:1211`/`156:1273`/`156:1283`/`156:1322`/`156:1365`, `170:537` alternate Dashboard exploration) as explicitly out of this phase's scope, for future reference only.
  3. One "Visual Layout" subsection per area, summarizing the real structure from FIGMA-CONTEXT.md's Per-Frame Findings in enough detail to build from without re-pulling Figma (header composition, card/list patterns, CTA placement/copy, component patterns like the SAW-rank-differentiated goal cards, the segmented Expense/Income toggle, the bottom-sheet input-method picker, etc.), while noting the node-IDs above are recorded precisely so any frame can be re-pulled for deeper pixel-level detail if needed. Cross-reference D-01/D-02 where the Manual Transaction Form frame confirms the "3 required fields + pre-filled date" contract still holds visually, and cross-reference D-05 where the Goal Prioritization Settings frame confirms the Quick Win/Importance First control is a top-level segmented toggle.
  4. Do not delete or restate the existing "## Interaction & State Contracts (Phase 2-specific)" section — that section remains the authoritative behavior/timing/state contract; this new section is purely the visual/structural layer.
  </action>
  <verify>
    <automated>grep -c "156:653" .planning/phases/02-core-product-loop/02-UI-SPEC.md; grep -c "156:198" .planning/phases/02-core-product-loop/02-UI-SPEC.md; grep -c "vKQLNfdx7yKSzWvxhmkhg5" .planning/phases/02-core-product-loop/02-UI-SPEC.md</automated>
  </verify>
  <done>02-UI-SPEC.md no longer tells the executor to go request Figma frame links before building layout — it now contains the Figma file/page identity, a complete per-area frame node-ID map for all 11 extracted frames (plus the not-yet-pulled list), and a concrete visual-layout summary per area (Dashboard, Transactions, Goals, Allocation modal) sourced from FIGMA-CONTEXT.md. The Interaction & State Contracts section is unchanged.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Add the 5 flagged discrepancies as an explicit unresolved "Open Questions" section</name>
  <files>.planning/phases/02-core-product-loop/02-UI-SPEC.md</files>
  <action>
  Add a new section, "## Open Questions / Flagged Discrepancies (Post-Figma-Extraction, 2026-07-06)", placed directly before "## Checker Sign-Off", listing all 5 items from FIGMA-CONTEXT.md's "Open Questions / Discrepancies" section as explicitly unresolved (each item must state the conflict and that it is NOT decided by this update, not adopt either side):
  1. Dashboard KPI order: Figma's `156:198` frame shows the Overspending Alert positioned first/top, while this spec's locked KPI order (from DASH-01/DASH-02 research) is (1) expense breakdown, (2) goal progress, (3) trend, (4) overspending alert, (5) balance — direct conflict, do not silently reorder; needs a team decision.
  2. SAW default weights shown in the Goal Prioritization Settings frame (`156:824`: Personal Importance 25%, Progress Gap 20%, Saving Capacity 20%, Urgency 15%, Target Amount 20%) versus the canonical CLAUDE.md/survey-n=62 weights (personal_importance 22.5%, progress_gap 21.9%, saving_capacity 21.5%, urgency 17.8%, target_amount 16.2%) — the Figma numbers are rounder placeholder values in the mockup; `backend/services/saw_engine.py` default weights remain the canonical values unless the user explicitly overrides them. Do not adopt the Figma numbers as real defaults.
  3. "Create First Goal" (`156:1438`) is a full dedicated onboarding page (icon badge, H1, inline form, "Skip for now" link) — this conflicts with D-06 in 02-CONTEXT.md, which specifies a lightweight, section-scoped empty state for "no goals yet." These may represent two different moments (first-ever app onboarding vs. a later empty Goals list) — flag for team confirmation; do not silently merge or pick one.
  4. "Pending Suggestions" (`156:1646`) appears to be an AI Assistant proactive-nudge feed (F6 feature), not Smart Allocation's pending-confirmations queue implied by the original 4-area scope — recommend narrowing "Allocation modal" scope to `156:653` only and treating `156:1646` as out-of-scope-for-now, pending team confirmation.
  5. The Transaction History frame (`156:1526`) shows its bottom-nav tab labeled "History" rather than matching the standard 5-tab set (Home/Dashboard/Goals/AI Assistant/Profile) seen in other frames — clarify whether Transaction History is its own nav destination or a pushed sub-page reached from Home; not resolved here.
  Also add a single addendum line directly under the existing "## Checker Sign-Off" heading (do not alter the existing checkbox lines) noting: this spec was updated 2026-07-06 (quick task 260706-jaq) with real Figma-sourced visual detail; the sign-off above reflects the pre-Figma-detail approval, and the 5 discrepancies above are pending team resolution before final execution of the affected areas.
  </action>
  <verify>
    <automated>grep -c "Open Questions / Flagged Discrepancies" .planning/phases/02-core-product-loop/02-UI-SPEC.md; grep -c "156:1646" .planning/phases/02-core-product-loop/02-UI-SPEC.md; grep -c "156:1438" .planning/phases/02-core-product-loop/02-UI-SPEC.md</automated>
  </verify>
  <done>02-UI-SPEC.md contains a dedicated "Open Questions / Flagged Discrepancies" section listing all 5 items from FIGMA-CONTEXT.md, each explicitly marked unresolved/pending team decision, plus an addendum note under Checker Sign-Off referencing this update. No existing checkbox or approval line was altered.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

This is a documentation-only update to a Markdown design-contract file (`02-UI-SPEC.md`). No source code, API surface, dependency, or trust boundary is touched.

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-02q-01 | N/A | .planning/phases/02-core-product-loop/02-UI-SPEC.md (docs only) | low | accept | No code executes as a result of this change; no new attack surface. Not applicable — documentation edit only. |
</threat_model>

<verification>
After all 3 tasks complete, confirm:
1. `.planning/phases/02-core-product-loop/02-UI-SPEC.md` contains no remaining instruction telling the executor to go request Figma frame links before building layout for the 4 areas (that placeholder framing has been replaced by real detail + node-ID references).
2. All 5 discrepancies from FIGMA-CONTEXT.md appear verbatim-equivalent in the new "Open Questions / Flagged Discrepancies" section, each explicitly unresolved.
3. The Figma file key (`vKQLNfdx7yKSzWvxhmkhg5`), page node (`156:2`), and all 11 frame node-IDs are present in the document.
4. The theme resolution note (Figma light theme now source of truth; built dark-themed pages stale, follow-up separate/out of scope) is present and unambiguous.
5. `git diff .planning/phases/02-core-product-loop/02-UI-SPEC.md` shows the "## Interaction & State Contracts (Phase 2-specific)" section, "## Copywriting Contract" table, and existing "## Checker Sign-Off" checkbox lines are unchanged (only an addendum line was added after the heading).
</verification>

<success_criteria>
- 02-UI-SPEC.md's Design System/Typography/Color/Spacing sections reflect the real Figma light-theme tokens (Inter, Bricolage Grotesque, `#fcfcfc` background, updated accent/destructive hex values), with a clear theme-resolution note.
- 02-UI-SPEC.md's former "Figma Gap" section is replaced with a Figma file/page/frame-ID reference map and real per-area visual-layout detail for Dashboard, Transactions, Goals, and the Allocation modal.
- All 5 Figma-vs-spec discrepancies are documented as an explicit, unresolved "Open Questions" section — none silently resolved.
- All existing locked interaction/state/copy/timing contracts (D-01–D-06, Copywriting Contract, Checker Sign-Off) remain intact, with only an addendum note added.
- No files outside `.planning/phases/02-core-product-loop/02-UI-SPEC.md` are modified.
</success_criteria>

<output>
Create `.planning/quick/260706-jaq-update-02-ui-spec-md-dengan-detail-visua/260706-jaq-SUMMARY.md` when done.
</output>
