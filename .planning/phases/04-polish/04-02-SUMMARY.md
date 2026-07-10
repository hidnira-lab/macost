---
phase: 04-polish
plan: 02
subsystem: ui
tags: [nextjs, react, pixel-art, static-assets, goals]

requires:
  - phase: 02-core-product-loop
    provides: "Goal entity with server-computed progress_pct (SAW-ranked)"
provides:
  - "GoalPixelArt reusable component (pixelArtState() helper + default render component)"
  - "5 placeholder growing-plant pixel-art PNG assets (0/25/50/75/100%)"
  - "Pixel-art sprite mounted on goal detail hero graphic (128px) and both goal-list card variants (48px)"
affects: [04-polish, post-mvp-visual-polish]

tech-stack:
  added: []
  patterns:
    - "Plain <img> with inline style={{ imageRendering: 'pixelated' }} for crisp static pixel-art scaling (no next/image, matches images.unoptimized: true already set repo-wide)"
    - "pixelArtState(progressPct) clamp-then-lookup helper — Math.min(Math.max(x,0),100) then pick highest of [0,25,50,75,100] <= clamped value"

key-files:
  created:
    - apps/web/components/GoalPixelArt.tsx
    - apps/web/public/pixel-art/goal-plant-0.png
    - apps/web/public/pixel-art/goal-plant-25.png
    - apps/web/public/pixel-art/goal-plant-50.png
    - apps/web/public/pixel-art/goal-plant-75.png
    - apps/web/public/pixel-art/goal-plant-100.png
  modified:
    - apps/web/app/goals/page.tsx
    - apps/web/app/goals/[id]/page.tsx

key-decisions:
  - "5 placeholder PNGs were procedurally generated with a small one-off Node script (zlib-only PNG encoder, no new npm dependency) rather than hand-drawn, since Claude cannot draw pixel art directly — this satisfies D-08's requirement that the feature be demoable today with a non-blocking cosmetic swap path for the team's final art (same file names/paths/64x64 dimensions)."
  - "Removed the now-unused Target icon import from goals/[id]/page.tsx after replacing its only usage with GoalPixelArt (kept Target import in goals/page.tsx since it's still used in the icon palette and empty state)."

patterns-established:
  - "Pattern: growth-state visual selection — clamp a percentage, then pick the highest of N fixed thresholds <= the clamped value. Reusable for any future fixed-state progress visualization."

requirements-completed: [VIS-01]

coverage:
  - id: D1
    description: "GoalPixelArt component exports pixelArtState() helper + default component matching the RESEARCH.md reference shape, with Bahasa Indonesia alt text per the UI-SPEC Copywriting Contract"
    requirement: "VIS-01"
    verification:
      - kind: other
        ref: "test -f apps/web/components/GoalPixelArt.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "5 placeholder 64x64 transparent PNG assets exist at the exact CONTEXT.md-specified path/naming (goal-plant-{0,25,50,75,100}.png)"
    requirement: "VIS-01"
    verification:
      - kind: other
        ref: "test -f apps/web/public/pixel-art/goal-plant-0.png && test -f apps/web/public/pixel-art/goal-plant-100.png"
        status: pass
      - kind: other
        ref: "node -e checked PNG signature + 64x64 IHDR dims for all 5 files"
        status: pass
    human_judgment: false
  - id: D3
    description: "Goal detail page hero graphic renders the 128px pixel-art sprite from live progress_pct (replacing the placeholder Target icon), goal list page renders the 48px thumbnail on both card variants (additive to existing icon/rank badges)"
    requirement: "VIS-01"
    verification:
      - kind: other
        ref: "grep -c GoalPixelArt apps/web/app/goals/page.tsx apps/web/app/goals/[id]/page.tsx (3 and 2 occurrences respectively)"
        status: pass
    human_judgment: false
  - id: D4
    description: "apps/web static export build remains clean (compiles + type-checks + generates static pages) after both mount points are wired"
    requirement: "VIS-01"
    verification:
      - kind: other
        ref: "npm run build (apps/web) — Turbopack compiled successfully, TypeScript finished with no errors, all 25 routes generated including /goals and /goals/[id]"
        status: pass
    human_judgment: false
  - id: D5
    description: "Sprite renders crisply (not blurry) at both 128px and 48px sizes in an actual rendered browser/Tauri view"
    rationale: "image-rendering: pixelated is applied and the build compiles, but actual visual crispness/legibility of the specific placeholder art at both sizes, and correctness across all progress boundaries (0/24/25/49/50/74/75/99/100/>100), is a rendered-pixel visual judgment call per 04-VALIDATION.md's manual-UAT-only strategy for this phase — no automated frontend test framework was introduced (D-11)."
    verification: []
    human_judgment: true

duration: 25min
completed: 2026-07-10
status: complete
---

# Phase 04 Plan 02: Pixel Art Goal Visualization Summary

