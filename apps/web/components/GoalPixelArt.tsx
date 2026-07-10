/**
 * GoalPixelArt — VIS-01 pixel-art goal progress visualization.
 *
 * Renders one of 5 fixed-state pixel-art "growing plant" sprites
 * (0/25/50/75/100%) based on a goal's progress_pct. Same 5 PNG assets are
 * reused at two display sizes via CSS ('detail' = 128px, 'card' = 48px) —
 * no separate thumbnail asset set.
 *
 * NOTE (D-08, 04-CONTEXT.md): the 5 PNGs under
 * apps/web/public/pixel-art/goal-plant-{state}.png are Claude-produced
 * placeholders. The team replaces them with final hand-drawn art before the
 * Expo demo without touching this file or any code — same file names, paths,
 * and 64x64 dimensions — so that swap is a non-blocking cosmetic change, not
 * a re-implementation.
 */

const STATES = [0, 25, 50, 75, 100] as const

type PixelArtState = (typeof STATES)[number]

/** Bahasa Indonesia motif label per fixed state, per 04-UI-SPEC.md Copywriting Contract. */
const MOTIF_LABELS: Record<PixelArtState, string> = {
  0: 'biji',
  25: 'tunas',
  50: 'tanaman muda',
  75: 'tanaman berbunga',
  100: 'tanaman berbuah penuh',
}

/**
 * Clamps progressPct to [0, 100] (same convention as the existing progress-bar
 * width calculation, e.g. `Math.min(goal.progress_pct, 100)` in goals/page.tsx)
 * and picks the highest of the 5 fixed states that is <= the clamped value.
 */
export function pixelArtState(progressPct: number): PixelArtState {
  const clamped = Math.min(Math.max(progressPct, 0), 100)
  return [...STATES].reverse().find((s) => clamped >= s) ?? 0
}

interface GoalPixelArtProps {
  progressPct: number
  size: 'detail' | 'card'
}

export default function GoalPixelArt({ progressPct, size }: GoalPixelArtProps) {
  const state = pixelArtState(progressPct)
  const px = size === 'detail' ? 128 : 48

  return (
    <img
      src={`/pixel-art/goal-plant-${state}.png`}
      alt={`Progress goal: ${state}% — tanaman ${MOTIF_LABELS[state]}`}
      width={px}
      height={px}
      style={{
        imageRendering: 'pixelated',
        width: px,
        height: px,
      }}
    />
  )
}
