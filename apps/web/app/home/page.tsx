'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, isAuthError } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type {
  DashboardResponse,
  GoalsResponse,
  Goal,
  TransactionsResponse,
  Transaction,
  CategoriesResponse,
  Category,
} from '@/lib/api/types'
import QuickAccessPanel from '@/components/QuickAccessPanel'
import {
  Plus,
  Target,
  PiggyBank,
  TrendingUp,
  Star,
  Trophy,
  Utensils,
  Car,
  Music2,
  GraduationCap,
  Building2,
  Briefcase,
  Receipt,
} from 'lucide-react'

const USE_MOCK = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('mock') ?? process.env.NEXT_PUBLIC_USE_MOCK === 'true'
  : process.env.NEXT_PUBLIC_USE_MOCK === 'true'

/** Icon + color pair for an active-goal card, rotated by index */
function goalVisual(index: number) {
  const palette = [
    { Icon: Target, bg: 'bg-[rgba(255,137,41,0.14)]', fg: 'text-[#ff8929]' },
    { Icon: PiggyBank, bg: 'bg-[rgba(41,141,255,0.14)]', fg: 'text-[#298dff]' },
    { Icon: TrendingUp, bg: 'bg-[rgba(16,185,129,0.12)]', fg: 'text-emerald-600' },
    { Icon: Star, bg: 'bg-[rgba(168,85,247,0.12)]', fg: 'text-purple-600' },
    { Icon: Trophy, bg: 'bg-[rgba(244,63,94,0.12)]', fg: 'text-rose-500' },
  ]
  return palette[index % palette.length]
}

/** Icon + color pair for a transaction row, matched by category name */
function categoryVisual(namaKategori: string | undefined) {
  const map: Record<string, { Icon: typeof Utensils; bg: string; fg: string }> = {
    'Makan & Minum': { Icon: Utensils, bg: 'bg-[rgba(255,137,41,0.2)]', fg: 'text-[#ff8929]' },
    Transportasi: { Icon: Car, bg: 'bg-[rgba(41,141,255,0.2)]', fg: 'text-[#298dff]' },
    Hiburan: { Icon: Music2, bg: 'bg-[rgba(168,85,247,0.15)]', fg: 'text-purple-600' },
    'Keperluan Kuliah': { Icon: GraduationCap, bg: 'bg-[rgba(16,185,129,0.15)]', fg: 'text-emerald-600' },
    'Tempat Tinggal': { Icon: Building2, bg: 'bg-[rgba(30,30,30,0.08)]', fg: 'text-[#1e1e1e]' },
    'Uang Saku / Kiriman Orang Tua': { Icon: PiggyBank, bg: 'bg-[rgba(41,141,255,0.2)]', fg: 'text-[#298dff]' },
    'Freelance / Kerja Sampingan': { Icon: Briefcase, bg: 'bg-[rgba(255,137,41,0.2)]', fg: 'text-[#ff8929]' },
  }
  const fallback = { Icon: Receipt, bg: 'bg-[rgba(30,30,30,0.08)]', fg: 'text-[#1e1e1e]' }
  if (!namaKategori) return fallback
  return map[namaKategori] ?? fallback
}