**GoalPixelArt component + 5 procedurally-generated placeholder growing-plant sprites, mounted on the goal detail hero (128px) and both goal-list card variants (48px), reading live `progress_pct`.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-10T13:05:00Z (approx, from worktree setup)
- **Completed:** 2026-07-10T13:32:00Z
- **Tasks:** 2
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments
- `GoalPixelArt.tsx` — exports `pixelArtState(progressPct)` (clamp to [0,100], pick highest fixed state <=  value) and a default `GoalPixelArt({ progressPct, size })` component rendering a plain `<img>` with `image-rendering: pixelated`, sized 128px (`'detail'`) or 48px (`'card'`), with Indonesian alt text following the UI-SPEC formula (`"Progress goal: {state}% — tanaman {motif_label}"`).
- 5 placeholder 64×64 transparent PNGs at `apps/web/public/pixel-art/goal-plant-{0,25,50,75,100}.png` depicting the D-05 generic growing-plant motif (seed in soil -> sprout -> young plant -> flowering -> full/fruiting with a small sparkle detail), procedurally drawn via a one-off Node script (no new dependency) since hand-drawing isn't something Claude can do directly — satisfies D-08 (team swaps in final art later, same paths/names/dimensions, zero code change needed).
- Goal detail page (`apps/web/app/goals/[id]/page.tsx`): the Hero Graphic's placeholder `Target` icon is replaced with the live-data pixel-art sprite; gradient shell and overlay div untouched; the numeric `{goal.progress_pct}%` in the Progress Card below remains the single source of truth (not duplicated).
- Goal list page (`apps/web/app/goals/page.tsx`): both the Priority #1 Card and Standard Goal Card now show the 48px pixel-art thumbnail, stacked above their existing badge (`Prioritas #1` Sparkles badge / `#{goal.rank}` badge respectively) via a new `flex flex-col items-end gap-1` wrapper — purely additive, the existing icon-ring badge next to the goal name is untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: GoalPixelArt component + placeholder sprite assets** - `14b01c8` (feat)
2. **Task 2: Mount GoalPixelArt on goal detail and goal list pages** - `9a0b99b` (feat)

## Files Created/Modified
- `apps/web/components/GoalPixelArt.tsx` - New reusable component: `pixelArtState()` helper + default `GoalPixelArt` render component
- `apps/web/public/pixel-art/goal-plant-0.png` - Placeholder sprite: seed in soil, no green yet
- `apps/web/public/pixel-art/goal-plant-25.png` - Placeholder sprite: small sprout, 1-2 tiny leaves
- `apps/web/public/pixel-art/goal-plant-50.png` - Placeholder sprite: young plant, actively growing, no flowers/fruit
- `apps/web/public/pixel-art/goal-plant-75.png` - Placeholder sprite: flowering/budding, fuller foliage
- `apps/web/public/pixel-art/goal-plant-100.png` - Placeholder sprite: full/fruiting tree with ripe fruit + tiny sparkle detail
- `apps/web/app/goals/page.tsx` - Mounted 48px `GoalPixelArt` thumbnail on both Priority #1 Card and Standard Goal Card
- `apps/web/app/goals/[id]/page.tsx` - Replaced placeholder `Target` icon in Hero Graphic with 128px `GoalPixelArt`; removed now-unused `Target` import

## Decisions Made
- Generated the 5 placeholder PNGs with a small one-off Node script (raw zlib-based PNG encoder — no new npm dependency) instead of leaving them as blank/stub files, so VIS-01 is genuinely demoable end-to-end today rather than showing broken `<img>` tags. This is explicitly a placeholder per D-08; the team can drop in final hand-drawn art at the exact same paths/dimensions with zero code changes.
- Kept `Target` icon import in `goals/page.tsx` (still used elsewhere: icon palette + empty state) but removed it from `goals/[id]/page.tsx` where its only usage was replaced.

## Deviations from Plan

None - plan executed exactly as written. The plan's task actions did not prescribe exactly how to produce the 5 PNG files (team draws them manually per the broader phase D-08 decision, but this plan's own scope required them to exist for the feature to be demoable) — filling them with a procedural placeholder generator is a reasonable interpretation of "produces a concrete/functional placeholder for each of the 5 fixed growth-state stages... so the feature is visually complete and demoable today," not a deviation from the written task action.

## Issues Encountered
- This worktree had no `apps/web/node_modules` (worktrees don't share gitignored directories). A junction/symlink to the main repo's `node_modules` was tried first but rejected by Next.js 16's Turbopack ("Symlink [project]/node_modules is invalid, it points out of the filesystem root") — resolved by running a real `npm ci` inside the worktree (added `node_modules`, gitignored, not committed) so `npm run build` could execute and verify Task 2's acceptance criteria.

## User Setup Required

None - no external service configuration required. No new env vars, no Vercel/Railway/Supabase dashboard changes.

## Next Phase Readiness

VIS-01 is code-complete and build-verified. Two follow-ups are explicitly deferred to manual UAT per 04-VALIDATION.md (D-11 — no automated frontend test framework introduced this phase):
1. Visual crispness/legibility check of the placeholder sprites at both 128px and 48px in an actual browser and Tauri desktop build, across all progress boundaries (0/24/25/49/50/74/75/99/100/>100).
2. Final artwork swap by the team before the Expo demo — no code changes needed, same file paths/names/dimensions (D-08).

No blockers for 04-01 (offline sync) — this plan touched an entirely disjoint set of files (pure frontend, static assets, `apps/web/app/goals/**` and `apps/web/components/GoalPixelArt.tsx` only) and ran fully in parallel per the plan's stated zero-dependency design.

---
*Phase: 04-polish*
*Completed: 2026-07-10*
