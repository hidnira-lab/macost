# Figma Design Context — Phase 2 (260706-jaq)

**Source:** Figma file `vKQLNfdx7yKSzWvxhmkhg5` ("ZEPHYRA"), page `156:2` ("MACOST"), link shared by user: https://www.figma.com/design/vKQLNfdx7yKSzWvxhmkhg5/ZEPHYRA?node-id=156-2
**Extracted:** 2026-07-06, via `mcp__plugin_figma_figma__get_design_context` / `get_screenshot`
**Resolved conflict (user confirmed 2026-07-06):** Figma is the source of truth. The dark theme (`bg-[#1e1e1e]`, Helvetica/Neulis) currently baked into `apps/web/app/{wallets,goals,(auth)}/*` is **wrong** and superseded by this design. These frames use a **light theme**. Updating the existing dark-themed pages to match is a separate follow-up, NOT part of this quick task's scope (scope is `02-UI-SPEC.md` only) — flag it back to the user as a known follow-up.

---

## Global Design Tokens (consistent across all 11 frames)

**Colors:**
- Background: `#fcfcfc` / `#ffffff` (light, near-white)
- Primary text: `#1e1e1e`
- Muted/secondary text: `rgba(30,30,30,0.65)`
- Borders: `rgba(30,30,30,0.15)`
- Subtle fills (icon chips, track backgrounds): `rgba(30,30,30,0.05)` to `rgba(30,30,30,0.08)`
- Accent orange (goals/priority/warnings-positive): `#ff8929` (gradient to `#ffb787` on progress fills)
- Accent blue (primary actions/links/active nav): `#298dff` (gradient to `#065fc5` on buttons/FABs, or to `#a8c8ff` on progress fills)
- Error/destructive (overspending alert): background `#ffdad6`, border `#ba1a1a`, text `#93000a`
- Category tint colors (icon chips): vary per category, applied as `rgba(<rgb>,0.1–0.2)` fill behind a solid-colored icon

**Typography:**
- Body/UI text: **Inter** — Regular (body), Medium (list item titles), Semi Bold (card titles, emphasis), Bold (labels, stat numbers, small caps like "REMAINING BUDGET")
- Brand wordmark ("Macost") and large page headings (H1, e.g. "Dashboard", "My Goals", "Rp 250.000" balance): **Bricolage Grotesque ExtraBold**, with `font-variation-settings: "opsz" 14, "wdth" 100`
- Type scale seen: 12px (labels/badges), 14px (secondary), 16px (body/card title), 18–20px (section headings), 24px (page H1), 28–32px (hero stat numbers)

**Component patterns:**
- Cards: `bg-white`, `border border-[rgba(30,30,30,0.15)]`, `rounded-xl` (12px) for standard cards, `rounded-3xl` (24px) for hero/priority cards, subtle shadow (`shadow-[0px_4px_4px_rgba(0,0,0,0.05)]` or similar)
- Progress bars: track `bg-[rgba(30,30,30,0.05)]`, `rounded-full`, height 8–12px; fill is a solid or gradient color matching the item's accent, also `rounded-full`
- Icon chips: circular or rounded-square (8–16px radius) tinted background at ~10–20% opacity of the icon's accent color, icon centered
- Buttons (primary): `bg-gradient` blue (`#298dff` → `#065fc5`) or dark (`#1e1e1e` → `#3e3e3e`) with white text, `rounded-full` or `rounded-xl`, drop shadow
- Bottom nav: 5 items — Home, Dashboard, Goals, AI Assistant, Profile — fixed bottom bar `bg-[#fcfcfc]`, active item shown as a filled blue (`#298dff`) pill/circle around the icon+label
- Top app bar: `backdrop-blur` + `bg-[rgba(252,252,252,0.8)]`, sticky, shows avatar/logo/notification bell
- FAB: circular or rounded-square, blue gradient, bottom-right, used for "Add Transaction" and "Add Goal"

---

## Per-Frame Findings

