'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'
import { getToken, clearToken } from '@/lib/auth/session'
import type { GoalsResponse, Goal, GoalSettings } from '@/lib/api/types'
import { Target, PiggyBank, TrendingUp, Star, Trophy, Plus, Sparkles, Bell, User } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

/** Shared tailwind classes for the circular goal icon */
const iconRingClass =
  'w-10 h-10 rounded-full flex items-center justify-center shrink-0'
const iconClass = 'w-5 h-5'

/** Pick an icon + color pair based on goal index */
function goalVisual(index: number) {
  const palette = [
    { Icon: Target, bg: 'bg-[rgba(255,137,41,0.14)]', fg: 'text-[#ff8929]' },
    { Icon: PiggyBank, bg: 'bg-[rgba(41,141,255,0.1)]', fg: 'text-[#298dff]' },
    { Icon: TrendingUp, bg: 'bg-[rgba(16,185,129,0.12)]', fg: 'text-emerald-600' },
    { Icon: Star, bg: 'bg-[rgba(168,85,247,0.12)]', fg: 'text-purple-600' },
    { Icon: Trophy, bg: 'bg-[rgba(244,63,94,0.12)]', fg: 'text-rose-500' },
  ]
  return palette[index % palette.length]
}

function formatRp(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

function formatDeadline(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function GoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<'quick_win' | 'importance_first'>('importance_first')
  const [weights, setWeights] = useState<GoalSettings['weights'] | null>(null)

  const loadGoals = useCallback(async () => {
    try {
      const data = await apiFetch<GoalsResponse>('/api/goals')
      setGoals(data.goals)
    } catch {
      setError('Gagal memuat daftar goal')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const data = await apiFetch<GoalSettings>('/api/goal-settings')
      setStrategy(data.strategy as 'quick_win' | 'importance_first')
      setWeights(data.weights)
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => {
    async function init() {
      const token = await getToken()
      if (!token) {
        router.push('/login')
        return
      }
      await Promise.all([loadGoals(), loadSettings()])
    }
    init()
  }, [router, loadGoals, loadSettings])

  async function handleLogout() {
    await clearToken()
    router.push('/login')
  }

  // Compute totals
  const totalTarget = goals.reduce((sum, g) => sum + g.nominal_target, 0)
  const totalCollected = goals.reduce((sum, g) => sum + g.nominal_terkumpul, 0)
  const activeCount = goals.length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fcfcfc' }}>
        <p
          className="text-sm"
          style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
        >
          Memuat goal...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fcfcfc' }}>
      <div className="mx-auto w-full px-4 pb-28 md:max-w-2xl md:px-6 md:pb-32 lg:max-w-5xl lg:px-8 lg:pb-32">
        {/* ── Top Header ── */}
        <header className="sticky top-0 z-10 -mx-4 flex h-16 items-center justify-between border-b border-[rgba(30,30,30,0.08)] bg-[rgba(252,252,252,0.8)] px-4 backdrop-blur-[6px] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="h-8 w-8 shrink-0 rounded-full bg-[rgba(41,141,255,0.2)]" />
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#298dff]">
            Macost
          </h1>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[rgba(30,30,30,0.05)]"
            aria-label="Notifikasi"
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 20C9.1 20 10 19.1 10 18H6C6 19.1 6.9 20 8 20ZM14 14V9C14 5.93 12.36 3.36 9.5 2.68V2C9.5 1.17 8.83 0.5 8 0.5C7.17 0.5 6.5 1.17 6.5 2V2.68C3.64 3.36 2 5.92 2 9V14L0 16V17H16V16L14 14Z" fill="#005BB0" />
            </svg>
          </button>
        </header>

        {/* ── Summary/Hero Row ── */}
        <div
          className="flex items-center justify-between mt-4 mb-5 pb-4 flex-wrap gap-2 lg:flex-nowrap"
          style={{ borderBottom: '1px solid rgba(30,30,30,0.15)' }}
        >
          <div>
            <p
              className="text-xs font-bold uppercase tracking-wider mb-1"
              style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
            >
              Total Target Tabungan
            </p>
            <p
              className="text-2xl font-bold"
              style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
            >
              {formatRp(totalTarget)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{
                fontFamily: 'Helvetica, sans-serif',
                backgroundColor: 'rgba(16,185,129,0.12)',
                color: '#059669',
              }}
            >
              {totalCollected >= totalTarget ? 'Completed' : 'On Track'}
            </span>
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{
                fontFamily: 'Helvetica, sans-serif',
                backgroundColor: 'rgba(41,141,255,0.1)',
                color: '#298dff',
              }}
            >
              {activeCount} Active
            </span>
          </div>
        </div>

        {/* ── Strategy Info Bar — navigates to /goal-settings ── */}
        <button
          onClick={() => router.push('/goal-settings')}
          className="mb-4 flex w-full items-center justify-between rounded-xl border border-[rgba(30,30,30,0.15)] bg-white px-4 py-3 text-left shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
        >
          <span className="font-body text-sm text-[#1e1e1e]">
            Diurutkan berdasarkan:{' '}
            <span className="font-semibold text-[#298dff]">
              {strategy === 'quick_win' ? 'Quick Win' : 'Importance First'}
            </span>
          </span>
          <span className="font-semibold text-sm text-[#298dff]">Atur Prioritas {'>'}</span>
        </button>

        {/* ── Error banner ── */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-4"
            style={{ backgroundColor: '#ffdad6', border: '1px solid #ba1a1a' }}
          >
            <p
              className="text-sm"
              style={{ fontFamily: 'Helvetica, sans-serif', color: '#93000a' }}
              role="alert"
            >
              {error}
            </p>
          </div>
        )}

        {/* ── Goal list ── */}
        <div
          className="grid grid-cols-1 gap-4"
        >
          {/* Empty state */}
          {goals.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(255,137,41,0.14)' }}>
                <Target className="w-8 h-8" style={{ color: '#ff8929' }} />
              </div>
              <p
                className="font-semibold mb-2"
                style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
              >
                Belum ada goal
              </p>
              <p
                className="text-sm mb-6"
                style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
              >
                Buat goal pertama kamu dan mulai menabung menuju targetmu.
              </p>
              <button
                onClick={() => router.push('/goals/new')}
                className="w-full lg:w-auto inline-flex items-center justify-center gap-2 text-white font-semibold rounded-xl px-5 py-3 transition-colors"
                style={{
                  fontFamily: 'Helvetica, sans-serif',
                  backgroundColor: '#ff8929',
                }}
              >
                <Plus className="w-4 h-4" />
                Buat Goal
              </button>
            </div>
          )}

          {/* Goal cards */}
          {goals.map((goal, idx) => {
            const { Icon, bg, fg } = goalVisual(idx)
            const isPriority1 = goal.rank === 1

            return isPriority1 ? (
              /* ── Priority #1 Card (larger, orange accent) ── */
              <div
                key={goal.id_goal}
                onClick={() => router.push(`/goals/${goal.id_goal}`)}
                className="relative overflow-hidden rounded-3xl px-5 pt-5 pb-4 cursor-pointer hover:shadow-md transition-shadow"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(30,30,30,0.15)',
                }}
              >
                {/* Orange corner blob */}
                <div
                  className="absolute -top-8 -right-8 w-28 h-28 rounded-bl-full"
                  style={{ backgroundColor: 'rgba(255,137,41,0.2)' }}
                />
                <div
                  className="absolute -top-6 -right-6 w-20 h-20 rounded-bl-full"
                  style={{ backgroundColor: 'rgba(255,137,41,0.08)' }}
                />

                <div className="relative z-10">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`${iconRingClass} ${bg}`}>
                        <Icon className={`${iconClass} ${fg}`} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-semibold"
                          style={{
                            fontFamily: "'Neulis', sans-serif",
                            color: '#1e1e1e',
                            fontSize: '18px',
                          }}
                        >
                          {goal.nama_goal}
                        </p>
                        <p
                          className="text-sm mt-0.5"
                          style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
                        >
                          {formatRp(goal.nominal_terkumpul)} / {formatRp(goal.nominal_target)}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
                        >
                          Deadline: {formatDeadline(goal.deadline)}
                        </p>
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0"
                      style={{
                        backgroundColor: '#ff8929',
                        color: '#ffffff',
                      }}
                    >
                      <Sparkles className="w-3 h-3" />
                      Prioritas #1
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full rounded-full h-3" style={{ backgroundColor: 'rgba(30,30,30,0.08)' }}>
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min(goal.progress_pct, 100)}%`,
                        background: 'linear-gradient(90deg, #ffb787, #ff8929)',
                      }}
                    />
                  </div>
                  <p
                    className="text-xs mt-1 text-right font-semibold"
                    style={{ fontFamily: 'Helvetica, sans-serif', color: '#ff8929' }}
                  >
                    {goal.progress_pct}%
                  </p>
                </div>
              </div>
            ) : (
              /* ── Standard Goal Card ── */
              <div
                key={goal.id_goal}
                onClick={() => router.push(`/goals/${goal.id_goal}`)}
                className="rounded-xl px-4 py-4 cursor-pointer hover:shadow-md transition-shadow"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(30,30,30,0.15)',
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`${iconRingClass} ${bg}`}>
                    <Icon className={`${iconClass} ${fg}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="font-semibold truncate"
                      style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e', fontSize: '16px' }}
                    >
                      {goal.nama_goal}
                    </p>
                    <p
                      className="text-sm mt-0.5"
                      style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
                    >
                      {formatRp(goal.nominal_terkumpul)} / {formatRp(goal.nominal_target)}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
                    >
                      Deadline: {formatDeadline(goal.deadline)}
                    </p>
                  </div>

                  {/* Rank badge */}
                  <span
                    className="text-xs font-semibold rounded-full px-2.5 py-0.5 shrink-0 self-start"
                    style={{
                      fontFamily: 'Helvetica, sans-serif',
                      backgroundColor: 'rgba(30,30,30,0.05)',
                      color: 'rgba(30,30,30,0.65)',
                    }}
                  >
                    #{goal.rank}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full rounded-full h-2.5" style={{ backgroundColor: 'rgba(30,30,30,0.08)' }}>
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(goal.progress_pct, 100)}%`,
                      background: 'linear-gradient(90deg, #ffb787, #ff8929)',
                    }}
                  />
                </div>
                <p
                  className="text-xs mt-1 text-right"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
                >
                  {goal.progress_pct}%
                </p>
              </div>
            )
          })}
        </div>

        {/* ── FAB: Add Goal (blue gradient) ── */}
        {goals.length > 0 && (
          <button
            onClick={() => router.push('/goals/new')}
            className="fixed bottom-24 right-4 md:right-6 lg:right-[calc(50%-512px+2rem)] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #298dff, #065fc5)',
            }}
            aria-label="Tambah Goal"
          >
            <Plus className="w-7 h-7 text-white" />
          </button>
        )}
      </div>

      {/* ─── Bottom Navigation Bar ────────────────────────────────── */}
      <BottomNav activeTab="Goals" />
    </div>
  )
}