function formatSigned(nominal: number, tipe: string) {
  const sign = tipe === 'Pemasukan' ? '+' : '-'
  return `${sign}${nominal.toLocaleString('id-ID')}`
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
    active: true,
    href: '#',
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
    active: false,
    href: '/goals',
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

export default function HomePage() {
  const router = useRouter()
  const [remainingBudget, setRemainingBudget] = useState(0)
  const [goals, setGoals] = useState<Goal[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** SAW rank-1 goal — goals are already SAW-ranked server-side */
  const topGoal = goals.find((g) => g.rank === 1)

  const loadHome = useCallback(async () => {
    try {
      const [dashboard, goalsRes, transactionsRes, categoriesRes] = await Promise.all([
        apiFetch<DashboardResponse>('/api/dashboard?period=this_month'),
        apiFetch<GoalsResponse>('/api/goals'),
        apiFetch<TransactionsResponse>('/api/transactions'),
        apiFetch<CategoriesResponse>('/api/categories'),
      ])
      setRemainingBudget(dashboard.total_balance)
      setGoals(goalsRes.goals)
      setRecentTransactions(transactionsRes.transactions.slice(0, 3))
      setCategories(categoriesRes.categories)
    } catch (err) {
      if (isAuthError(err)) {
        router.push('/login')
        return
      }
      setError('Gagal memuat halaman utama')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    async function init() {
      if (!USE_MOCK) {
        const token = await getToken()
        if (!token) {
          router.push('/login')
          return
        }
      }
      await loadHome()
    }
    init()
  }, [router, loadHome])

  function categoryName(kategoriId: string) {
    return categories.find((c) => c.id_kategori === kategoriId)?.nama_kategori
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfcfc]">
        <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">Memuat...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <div className="mx-auto w-full px-4 pb-28 md:max-w-2xl md:px-6 md:pb-32 lg:max-w-5xl lg:px-8 lg:pb-32">
        {/* ── Top App Bar ── */}
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

        {error && (
          <div className="mt-4 rounded-xl border border-[#ba1a1a] bg-[#ffdad6] px-4 py-3">
            <p className="font-body text-sm text-[#93000a]" role="alert">
              {error}
            </p>
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          {/* ── Left column: Quick Access ── */}
          <div className="flex flex-col gap-6">
            <QuickAccessPanel remainingBudget={remainingBudget} />
          </div>

          {/* ── Right column: Top Active Goal + Goal Aktif + Terbaru ── */}
          <div className="flex flex-col gap-6">
            {/* ── Top Active Goal (SAW rank-1) ── */}
            <section>
              <h2 className="font-display mb-4 text-xl font-semibold text-[#1e1e1e]">Top Active Goal</h2>
              <button
                onClick={() => router.push(topGoal ? `/goals/${topGoal.id_goal}` : '/goals/new')}
                className="w-full rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-4 text-left shadow-[0_4px_4px_0_rgba(0,0,0,0.05)] transition-opacity hover:opacity-90"
                aria-label={topGoal ? `Goal prioritas: ${topGoal.nama_goal}` : 'Buat goal baru'}
              >
                {topGoal ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="font-body text-base font-semibold text-[#1e1e1e]">{topGoal.nama_goal}</p>
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(255,137,41,0.14)]">
                        <Target className="h-5 w-5 text-[#ff8929]" />
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <p className="font-body text-xs font-bold uppercase tracking-wide text-[rgba(30,30,30,0.65)]">Progress</p>
                        <span className="font-body text-xs font-bold text-[#ff8929]">{topGoal.progress_pct}%</span>
                      </div>
                      <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-[rgba(30,30,30,0.05)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(topGoal.progress_pct, 100)}%`,
                            background: 'linear-gradient(135deg, #964900, #ff8929)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(30,30,30,0.05)]">
                      <Target className="h-5 w-5 text-[rgba(30,30,30,0.45)]" />
                    </span>
                    <div>
                      <p className="font-display text-lg font-semibold text-[rgba(30,30,30,0.45)]">Belum ada goal</p>
                      <p className="font-body text-xs font-bold text-[rgba(30,30,30,0.45)]">Buat goal sekarang</p>
                    </div>
                  </div>
                )}
              </button>
            </section>

            {/* ── Active Goals ── */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-xl font-semibold text-[#1e1e1e]">Goal Aktif</h3>
                <button onClick={() => router.push('/goals')} aria-label="Lihat semua goal">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 6L15 12L9 18" stroke="rgba(30,30,30,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </button>
              </div>
              {goals.length === 0 ? (
                <div className="rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-6 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                  <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">Belum ada goal aktif</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {goals.map((goal, idx) => {
                    const { Icon, bg, fg } = goalVisual(idx)
                    return (
                      <div
                        key={goal.id_goal}
                        className="relative w-60 shrink-0 overflow-hidden rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-4 shadow-[0_4px_4px_0_rgba(0,0,0,0.05)]"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-body text-base font-semibold text-[#1e1e1e]">{goal.nama_goal}</p>
                            <p className="font-body text-base font-semibold text-[#298dff]">{goal.progress_pct}%</p>
                          </div>
                          <span className={`flex h-12 w-12 items-center justify-center rounded-lg shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] ${bg}`}>
                            <Icon className={`h-5 w-5 ${fg}`} />
                          </span>
                        </div>
                        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[rgba(30,30,30,0.05)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(goal.progress_pct, 100)}%`,
                              background: 'linear-gradient(135deg, #964900, #ff8929)',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ── Recent Transactions ── */}
            <section>
              <h3 className="font-display mb-4 text-xl font-semibold text-[#1e1e1e]">Terbaru</h3>
              {recentTransactions.length === 0 ? (
                <div className="rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-6 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                  <p className="font-body text-sm font-semibold text-[#1e1e1e]">Belum ada transaksi</p>
                  <p className="font-body mt-1 text-sm text-[rgba(30,30,30,0.65)]">
                    Catat transaksi pertamamu untuk mulai melacak keuanganmu.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentTransactions.map((trx) => {
                    const nama = categoryName(trx.kategori_id)
                    const { Icon, bg, fg } = categoryVisual(nama)
                    return (
                      <div
                        key={trx.id_transaksi}
                        className="flex items-center justify-between rounded-xl border border-[rgba(30,30,30,0.15)] bg-white px-4 py-4 shadow-[0_4px_2px_0_rgba(0,0,0,0.05)]"
                      >
                        <div className="flex items-center gap-4">
                          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${bg}`}>
                            <Icon className={`h-4 w-4 ${fg}`} />
                          </span>
                          <div>
                            <p className="font-body text-base font-medium text-[#1e1e1e]">
                              {nama ?? 'Transaksi'}
                            </p>
                            <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">
                              {trx.tanggal_transaksi}
                            </p>
                          </div>
                        </div>
                        <p className="font-body text-base font-semibold text-[#1e1e1e]">
                          {formatSigned(trx.nominal, trx.tipe_transaksi)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => router.push('/transactions')}
        className="fixed bottom-24 right-4 flex h-16 w-16 items-center justify-center rounded-full shadow-[0_12px_6px_0_rgba(0,91,176,0.1)] transition-transform hover:scale-105 active:scale-95 md:right-6 lg:right-[calc(50%-512px+2rem)]"
        style={{ background: 'linear-gradient(135deg, #298dff, #065fc5)' }}
        aria-label="Tambah Transaksi"
      >
        <Plus className="h-6 w-6 text-white" />
      </button>

      {/* ─── Bottom Navigation Bar ────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(30,30,30,0.08)] bg-white shadow-[0_-4px_12px_0_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-1.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1 transition-colors ${
                item.active ? 'bg-[#298dff]' : 'bg-transparent'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center">
                {item.icon(item.active)}
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight whitespace-nowrap ${
                  item.active ? 'text-white' : 'text-[rgba(30,30,30,0.45)]'
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