### Dashboard — `156:198` "Dashboard - MIS Overview" (full design context pulled)
- Header: avatar + "Dashboard" H1 + period filter pill ("This Month" dropdown) + bell icon
- Overspending Alert banner (red/pink, dismissible) — matches D-0x alert requirement
- Expense Breakdown: donut chart (visual only, no real chart lib seen — likely custom SVG/CSS in Figma) + total in center ("Rp 2.4M / TOTAL") + legend rows (icon chip, label, %) per category
- Goal Progress: stacked cards per active goal (icon chip, name, %, progress bar) — order matches `02-UI-SPEC.md` locked KPI order (expense breakdown → goal progress → trend → alert is ABOVE not below in this frame — **note:** alert appears at TOP here, not 4th; flag as a discrepancy per UI-SPEC's own instruction to report Figma order conflicts rather than silently reorder)
- Trend (Last 4 Mo): grouped bar chart (In/Out per month), legend at bottom
- Available Balance: low-visual-weight centered text at the very bottom (muted color, not a card)
- Bottom nav present; Dashboard tab active

### Home / Add Transaction entry — `156:65` "Home - Add Transaction" (full design context pulled)
- This is the **Home tab**, distinct from Dashboard tab — shows "Remaining Budget" hero stat (Bricolage Grotesque, 32px), then a 2-up bento of quick actions: "Add Transaction" (dark gradient card) and "Scan Receipt" (light card) — this is the entry point into `156:3` "Choose Input Method" bottom sheet
- Active Goals: horizontal-scroll goal cards (icon, name, %, progress bar, soft gradient corner accent)
- Recent: vertical list of last transactions (icon chip, merchant name, category, signed amount in Rupiah)
- Large circular FAB (blue gradient) bottom-right for quick-add, in addition to the bento "Add" tile

### Choose Input Method — `156:3` (seen via page-overview screenshot only)
- Bottom sheet modal over a dimmed/blurred home background
- Header: "Add Transaction" + close (X)
- "Input Options (Bento-inspired list)" — vertical stack of large tappable rows, first being "Manual Input" (icon + label) — implies Manual/Scan/Upload as parallel entry options in one sheet, matching FR-002/003 dual-path requirement

### Manual Transaction Form — `156:366` "Manual Transaction Form" (screenshot)
- Header: back arrow + "New Transaction" title (centered, blue)
- Expense/Income segmented toggle (pill, active = solid blue "Expense", inactive = grey "Income") — this is the ONLY place `tipe_transaksi` is chosen; CLAUDE.md's "≤3 required fields" (nominal/kategori/dompet) constraint should still hold — Category/Date/Note are the only other fields
- Amount: large card, "Rp" prefix + big placeholder "0" (numeric keypad style input, not a plain text field)
- Category: select/dropdown row ("Select Category" + chevron)
- Date: text input pre-filled `06/29/2026` (confirms D-01/D-02 today-default behavior)
- Note (Optional): multi-line textarea, placeholder "What was this for?"
- Primary CTA: full-width gradient blue "Save Transaction" button, sticky at bottom

### Transaction History — `156:1526` "Transaction History" (screenshot)
- Header: avatar + "Macost" wordmark + bell
- Search bar ("Search transactions...") + filter icon button (sliders icon) alongside
- Grouped by relative date section headers in small caps muted text: "TODAY", "YESTERDAY"
- Each row: icon chip (category-tinted), merchant name (bold), category (muted, small), amount (colored: red/`-` for expense, blue/`+` for income) + time (muted, right-aligned under amount)
- Bottom nav: "History" tab active (blue pill) — note this frame's nav labels the 3rd tab "History" instead of "Goals" position seen elsewhere; likely this is accessed as a sub-page under Home, not a 6th nav item — flag as open question for executor (is Transaction History its own nav destination or pushed from Home?)

### Goal List — `156:430` "Goal List" (full design context pulled)
- Header: "My Goals" H1 (Bricolage Grotesque blue) + avatar (blue circle) + bell
- Summary/Hero row: "Total Savings Goal" (Rp 23.500.000) left, "On Track" + "3 Active" pill right, bottom-border divider
- Goals Grid: Priority #1 gets a distinct larger "Goal Card 1: Top Priority" treatment — `rounded-3xl` (24px), soft orange gradient corner blob, "Priority #1" solid-orange pill badge, larger fonts (20px name) — visually distinguishes SAW rank #1 from the rest
- Goal Card 2+: standard `rounded-xl` cards, small `#2`/`#3` rank badge (grey pill, top-right), icon chip top-left, name + amount/target inline text, thin progress bar with gradient fill + % label
- FAB: blue gradient rounded-square, bottom-right, "+" icon for "Add Goal"
- Bottom nav: Goals tab active

### Goal Detail — `156:558` "Goal Detail" (screenshot)
- Header: back arrow + goal name ("New Laptop") title
- Large pixel-art hero image (orange plant-in-pot illustration) — confirms CLAUDE.md's "minimal pixel-art visual style" for goal imagery
- Stat card: "CURRENT PROGRESS" big % (blue, 32px+) + small circular target icon top-right, progress bar, then "COLLECTED" / "TARGET" two-column stat row, "DEADLINE" row with calendar icon
- "Allocation History" section: list of past allocations (icon, "Manual saving"/"Auto-roundup" label + date, signed amount in orange)
- Footer actions: circular "Edit" (pencil) and "Delete" (trash, red) icon buttons, centered

### Create Goal Form — `156:713` "Create Goal Form" (screenshot)
- Header: back arrow + "Create New Goal" + overflow menu (⋮)
- "Quick Start" row: horizontal template chips (Emergency Fund, Vacation, Health..., icon + label) — pre-fills the form
- Form fields: Goal Name (text), Target Amount (Rp-prefixed numeric), Deadline (date picker w/ calendar icon)
- "How important is this to you?" — slider 1–5 with labels "Nice to have" (1) ↔ "Critical" (5), current value shown as a number (blue) top-right — this is the `personal_importance` SAW input (skor_kepentingan)
- CTA: full-width gradient blue "+ Create Goal" button

### Goal Prioritization Settings — `156:824` "Goal Prioritization Settings" (screenshot)
- Header: back arrow + "Prioritization" + help (?) icon
- Strategy toggle: segmented control "Quick Win" / "Importance First" (pill, active = solid blue) — this is the FR-014 strategy toggle referenced as an open question in CONTEXT.md/DISCUSSION-LOG; **now resolved by this frame**: it's a top-level 2-option segmented control, sits directly below the header, above the weight sliders
- "Total Weight Distribution" — big "100%" readout + a single horizontal multi-segment bar (color-coded per criterion, segment width = weight %) directly below
- 5 weight sliders, one per SAW criterion, each in its own card: colored dot + label + %, slider track — **order and default % shown:** Personal Importance 25% (blue dot), Progress Gap 20% (orange dot), Saving Capacity 20% (dark/navy dot), Urgency 15% (red dot), Target Amount 20% (light blue dot)
  - ⚠️ **Discrepancy vs CLAUDE.md canonical weights** (personal_importance 22.5%, progress_gap 21.9%, saving_capacity 21.5%, urgency 17.8%, target_amount 16.2%, from survey n=62): the Figma frame shows rounder placeholder numbers (25/20/20/15/20) that sum to 100 but don't match the locked research-backed defaults. **Do not silently adopt the Figma numbers as the real defaults** — treat this as illustrative/placeholder in the mockup; the backend `saw_engine.py` default weights remain the CLAUDE.md canonical values unless the user explicitly says otherwise. Flag this explicitly in the spec.
- CTA: full-width solid blue "Apply Weights" button
- Bottom nav: Goals tab active

### Create First Goal (empty state) — `156:1438` "Create First Goal" (screenshot)
- Full-page onboarding-style empty state (not a lightweight inline message!) — icon badge, "Set Your First Goal" H1 (blue, bold), subtitle "Let's build a habit of saving. What are you aiming for?"
- Inline form directly on this screen: Goal Name, Target Amount, Target Date, "Importance" slider (1–5, label "Nice to have"/"Important"/"Critical", current selection shown as text e.g. "High Priority" in orange)
- Primary CTA: "Create Goal →", plus a secondary text-only "Skip for now" link below
- ⚠️ **Note:** this contradicts D-06 in `02-CONTEXT.md` which specifies a **lightweight, section-scoped** empty state (not a full illustrated page) for "no goals yet". This frame is a full dedicated onboarding page. Flag as a discrepancy for the team to resolve — likely this "Create First Goal" frame is for first-time app onboarding (before any goal exists at all, possibly pre-Dashboard), while D-06's lightweight empty state applies to the Goals *list page* itself when filtered/emptied later. Do not silently merge the two.

### Smart Allocation Suggestion (modal) — `156:653` "Smart Allocation Suggestion" (screenshot)
- This IS the FR-0xx suggest-and-confirm modal — matches spec intent exactly
- Presented as a bottom-anchored card modal over a dimmed background, rounded-3xl top corners, sparkle icon badge in a blue gradient header band
- Copy: "Smart Allocation" H2, body text inline-composing the amounts: "Your side income of **Rp 500.000** just came in! We suggest allocating **Rp 175.000 (35%)** to your **New Laptop** goal — it's your top priority right now."
- Mini goal-progress preview: icon, goal name + "Priority 1" badge, progress bar (before/after allocation implied by the blue fill), current amount + delta ("+ Rp 175K")
- 3 actions stacked: "Confirm Allocation" (solid blue, primary), "Change Amount" (outline/secondary), "Not Now" (text-only, tertiary) — confirms the never-auto-execute, always 3-way choice pattern

### Pending Suggestions — `156:1646` "Pending Suggestions" (screenshot)
- ⚠️ **Naming mismatch — flag to user/team, do not assume scope:** despite the frame name, this is NOT a queue of pending Smart Allocation confirmations. It's an **AI Assistant proactive nudge feed** — greeting ("Hey there! 👋") + cards like "Skip the afternoon Boba?", "Ride-share savings", "Weekend Leftovers", each with a detected pattern description, an amount, and a "Review"/"Review Suggestion" button; footer link "Dismiss all suggestions". Bottom nav has "Assistant" tab active.
- This looks like it belongs to the **F6 AI Financial Assistant** feature (behavioral nudges) rather than the Allocation modal/pending area from the original 4-area gap. Recommend the executor keep the Smart Allocation "Allocation modal" section scoped to `156:653` only, and separately note `156:1646` + `156:939` (AI Financial Assistant, not yet pulled in detail) as out-of-scope-for-now / a separate Phase (F6), unless user says otherwise.

---

## Open Questions / Discrepancies to surface in 02-UI-SPEC.md (do not resolve silently)

1. **Dashboard KPI order**: Figma shows Overspending Alert ABOVE Expense Breakdown (i.e., alert is 1st), but `02-UI-SPEC.md`/RESEARCH.md lock the order as (1) expense breakdown (2) goal progress (3) trend (4) overspending alert (5) balance. This is a direct conflict the UI-SPEC itself said to flag rather than silently reorder.
2. **SAW default weights shown in Figma (25/20/20/15/20) vs canonical CLAUDE.md weights (22.5/21.9/21.5/17.8/16.2)** — keep canonical values as the real default; Figma numbers are visual placeholders only.
3. **"Create First Goal" is a full onboarding page**, not the lightweight section-scoped empty state D-06 describes — likely two different moments (first-ever app use vs. later empty list), needs team confirmation.
4. **"Pending Suggestions" (156:1646) appears to be AI Assistant nudges, not Smart Allocation's pending queue** — likely mis-scoped in the original 4-area Figma Gap list; recommend narrowing "Allocation modal" scope to `156:653` only.
5. **Transaction History bottom-nav tab labeled "History"** in that frame vs. the standard 5-tab set (Home/Dashboard/Goals/AI Assistant/Profile) seen elsewhere — clarify whether History is its own nav destination or a pushed sub-page of Home.

## Frames NOT yet pulled in detail (out of original 4-area scope, noted for completeness)
- `156:939` AI Financial Assistant, `156:1040` Upload Statement, `156:1192` Scan Receipt Flow, `156:1740` Profile & Settings, `156:1837` Manage Wallets (already has a live page), Auth/Onboarding frames (`156:1211`, `156:1273`, `156:1283`, `156:1322`, `156:1365`), `170:537` Dashboard-tika (alternate/duplicate dashboard exploration — not pulled, may be an earlier iteration of `156:198`).
