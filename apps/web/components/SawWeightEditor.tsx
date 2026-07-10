'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { apiMutate } from '@/lib/api/client'
import type { Goal, GoalSettingsWeights, GoalSettingsPreviewResponse } from '@/lib/api/types'
import goalSettingsPreviewMock from '@/mocks/goal-settings-preview.json'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Locked n=62 research defaults — must stay in sync with
 * backend/services/goal_settings_service.py DEFAULT_WEIGHTS.
 */
const DEFAULT_WEIGHTS: GoalSettingsWeights = {
  personal_importance: 0.225,
  progress_gap: 0.219,
  saving_capacity: 0.215,
  urgency: 0.178,
  target_amount: 0.162,
}

const TOLERANCE = 0.002

const CRITERIA_LABELS: { key: keyof GoalSettingsWeights; label: string; color: string }[] = [
  { key: 'personal_importance', label: 'Personal Importance', color: '#005BB0' },
  { key: 'progress_gap',        label: 'Progress Gap',        color: '#298dff' },
  { key: 'saving_capacity',     label: 'Saving Capacity',     color: '#10b981' },
  { key: 'urgency',             label: 'Urgency',             color: '#ff8929' },
  { key: 'target_amount',       label: 'Target Amount',       color: '#a855f7' },
]

const USE_MOCK =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('mock') ??
      process.env.NEXT_PUBLIC_USE_MOCK === 'true'
    : process.env.NEXT_PUBLIC_USE_MOCK === 'true'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(dec: number): string {
  return (dec * 100).toFixed(1)
}

