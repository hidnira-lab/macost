'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, isAuthError } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type { DashboardResponse } from '@/lib/api/types'
import { FileText } from 'lucide-react'

const USE_MOCK = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('mock') ?? process.env.NEXT_PUBLIC_USE_MOCK === 'true'
  : process.env.NEXT_PUBLIC_USE_MOCK === 'true'

type Period = 'this_month' | 'last_month' | 'custom'

const PERIOD_LABELS: Record<Period, string> = {
  this_month: 'Bulan Ini',
  last_month: 'Bulan Lalu',
  custom: 'Pilih Rentang',
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
    href: '/home',
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
    active: true,
    href: '#',
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

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('this_month')
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)
  const [dismissedAlert, setDismissedAlert] = useState(false)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch<DashboardResponse>(
        `/api/dashboard?period=${period}`
      )
      setData(result)
    } catch (err) {
      // Stale/expired session token: apiFetch already cleared it, so force a
      // clean re-login instead of showing a dead "gagal memuat" state.
      if (isAuthError(err)) {
        router.push('/login')
        return
      }
      setError('Gagal memuat dashboard')
    } finally {
      setLoading(false)
    }
  }, [period, router])

  useEffect(() => {
    async function init() {
      if (!USE_MOCK) {
        const token = await getToken()
        if (!token) {
          router.push('/login')
          return
        }
      }
      await loadDashboard()
    }
    init()
  }, [router, loadDashboard])

  function handlePeriodChange(p: Period) {
    setPeriod(p)
    setShowPeriodMenu(false)
  }

  // ─── Donut chart helper ──────────────────────────────────────────
  function donutConic(entries: { pct: number; color: string }[]): string {
    let cumulative = 0
    const stops: string[] = []
    for (const e of entries) {
      const startPct = (cumulative / 100) * 360
      const endPct = ((cumulative + e.pct) / 100) * 360
      stops.push(`${e.color} ${startPct}deg ${endPct}deg`)
      cumulative += e.pct
    }
    return `conic-gradient(${stops.join(', ')})`
  }

  const CATEGORY_COLORS = [
    '#ff8929',
    '#298dff',
    '#5d759d',
    '#ba1a1a',
    '#45d483',
  ]

  // ─── Loading skeleton ─────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
        <p className="text-[rgba(30,30,30,0.65)] text-sm font-body">
          Memuat dashboard...
        </p>
      </div>
    )
  }

  const categories =
    data?.expense_by_category.map((c, i) => ({
      ...c,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    })) ?? []

  const totalExpense = categories.reduce((s, c) => s + c.total, 0)

  const showAlert =
    data?.overspending_alert.is_active && !dismissedAlert

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col">
      <div className="flex-1 container mx-auto px-4 md:max-w-2xl md:px-6 lg:max-w-5xl lg:px-8 pb-24 md:pb-28 lg:pb-28">
        {/* ── Top App Bar ──────────────────────────────────────────── */}
        <header className="flex items-center justify-between h-16 sticky top-0 z-10 bg-[rgba(252,252,252,0.8)] backdrop-blur-[6px] -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 border-b border-[rgba(30,30,30,0.08)]">
          <div className="w-8 h-8 rounded-full bg-[rgba(41,141,255,0.2)] flex items-center justify-center overflow-hidden shrink-0" />
          <h1
            className="text-2xl font-extrabold text-[#298dff] tracking-tight font-display"
            style={{ fontVariationSettings: '"opsz" 14, "wdth" 100' }}
          >
            Macost
          </h1>
          {/* Bell icon */}
          <button
            className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-[rgba(30,30,30,0.05)] transition-colors"
            aria-label="Notifications"
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 20C9.1 20 10 19.1 10 18H6C6 19.1 6.9 20 8 20ZM14 14V9C14 5.93 12.36 3.36 9.5 2.68V2C9.5 1.17 8.83 0.5 8 0.5C7.17 0.5 6.5 1.17 6.5 2V2.68C3.64 3.36 2 5.92 2 9V14L0 16V17H16V16L14 14Z" fill="#005BB0" />
            </svg>
          </button>
        </header>

        {/* ── Period Filter + Dashboard Heading ────────────────────── */}
        <div className="flex items-center justify-between mt-6 mb-6">
          <h2 className="text-[24px] font-bold text-[#1e1e1e] leading-[32px] font-display">
            Dashboard
          </h2>
          <div className="relative shrink-0">
            <button
              onClick={() => setShowPeriodMenu((prev) => !prev)}
              className="flex items-center gap-1 px-4 py-2 bg-[rgba(30,30,30,0.08)] border border-[rgba(30,30,30,0.15)] rounded-lg text-sm font-semibold text-[#1e1e1e] hover:bg-[rgba(30,30,30,0.12)] transition-colors whitespace-nowrap font-body"
            >
              <span>{PERIOD_LABELS[period]}</span>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path d="M1.41 0.59L0 2L6 8L12 2L10.59 0.59L6 5.17L1.41 0.59Z" fill="#1e1e1e" fillOpacity="0.65" />
              </svg>
            </button>
            {showPeriodMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[rgba(30,30,30,0.15)] rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors font-body ${
                      period === p
                        ? 'bg-[rgba(41,141,255,0.1)] text-[#298dff] font-semibold'
                        : 'text-[#1e1e1e] hover:bg-[rgba(30,30,30,0.05)]'
                    }`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Loading overlay for refetch ─────────────────────────── */}
        {loading && data && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[rgba(41,141,255,0.3)] border-t-[#298dff] rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-[#ffdad6] border border-[#ba1a1a] rounded-xl px-4 py-3 mb-4">
            <p className="text-[#93000a] text-sm font-body" role="alert">
              {error}
            </p>
          </div>
        )}

        {data && !loading && (
          <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-6 md:items-start lg:grid-cols-2">
            {/* ─── Kolom Kiri (flex-col independen) ─────────────── */}
            <div className="flex flex-col gap-6 md:col-start-1 md:row-start-2 lg:col-start-1 lg:row-start-2">
              {/* Import e-Statement */}
              <section>
                <h3 className="text-xl font-semibold text-[#1e1e1e] mb-3 font-display">
                  Import e-Statement
                </h3>
                <button
                  onClick={() => router.push('/transactions/import')}
                  className="w-full rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-4 text-left shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-opacity hover:opacity-90"
                  aria-label="Import E-Statement"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(41,141,255,0.14)]">
                      <FileText className="h-6 w-6 text-[#298dff]" />
                    </span>
                    <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">
                      Unggah riwayat transaksi bank atau dompet elektronik Anda untuk sinkronisasi otomatis.
                    </p>
                  </div>
                </button>
              </section>

              {/* Expense Breakdown */}
              <section className="bg-white border border-[rgba(30,30,30,0.15)] rounded-xl p-4 md:p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                <h3 className="text-xl font-semibold text-[#1e1e1e] mb-4 font-display">
                  Expense Breakdown
                </h3>
                {categories.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[rgba(30,30,30,0.65)] text-sm font-body">
                      Belum ada pengeluaran
                    </p>
                    <p className="text-[rgba(30,30,30,0.65)] text-sm mt-1 font-body">
                      Belum ada transaksi pengeluaran bulan ini.
                    </p>
                    <button className="mt-3 px-4 py-2 bg-[#298dff] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity font-body">
                      + Tambah transaksi pertama
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6">
                    {/* Donut */}
                    <div className="relative w-[160px] h-[160px] shrink-0">
                      <div
                        className="w-full h-full rounded-full"
                        style={{
                          background: donutConic(
                            categories.map((c) => ({ pct: c.pct, color: c.color }))
                          ),
                        }}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="w-[120px] h-[120px] rounded-full bg-white flex flex-col items-center justify-center">
                          <p className="text-base font-semibold text-[#1e1e1e] font-body">
                            Rp {(totalExpense / 1_000_000).toFixed(1)}M
                          </p>
                          <p className="text-xs font-bold text-[rgba(30,30,30,0.65)] uppercase tracking-wide font-body">
                            TOTAL
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="w-full flex flex-col gap-3">
                      {categories.map((cat) => (
                        <div
                          key={cat.kategori_id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${cat.color}20` }}
                            >
                              <span
                                className="w-[10px] h-[10px] rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                            </span>
                            <span className="text-base text-[#1e1e1e] truncate font-body">
                              {cat.nama_kategori}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-[#1e1e1e] shrink-0 ml-2 font-body">
                            {cat.pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Tren Bulanan */}
              <section className="bg-white border border-[rgba(30,30,30,0.15)] rounded-xl p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                <h3 className="text-xl font-semibold text-[#1e1e1e] mb-4 font-display">
                  Tren Bulanan
                </h3>
                {data.monthly_trend && data.monthly_trend.length > 0 ? (
                  <>
                    {/* Chart area */}
                    <div className="flex items-end justify-between gap-1 md:gap-2 h-[128px]">
                      {data.monthly_trend.map((m, idx) => {
                        const maxVal = Math.max(
                          ...data.monthly_trend.flatMap((t) => [t.income, t.expense]),
                          1
                        )
                        const inH = (m.income / maxVal) * 100
                        const outH = (m.expense / maxVal) * 100
                        const monthLabel = new Date(m.month + '-01').toLocaleString(
                          'id-ID',
                          { month: 'short' }
                        )
                        return (
                          <div
                            key={m.month}
                            className="flex flex-col items-center justify-end gap-1 flex-1"
                          >
                            <div className="flex items-end gap-[3px]">
                              <div
                                className="w-[10px] md:w-[12px] rounded-t-sm"
                                style={{
                                  height: `${Math.max(inH * 1.28, 4)}px`,
                                  backgroundColor: 'rgba(41,141,255,0.35)',
                                }}
                              />
                              <div
                                className="w-[10px] md:w-[12px] rounded-t-sm"
                                style={{
                                  height: `${Math.max(outH * 1.28, 4)}px`,
                                  backgroundColor: '#298dff',
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold text-[rgba(30,30,30,0.65)] mt-1 font-body">
                              {monthLabel}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-[rgba(30,30,30,0.08)]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[rgba(41,141,255,0.35)]" />
                        <span className="text-xs font-bold text-[rgba(30,30,30,0.65)] font-body">
                          Masuk
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#298dff]" />
                        <span className="text-xs font-bold text-[rgba(30,30,30,0.65)] font-body">
                          Keluar
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[rgba(30,30,30,0.65)] text-sm text-center py-6 font-body">
                    Belum ada data tren
                  </p>
                )}
              </section>

              {/* Total Balance */}
              <section className="bg-white border border-[rgba(30,30,30,0.15)] rounded-xl p-6 md:p-8 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] text-center">
                <p className="text-sm font-bold text-[rgba(30,30,30,0.65)] uppercase tracking-wide font-body">
                  Total Saldo
                </p>
                <p
                  className="text-[32px] md:text-[40px] font-extrabold text-[#1e1e1e] mt-2 leading-tight font-display"
                  style={{ fontWeight: 800 }}
                >
                  Rp {data.total_balance.toLocaleString('id-ID')}
                </p>
              </section>
            </div>

            {/* ─── Kolom Kanan (Goal Progress) ───────────────────── */}
            <section className="md:col-start-2 md:row-start-2 lg:col-start-2 lg:row-start-2">
              <h3 className="text-xl font-semibold text-[#1e1e1e] mb-3 font-display">
                Goal Progress
              </h3>
              {(!data.active_goals_summary || data.active_goals_summary.length === 0) ? (
                <div className="bg-white border border-[rgba(30,30,30,0.15)] rounded-xl p-6 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                  <p className="text-[rgba(30,30,30,0.65)] text-sm font-body">
                    Belum ada goal aktif
                  </p>
                  <p className="text-[rgba(30,30,30,0.65)] text-sm mt-1 font-body">
                    Buat goal pertama untuk mulai menabung.
                  </p>
                  <button className="mt-3 px-4 py-2 bg-[#298dff] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity font-body">
                    + Buat goal
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.active_goals_summary.map((goal) => (
                    <div
                      key={goal.id_goal}
                      className="bg-white border border-[rgba(30,30,30,0.15)] rounded-xl px-4 py-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
                    >
                      <div className="flex items-center gap-3">
                        {/* Icon chip */}
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[rgba(30,30,30,0.05)] flex items-center justify-center shrink-0">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="24" height="24" rx="4" fill="rgba(255,137,41,0.2)" />
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FF8929" />
                          </svg>
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-base font-semibold text-[#1e1e1e] truncate font-body">
                              {goal.nama_goal}
                            </span>
                            <span className={`text-xs font-bold shrink-0 ml-2 font-body ${
                              goal.progress_pct >= 50 ? 'text-[#ff8929]' : 'text-[#298dff]'
                            }`}>
                              {goal.progress_pct}%
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-3 rounded-full bg-[rgba(30,30,30,0.08)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${goal.progress_pct}%`,
                                background:
                                  goal.progress_pct >= 50
                                    ? 'linear-gradient(90deg, #FFB787, #FF8929)'
                                    : 'linear-gradient(90deg, #a8c8ff, #298dff)',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ─── Overspending Alert (full-width) ──────────────── */}
            {showAlert && (
              <section className="bg-[#ffdad6] border border-[#ba1a1a] rounded-xl p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] md:col-span-2 md:row-start-1 lg:col-span-2 lg:row-start-1">
                <div className="flex gap-3">
                  <div className="shrink-0 pt-0.5">
                    <svg width="22" height="19" viewBox="0 0 22 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 0L21 18H3L12 0ZM12 3L5.5 16H18.5L12 3ZM11 14H13V16H11V14ZM11 7H13V12H11V7Z" fill="#BA1A1A" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#93000a] font-body">
                      Peringatan Pengeluaran
                    </p>
                    <p className="text-base text-[rgba(147,0,10,0.8)] mt-0.5 font-body">
                      {data.overspending_alert.message}
                    </p>
                  </div>
                  <button
                    onClick={() => setDismissedAlert(true)}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full hover:bg-[rgba(186,26,26,0.1)] transition-colors"
                    aria-label="Dismiss alert"
                  >
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8.5 0.5L0.5 8.5M0.5 0.5L8.5 8.5" stroke="#93000A" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </section>
            )}
          </div>
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