# Figma Design Context — Round 2 (user-directed follow-up, 260706-jaq)

**Source:** Figma file `vKQLNfdx7yKSzWvxhmkhg5` ("ZEPHYRA"), page `156:2` ("MACOST")
**Extracted:** 2026-07-06, via `mcp__plugin_figma_figma__get_design_context` for all 8 frames listed below (full design context this time, not just screenshots — supersedes the screenshot-only pulls for Transaction History, Goal Detail, Create Goal Form, Smart Allocation Modal, Pending Suggestions from the first round).

This round has **explicit user resolutions** for the 4 items below — these are decisions, not open questions anymore. Apply them as hard constraints when updating `02-UI-SPEC.md`:

1. **Dashboard KPI order stays exactly as RESEARCH.md locks it:** (1) expense breakdown → (2) goal progress → (3) monthly trend → (4) overspending alert → (5) total balance. Figma's `156:198` frame visually places the Overspending Alert banner near the top (right after the header, before Expense Breakdown) — **this Figma placement is explicitly overridden by the user.** Document the visual card/token styling for the Overspending Alert component from Figma, but the *page-level ordering* of the 5 KPI sections must follow RESEARCH.md's locked sequence, not the frame's literal layout.
2. **SAW default weights stay at the canonical survey n=62 values:** `personal_importance` 22.5%, `progress_gap` 21.9%, `saving_capacity` 21.5%, `urgency` 17.8%, `target_amount` 16.2%. (Not in this round's 8 frames, but reconfirming per user: the Figma "Goal Prioritization Settings" frame from round 1 showed illustrative placeholder numbers 25/20/20/15/20 — those remain non-canonical/illustrative only.)
3. **Smart Allocation is suggest-and-confirm, never auto-execute.** Frame `156:653` already matches this exactly (3 actions: Confirm Allocation / Change Amount / Not Now) — no conflict here, just confirming intent going into the spec.
4. **Pending Suggestions must be the Smart Allocation confirmation queue, NOT the AI Assistant nudge feed.** Frame `156:1646` (read in full this round) is unambiguously an AI Assistant proactive-nudge feed — greeting "Hey there! 👋", bottom nav "Assistant" tab active, cards like "Skip the afternoon Boba?" / "Ride-share savings" / "Weekend Leftovers" with "Review"/"Review Suggestion" buttons. **Per user instruction, this frame's actual copy/purpose does NOT apply to the "Pending Suggestions" page in the UI-SPEC.** Instead:
   - The Pending Suggestions page (per PRD/CONTEXT.md) is a list of **queued Smart Allocation confirmations** — each item represents a side-income event awaiting the user's confirm/change/dismiss decision (same 3-way choice as the `156:653` modal, just listed instead of shown as a single modal).
   - **What IS reusable from `156:1646`:** the card layout pattern (icon chip + title + description + amount + pill-shaped action button, list of cards, "Dismiss all" text link at the bottom) is a good structural fit for a list of pending items — reuse this layout shape.
   - **What must be replaced:** the copy/content semantics. Each card should show: goal name (not a spending-nudge description), suggested amount + % of the triggering side income, and a "Review"/"Confirm" action that opens the Smart Allocation modal (`156:653`) for that item (or expands inline) — not "Review Suggestion" for a spending pattern.
   - Document this explicitly in the spec as a **resolved design decision** (not an open question): "Pending Suggestions" borrows 156:1646's visual card pattern but not its content/purpose.

## New discrepancy found this round (flag in spec, do not silently resolve)

**Two distinct color-token sets exist across the 8 frames pulled** — likely two design iterations/passes in the same Figma file:

- **Palette A (majority — 6 of 8 frames: Dashboard `156:198`, Home/Add-Transaction `156:65`, Goal List `156:430`, Goal Detail `156:558`, Create Goal Form `156:713`, Smart Allocation Modal `156:653`):**
  - Text: `#1e1e1e` (primary), `rgba(30,30,30,0.65)` (muted), `rgba(30,30,30,0.35)` (placeholder/disabled)
  - Blue accent: `#298dff` (gradient to `#065fc5` on buttons, `#a8c8ff` on progress fills)
  - Orange accent: `#ff8929` (gradient to `#ffb787`)
  - Background: `#fcfcfc` / white
  - Borders: `rgba(30,30,30,0.15)`
  - Headings/wordmark: **Bricolage Grotesque ExtraBold**

- **Palette B (minority — 2 of 8 frames: Transaction History `156:1526`, Pending Suggestions `156:1646`):**
  - Text: `#1b1b1c` (primary), `#414753` (secondary), `#717785` (tertiary/muted), `#c0c6d6` (placeholder/faint)
  - Blue accent: `#005bb0` (headings/amounts) and `#0074dc` (buttons/active nav — visibly different hex from Palette A's `#298dff`)
  - Background: `#fcf9f8` (warmer off-white vs Palette A's cooler `#fcfcfc`)
  - Borders: `#e5e2e1`, card fill `#f6f3f2`
  - Bottom nav active pill: `#0074dc` (vs Palette A's `#298dff`)
  - Destructive/red for expense amounts: `#ba1a1a` (same in both palettes)
  - Headings/wordmark: Bricolage Grotesque (ExtraBold on Transaction History, plain Regular weight on Pending Suggestions — inconsistent even within Palette B)

**Recommendation to record in the spec:** Treat **Palette A as canonical** (used in 6/8 frames including the two most structurally central screens, Dashboard and Goal List) and flag Palette B (`156:1526`, `156:1646`) as a **stale/earlier iteration that should be normalized to Palette A tokens during implementation** — e.g. build Transaction History using `#1e1e1e`/`#298dff`/`#fcfcfc`/`rgba(30,30,30,0.15)` instead of the `#1b1b1c`/`#005bb0`/`#fcf9f8`/`#e5e2e1` seen in that specific frame. This must be an explicit flagged note, not a silent substitution — the team should confirm, but defaulting to the majority palette is the sane default per the user's general instruction that Figma is ground truth (the majority-palette frames represent the more current pass).

---

## Per-Frame Detail (all 8, full design context)

### 1. Transaction Form (user's label) → `156:65` "Home - Add Transaction" (already fully captured round 1, see FIGMA-CONTEXT.md — this is the Home tab entry point with Remaining Budget hero + Add/Scan bento tiles + Active Goals carousel + Recent list, NOT the standalone Manual Transaction Form which is `156:366` seen only as screenshot). No new extraction needed; reuse round-1 findings.

### 2. Transaction History → `156:1526` (full context, NEW this round)
- Palette B (see above) — flag for normalization to Palette A
- Search bar: white input, `border-[#e5e2e1]`, rounded-8px, search icon left-inset, placeholder "Search transactions..." in `#c0c6d6`
- Filter button: square `48x48`, `bg-[#f6f3f2]`, rounded-8px, sliders icon
- Date group headers: small-caps bold `#c0c6d6`, 12px, tracked — "TODAY", "YESTERDAY"
- Transaction card group: cards grouped in ONE bordered container per date (`border-[#f6f3f2]`, rounded-12px), rows divided by thin `border-b border-[#f6f3f2]` — not individually-boxed cards like other lists
- Row anatomy: circular icon chip (tinted per category, e.g. `#ffdcc7` food, `#d5e3ff` transport, `#e8f5e9` income/allowance, `#ffdad6` snacks/other) + merchant/title (semibold 16px `#1b1b1c`) + category (14px `#414753`) on the left; amount (semibold 16px, `#ba1a1a` for expense "- Rp X", `#005bb0` for income "+ Rp X") + time (14px `#717785`) right-aligned
- Bottom nav labeled tab is **"History"** (confirmed — this frame's nav explicitly reads "History", 3rd position, active `#0074dc` pill) — resolves round-1 open question #5: History IS its own bottom-nav destination in this Figma pass, not a pushed sub-page. (Apply Palette A's `#298dff` for the active pill per the normalization recommendation.)

### 3. Dashboard → `156:198` (already fully captured round 1, see FIGMA-CONTEXT.md). Reconfirm: Overspending Alert visually sits directly below the header/period-filter and ABOVE Expense Breakdown in this frame — per user's constraint #1 above, the spec's KPI ORDER stays per RESEARCH.md regardless; only the alert's own card styling (red/pink `#ffdad6` bg, `#ba1a1a` border, `#93000a` text, dismiss X button) should be pulled from this frame.

### 4. Goal List → `156:430` (already fully captured round 1, see FIGMA-CONTEXT.md — Priority #1 gets the distinct rounded-3xl hero-card treatment, #2/#3 get standard compact cards with rank badge).

### 5. Goal Detail → `156:558` (full context, NEW this round)
- Palette A confirmed here too (`#1e1e1e`, `#298dff`, `#ff8929`, `#fcfcfc`, `rgba(30,30,30,0.15)` borders) — consistent with Dashboard/Goals
- Hero graphic: 256px tall, rounded-12px, orange gradient (`#ffb787` → `#ff8929`) at 80% opacity with a `mix-blend-overlay` pixel-art image on top (confirms "minimal pixel-art visual style" per CLAUDE.md) — large shadow (`0px_10px_15px_-3px_rgba(0,0,0,0.1)`)
- Progress Card: "CURRENT PROGRESS" label (12px bold uppercase muted) + big "65%" stat in **Bricolage Grotesque ExtraBold, 32px, `#298dff`** + circular icon badge top-right (`rgba(255,137,41,0.2)` bg); progress bar (orange gradient `#ffb787`→`#ff8929`, 12px height, rounded-full); below a `border-t` divider, a 2-col stats grid: COLLECTED / TARGET (16px semibold `#1e1e1e`), then full-width DEADLINE row with calendar icon
- Allocation History: section heading "Allocation History" (20px semibold) + list of individually-boxed cards (`rounded-8px`, not grouped like Transaction History) — icon chip (orange-tinted `rgba(250,179,135,0.2)` for manual saving, blue-tinted `rgba(41,141,255,0.1)` for auto-roundup) + date (16px medium) + type label (14px muted) left; signed amount in `#ff8929` (`+Rp X`) right
- Footer actions: centered row, "Edit" (grey circular bg `rgba(30,30,30,0.05)`, pencil icon, 12px bold label below) and "Delete" (red-tinted circular bg `rgba(255,218,214,0.5)`, trash icon, `#ba1a1a` 12px bold label below) — both icon-button-with-caption style, NOT text buttons
- Header: back arrow + goal name as page title (Bricolage Grotesque ExtraBold, `#298dff`, centered)

### 6. Buat/Edit Goal → `156:713` "Create Goal Form" (full context, NEW this round)
- Palette A confirmed
- Header: back arrow + "Create New Goal" (Bricolage Grotesque ExtraBold `#298dff`) + overflow-menu (⋮) button, right-aligned
- Quick Start section: "Quick Start" label (20px semibold) + horizontal-scroll row of template chip cards (128px wide, rounded-12px, white bg, border `rgba(30,30,30,0.15)`): circular icon badge (tinted per template — Emergency Fund `#ffdad6`, Vacation `rgba(41,141,255,0.2)`, Health `rgba(255,137,41,0.14)`, Laptop/Gadget `rgba(41,141,255,0.14)`) + label (14px semibold, centered, up to 2 lines)
- Form Section (single bordered card, rounded-12px, padded 25px):
  - Goal Name: label (14px semibold) + text input (border `rgba(30,30,30,0.15)`, rounded-8px, placeholder "e.g., Bali Trip 2024" at `rgba(30,30,30,0.35)`)
  - Target Amount: label + input with fixed "Rp" prefix (16px semibold, left-inset) and placeholder "10,000,000" right of it
  - Deadline: label + date input styled as 3-segment placeholder "mm / dd / yyyy" (each segment separately spaced) + calendar icon button right-inset
  - Importance slider: label "How important is this to you?" (14px semibold) + current value readout (bold, `#298dff`, right-aligned, e.g. "3") + horizontal slider track (`rgba(30,30,30,0.08)`, 8px height, rounded) + tick numbers 1-5 below (12px bold, `rgba(30,30,30,0.35)`) + endpoint labels "Nice to have" / "Critical" (10px, `rgba(30,30,30,0.65)`)
- CTA: full-width gradient button (`#298dff`→`#065fc5`), rounded-12px, "+" icon + "Create Goal" label (20px semibold white), drop shadow `0px_12px_24px_-8px_rgba(0,91,176,0.3)`
- Note: this frame suppresses the BottomNavBar (contextual/departure header pattern) — confirms Create/Edit Goal is a pushed full-screen flow, not a tab-nav destination

### 7. Smart Allocation Modal → `156:653` (full context, NEW this round — supersedes round-1 screenshot-only read)
- Palette A confirmed
- Structure: dimmed+blurred simulated home-screen background (`bg-[rgba(30,30,30,0.2)]` overlay, `backdrop-blur-[1px]`) behind a centered modal card
- Modal card: `max-w-[384px]`, `rounded-24px`, `bg-[rgba(252,252,252,0.85)]` with `backdrop-blur-[12px]` (frosted-glass effect), large shadow
- Header illustration band: 128px tall, `bg-[rgba(41,141,255,0.2)]`, two blurred decorative circle shapes (blue + navy-grey, `blur-[20px]`) + centered white circular badge with a sparkle/stars icon
- Content: "Smart Allocation" heading (Bricolage Grotesque ExtraBold, 24px, centered) + body copy composed of mixed-weight inline spans — muted regular text interspersed with bold/semibold emphasis on amounts and the goal name (exact composition: "Your side income of **Rp 500.000** just came in! We suggest allocating **Rp 175.000 (35%)** to your **New Laptop** goal — it's your top priority right now.")
- Mini progress-bar context card: bordered white card (`rounded-12px`) showing goal name + "Priority 1" badge (12px bold blue) on top row, then a progress bar split into "Current Progress" segment (`rgba(30,30,30,0.22)`, dark grey — i.e. the EXISTING saved amount) followed by "Suggested Addition" segment (`#298dff` solid — the proposed allocation, visually distinct from current progress), then a bottom row showing current amount ("Rp 3.5M") left and the delta ("+ Rp 175K", blue) right
- Actions (exactly 3, stacked, matches suggest-and-confirm contract): "Confirm Allocation" (solid `#298dff` pill, white text, primary), "Change Amount" (outlined pill, `#1e1e1e` text, secondary), "Not Now" (plain text link, muted, tertiary, no border/bg)

### 8. Pending Suggestions → `156:1646` (full context, NEW this round — content does NOT apply per user's constraint #4 above, but layout pattern is reusable)
- Palette B (see discrepancy note above — flag for normalization to Palette A if reused for the real Pending-Suggestions-as-Smart-Allocation-queue page)
- Greeting header: "Hey there! 👋" (24px bold) + 3-line supporting copy (16px, `#414753`)
- List of suggestion cards, two visual variants:
  - **High-priority card** (first item): has a decorative orange corner-blob overlay (`rgba(255,137,41,0.2)`, top-right, rounded-bl-full), circular icon chip, title (20px semibold), 3-line description (14px muted), then a bottom row with the amount (16px semibold, blue) left and a solid-orange pill CTA ("Review Suggestion", 12px bold dark-brown text `#642f00` for contrast) right
  - **Standard cards** (subsequent items): plain bordered white card (no corner blob), same icon-chip + title + description + amount pattern, but CTA pill is solid blue (`#0074dc` in this frame — normalize to `#298dff`) with white text, shorter label ("Review")
- Footer: centered "Dismiss all suggestions" text link (14px, muted, `border-b` underline-style via border not text-decoration)
- **For the actual Pending Suggestions (Smart Allocation queue) page:** reuse this exact card/list/dismiss-all shape, but each card's content should be: icon (goal icon, not activity icon) + goal name (title) + a short line like "Rp 175.000 (35%) dari side income baru" (description) + amount + "Review"/"Konfirmasi" pill button that opens the `156:653` modal for that specific queued item.

---

## Files this feeds into
- `.planning/quick/260706-jaq-update-02-ui-spec-md-dengan-detail-visua/260706-jaq-FIGMA-CONTEXT.md` (round 1 — Dashboard, Home, Goal List detail + global tokens + 5 original open questions, 4 of which are now resolved by user instruction above)
- This file (round 2) — supersedes round 1's open questions #1, #2, #4 with explicit resolutions; adds the new Palette A/B discrepancy; adds full per-frame detail for the 5 frames round 1 only screenshotted.
- Round-1 open question #3 (Create First Goal vs D-06 lightweight empty state) and #5 (History nav ambiguity) — #5 is now RESOLVED (History is its own bottom-nav tab, confirmed above). #3 remains open — not addressed by this round's instructions, keep flagged as-is.