function parsePct(str: string): number {
  const cleaned = str.replace(/[^0-9.,]/g, '').replace(',', '.')
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : val / 100
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SawWeightEditorProps {
  initialWeights: GoalSettingsWeights
  initialStrategy: string
  onSave: (strategy: string, weights: GoalSettingsWeights) => Promise<void>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SawWeightEditor({
  initialWeights,
  initialStrategy,
  onSave,
}: SawWeightEditorProps) {
  const [weights, setWeights] = useState<GoalSettingsWeights>(initialWeights)
  const [strategy, setStrategy] = useState<string>(initialStrategy)
  const [previewGoals, setPreviewGoals] = useState<Goal[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Computed ──────────────────────────────────────────────────────────
  const sum = Object.values(weights).reduce((a, b) => a + b, 0)
  const sumPct = (sum * 100).toFixed(2)
  const sumInTolerance = Math.abs(sum - 1.0) < TOLERANCE

  // ── Update single weight ──────────────────────────────────────────────
  const updateWeight = useCallback((key: keyof GoalSettingsWeights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }))
  }, [])

  // ── Debounced preview fetch ───────────────────────────────────────────
  const fetchPreview = useCallback(async (w: GoalSettingsWeights, s: string) => {
    if (USE_MOCK) {
      setPreviewGoals((goalSettingsPreviewMock as GoalSettingsPreviewResponse).goals)
      return
    }
    setPreviewLoading(true)
    try {
      const res = await apiMutate<GoalSettingsPreviewResponse>(
        '/api/goal-settings/preview',
        'POST',
        { strategy: s, weights: w }
      )
      setPreviewGoals(res.goals)
    } catch {
      // Silently fail — preview is non-critical
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPreview(weights, strategy)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [weights, strategy, fetchPreview])

  // ── Reset ─────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setWeights(DEFAULT_WEIGHTS)
    setShowResetConfirm(false)
  }, [])

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!sumInTolerance) return
    setSaving(true)
    setSaveMessage(null)
    try {
      await onSave(strategy, weights)
      setSaveMessage('Bobot berhasil disimpan!')
    } catch {
      setSaveMessage('Gagal menyimpan bobot. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }, [strategy, weights, sumInTolerance, onSave])

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* ── Strategy Toggle ──────────────────────────────────────────── */}
      <div
        className="flex rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-1 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
        style={{ backgroundColor: '#ffffff' }}
      >
        {['quick_win', 'importance_first'].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setStrategy(opt)}
            className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: strategy === opt ? '#005BB0' : 'transparent',
              color: strategy === opt ? '#ffffff' : 'rgba(30,30,30,0.65)',
            }}
          >
            {opt === 'quick_win' ? 'Quick Win' : 'Importance First'}
          </button>
        ))}
      </div>

      {/* ── Sum Validation ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">
          Total bobot: <span className="font-semibold text-[#1e1e1e]">{sumPct}%</span>
        </p>
        {!sumInTolerance && (
          <p className="font-body text-sm text-[#93000a]" role="alert">
            Total bobot harus 100%. Saat ini {sumPct}%.
          </p>
        )}
      </div>

      {/* ── Info ──────────────────────────────────────────────────────── */}
      <p
        className="font-body text-sm"
        style={{ color: 'rgba(30,30,30,0.65)' }}
      >
        Bobot ini digunakan untuk menghitung urutan prioritas{' '}
        <strong>semua goal</strong>.
      </p>

      {/* ── 5 Criterion Cards ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {CRITERIA_LABELS.map(({ key, label, color }) => {
          const valPct = pct(weights[key])
          return (
            <div
              key={key}
              className="rounded-xl border border-[rgba(30,30,30,0.15)] bg-white px-4 py-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <label
                    htmlFor={`weight-${key}`}
                    className="font-body text-base text-[#1e1e1e]"
                  >
                    {label}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={`weight-${key}`}
                    type="text"
                    inputMode="decimal"
                    value={valPct}
                    onChange={(e) => {
                      const dec = parsePct(e.target.value)
                      updateWeight(key, dec)
                    }}
                    className="w-16 rounded-lg border border-[rgba(30,30,30,0.15)] bg-white px-2 py-1.5 text-right font-body text-base font-semibold text-[#005BB0] outline-none focus:border-[#298dff]"
                    aria-label={`${label} dalam persen`}
                  />
                  <span className="font-body text-sm text-[rgba(30,30,30,0.65)]">%</span>
                </div>
              </div>

              {/* Slider (visual complement) */}
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={valPct}
                onChange={(e) => {
                  const dec = parseFloat(e.target.value) / 100
                  updateWeight(key, dec)
                }}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full outline-none"
                style={{
                  background: `linear-gradient(to right, ${color} ${valPct}%, #e5e2e1 ${valPct}%)`,
                }}
                aria-label={`Slider ${label}`}
              />
            </div>
          )
        })}
      </div>

      {/* ── Preview Ranking ──────────────────────────────────────────── */}
      <div>
        <h3 className="font-display mb-3 text-lg font-semibold text-[#1e1e1e]">
          Preview Ranking
        </h3>
        {previewLoading ? (
          <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">Memperbarui ranking...</p>
        ) : previewGoals.length === 0 ? (
          <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">
            Sesuaikan bobot untuk melihat preview ranking.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {previewGoals.map((goal) => (
              <div
                key={goal.id_goal}
                className="flex items-center justify-between rounded-xl border border-[rgba(30,30,30,0.15)] bg-white px-4 py-3 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
                style={
                  goal.rank === 1
                    ? { borderColor: '#ff8929', backgroundColor: 'rgba(255,137,41,0.04)' }
                    : {}
                }
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{
                      backgroundColor: goal.rank === 1 ? '#ff8929' : 'rgba(30,30,30,0.25)',
                    }}
                  >
                    {goal.rank}
                  </span>
                  <div>
                    <p className="font-body text-base font-semibold text-[#1e1e1e]">
                      {goal.nama_goal}
                    </p>
                    <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">
                      {goal.progress_pct}% terkumpul
                    </p>
                  </div>
                </div>
                {goal.rank === 1 && (
                  <span className="rounded-full bg-[rgba(255,137,41,0.14)] px-2.5 py-0.5 text-xs font-bold text-[#ff8929]">
                    Prioritas #1
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Save Message ─────────────────────────────────────────────── */}
      {saveMessage && (
        <div
          className="rounded-xl border px-4 py-3"
          style={{
            borderColor: saveMessage.includes('berhasil') ? '#10b981' : '#ba1a1a',
            backgroundColor: saveMessage.includes('berhasil')
              ? 'rgba(16,185,129,0.08)'
              : '#ffdad6',
          }}
        >
          <p
            className="font-body text-sm"
            style={{
              color: saveMessage.includes('berhasil') ? '#065f46' : '#93000a',
            }}
            role="alert"
          >
            {saveMessage}
          </p>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={!sumInTolerance || saving}
          onClick={handleSave}
          className="w-full rounded-xl px-6 py-3 text-lg font-bold text-white shadow-[0_4px_12px_rgba(41,141,255,0.3)] transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #298dff, #065fc5)' }}
        >
          {saving ? 'Menyimpan...' : 'Simpan Bobot'}
        </button>

        {showResetConfirm ? (
          <div className="flex items-center justify-between rounded-xl border border-[rgba(30,30,30,0.15)] bg-white px-4 py-3">
            <p className="font-body text-sm text-[#1e1e1e]">
              Kembalikan bobot ke default hasil riset?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-[#298dff] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Ya
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-lg border border-[rgba(30,30,30,0.15)] px-3 py-1.5 text-xs font-semibold text-[rgba(30,30,30,0.65)]"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="self-start font-body text-sm font-semibold text-[#298dff] transition-opacity hover:opacity-80"
          >
            Reset ke default
          </button>
        )}
      </div>
    </div>
  )
}