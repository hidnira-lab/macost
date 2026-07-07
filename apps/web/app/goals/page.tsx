'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, apiMutate } from '@/lib/api/client'
import { getToken, clearToken } from '@/lib/auth/session'
import type { GoalsResponse, Goal, GoalSettings, GoalSettingsUpdateRequest } from '@/lib/api/types'
import {
  Target,
  PiggyBank,
  TrendingUp,
  Star,
  Trophy,
  Plus,
  Sparkles,
  Bell,
  User,
} from 'lucide-react'

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

// ─── Bottom nav items ────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M9 22V12H15V22" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    active: false,
    href: '/dashboard',
  },
  {
    label: 'Dashboard',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <rect x="13" y="3" width="8" height="4" rx="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <rect x="13" y="9" width="8" height="12" rx="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <rect x="3" y="13" width="8" height="8" rx="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    active: false,
    href: '/dashboard',
  },
  {
    label: 'Goals',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" fill="none"/>
        <circle cx="12" cy="12" r="6" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" fill="none"/>
        <circle cx="12" cy="12" r="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    active: true,
    href: '#',
  },
  {
    label: 'AI Assistant',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    active: false,
    href: '/ai',
  },
  {
    label: 'Profile',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    active: false,
    href: '/profile',
  },
]

export default function GoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<'quick_win' | 'importance_first'>('quick_win')
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

  async function handleStrategyToggle(newStrategy: 'quick_win' | 'importance_first') {
    if (newStrategy === strategy) return
    if (!weights) {
      setError('Pengaturan belum termuat, coba refresh halaman')
      return
    }
    setToggleLoading(true)
    setError(null)
    try {
      const body: GoalSettingsUpdateRequest = {
        strategy: newStrategy,
        weights,
      }
      await apiMutate<GoalSettings>('/api/goal-settings', 'PUT', body)
      setStrategy(newStrategy)
      const data = await apiFetch<GoalsResponse>('/api/goals')
      setGoals(data.goals)
    } catch {
      setError('Gagal mengubah strategi prioritas')
    } finally {
      setToggleLoading(false)
    }
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
        <div className="flex items-center justify-between pt-8 pb-4">
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: "'Neulis', sans-serif",
              color: '#298dff',
            }}
          >
            Goal Saya
          </h1>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(30,30,30,0.05)' }} aria-label="Notifikasi">
              <Bell className="w-4 h-4" style={{ color: '#1e1e1e' }} />
            </button>
            <button onClick={handleLogout} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#298dff' }} aria-label="Profil">
              <User className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── Strategy Toggle ── */}
        <div className="mb-4 lg:flex">
          <div className="flex rounded-xl p-0.5 lg:inline-flex" style={{ backgroundColor: 'rgba(30,30,30,0.05)', border: '1px solid rgba(30,30,30,0.08)' }}>
            <button
              onClick={() => handleStrategyToggle('quick_win')}
              disabled={toggleLoading}
              className={`flex-1 lg:flex-none text-sm font-semibold rounded-[10px] px-4 py-2 lg:px-6 transition-colors ${
                strategy === 'quick_win'
                  ? 'text-white'
                  : 'text-[#1e1e1e] hover:text-[#1e1e1e]'
              }`}
              style={{
                fontFamily: 'Helvetica, sans-serif',
                backgroundColor: strategy === 'quick_win' ? '#298dff' : 'transparent',
              }}
            >
              Quick Win
            </button>
            <button
              onClick={() => handleStrategyToggle('importance_first')}
              disabled={toggleLoading}
              className={`flex-1 lg:flex-none text-sm font-semibold rounded-[10px] px-4 py-2 lg:px-6 transition-colors ${
                strategy === 'importance_first'
                  ? 'text-white'
                  : 'text-[#1e1e1e] hover:text-[#1e1e1e]'
              }`}
              style={{
                fontFamily: 'Helvetica, sans-serif',
                backgroundColor: strategy === 'importance_first' ? '#298dff' : 'transparent',
              }}
            >
              Importance-First
            </button>
          </div>
        </div>

        {/* ── Summary/Hero Row ── */}
        <div
          className="flex items-center justify-between mb-5 pb-4 flex-wrap gap-2 lg:flex-nowrap"
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
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${
            toggleLoading ? 'opacity-50' : ''
          }`}
        >
          {/* Empty state */}
          {goals.length === 0 && !loading && (
            <div className="text-center py-12 md:col-span-2 lg:col-span-3">
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
                className="relative overflow-hidden rounded-3xl px-5 pt-5 pb-4 md:col-span-2 lg:col-span-3"
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
                className="rounded-xl px-4 py-4"
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
            className="fixed bottom-24 right-4 md:right-6 lg:right-[calc(50%-512px+2rem)] w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
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
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[rgba(30,30,30,0.08)] shadow-[0_-4px_12px_0_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around px-2 py-1.5 max-w-2xl mx-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] min-h-[44px] justify-center rounded-full transition-colors ${
                item.active
                  ? 'bg-[#298dff]'
                  : 'bg-transparent'
              }`}
            >
              <span className="w-6 h-6 flex items-center justify-center">
                {item.icon(item.active)}
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight whitespace-nowrap ${
                  item.active
                    ? 'text-white'
                    : 'text-[rgba(30,30,30,0.45)]'
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}