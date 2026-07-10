'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import InsightCard from '@/components/InsightCard'
import { Sparkles, RefreshCw, ArrowLeft, Bell } from 'lucide-react'
import { apiFetch, isAuthError } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type { AiInsightResponse } from '@/lib/api/types'

export default function AiInsightsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insightData, setInsightData] = useState<AiInsightResponse | null>(null)

  const fetchInsights = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const data = await apiFetch<AiInsightResponse>('/api/ai-insight')
      setInsightData(data)
    } catch (err) {
      if (isAuthError(err)) {
        router.push('/login')
        return
      }
      setError('Gagal memuat insight. Coba lagi.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    async function init() {
      const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true'
      if (!useMock) {
        const token = await getToken()
        if (!token) {
          router.push('/login')
          return
        }
      }
      await fetchInsights()
    }
    init()
  }, [router, fetchInsights])

  // ── Skeleton loading (mengikuti Figma) ──
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#fcfcfc' }}>
        <div className="mx-auto w-full px-4 md:max-w-2xl md:px-6 lg:max-w-5xl lg:px-8 pb-28 md:pb-32 lg:pb-32">
          {/* Header skeleton */}
          <header className="sticky top-0 z-10 -mx-4 flex h-16 items-center justify-between border-b border-[rgba(30,30,30,0.08)] bg-[rgba(252,252,252,0.8)] px-4 backdrop-blur-[6px] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
            <div className="h-8 w-8 rounded-full" style={{ backgroundColor: 'rgba(30,30,30,0.08)' }} />
            <div className="h-6 w-20 rounded" style={{ backgroundColor: 'rgba(30,30,30,0.08)' }} />
            <div className="h-8 w-8 rounded-full" style={{ backgroundColor: 'rgba(30,30,30,0.08)' }} />
          </header>

          {/* Skeleton cards */}
          <div className="mt-6">
            <div className="rounded-xl overflow-hidden p-4 mb-4" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(30,30,30,0.15)' }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full shrink-0" style={{ backgroundColor: 'rgba(30,30,30,0.08)' }} />
                <div className="flex-1">
                  <div className="h-6 w-[89px] rounded mb-2" style={{ backgroundColor: 'rgba(30,30,30,0.08)' }} />
                  <div className="h-4 w-full rounded mb-1.5" style={{ backgroundColor: 'rgba(30,30,30,0.05)' }} />
                  <div className="h-4 w-[223px] rounded mb-1.5" style={{ backgroundColor: 'rgba(30,30,30,0.05)' }} />
                  <div className="h-4 w-[179px] rounded" style={{ backgroundColor: 'rgba(30,30,30,0.05)' }} />
                </div>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden p-4" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(30,30,30,0.15)' }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full shrink-0" style={{ backgroundColor: 'rgba(30,30,30,0.08)' }} />
                <div className="flex-1">
                  <div className="h-6 w-[89px] rounded mb-2" style={{ backgroundColor: 'rgba(30,30,30,0.08)' }} />
                  <div className="h-4 w-full rounded mb-1.5" style={{ backgroundColor: 'rgba(30,30,30,0.05)' }} />
                  <div className="h-4 w-[223px] rounded mb-1.5" style={{ backgroundColor: 'rgba(30,30,30,0.05)' }} />
                  <div className="h-4 w-[179px] rounded" style={{ backgroundColor: 'rgba(30,30,30,0.05)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <BottomNav activeTab="AI Assistant" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fcfcfc' }}>
      <div className="mx-auto w-full px-4 md:max-w-2xl md:px-6 lg:max-w-5xl lg:px-8 pb-28 md:pb-32 lg:pb-32">
        {/* ── Header (TopAppBar) ── */}
        <header className="sticky top-0 z-10 -mx-4 flex h-16 items-center justify-between border-b border-[rgba(30,30,30,0.08)] bg-[rgba(252,252,252,0.8)] px-4 backdrop-blur-[6px] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <button
            onClick={() => router.push('/ai')}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[rgba(30,30,30,0.05)]"
            aria-label="Kembali ke AI Hub"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#1e1e1e' }} />
          </button>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#298dff]">
            Macost
          </h1>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[rgba(30,30,30,0.05)]"
            aria-label="Notifikasi"
          >
            <Bell className="w-4 h-4" style={{ color: '#1e1e1e' }} />
          </button>
        </header>

        {/* ── Header Section (judul + subtitle) ── */}
        <div className="mt-6 mb-6">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(41,141,255,0.1)' }}
            >
              <Sparkles className="w-4 h-4" style={{ color: '#298dff' }} />
            </div>
            <h2
              className="text-2xl font-bold leading-8"
              style={{ fontFamily: "'Neulis', sans-serif", color: '#1b1b1c' }}
            >
              AI Insights
            </h2>
          </div>
          <p
            className="text-sm mt-1"
            style={{ fontFamily: 'Inter, sans-serif', color: '#414753' }}
          >
            Personalized analysis based on your recent activity.
          </p>
        </div>

        {/* ── Refresh button ── */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => fetchInsights(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#298dff', color: '#ffffff' }}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing ? 'Memperbarui...' : 'Perbarui insight'}
          </button>
        </div>

        {/* ── Network/API error banner ── */}
        {error && (
          <div className="rounded-xl border border-[#ba1a1a] bg-[#ffdad6] px-4 py-3 mb-4">
            <p className="font-body text-sm text-[#93000a]" role="alert">
              {error}
            </p>
            <button
              onClick={() => fetchInsights(false)}
              className="mt-2 text-sm font-semibold underline"
              style={{ color: '#93000a' }}
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* ── Content ── */}
        {!error && insightData && (
          <>
            {/* Fallback: insight_available === false */}
            {!insightData.insight_available && insightData.fallback_message ? (
              <div className="rounded-xl border border-[#ba1a1a] bg-[#ffdad6] px-4 py-4 mb-4">
                <p className="font-body text-sm font-semibold text-[#93000a]">
                  {insightData.fallback_message}
                </p>
                <button
                  onClick={() => router.push('/goals')}
                  className="mt-3 inline-block rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#298dff', color: '#ffffff' }}
                >
                  Buka Goals
                </button>
              </div>
            ) : null}

            {/* Empty state */}
            {insightData.insight_available &&
              insightData.insights &&
              insightData.insights.length === 0 && (
              <div className="rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-6 text-center">
                <p className="font-body text-base font-semibold text-[#1e1e1e]">
                  Belum ada insight
                </p>
                <p className="font-body text-sm mt-1" style={{ color: 'rgba(30,30,30,0.65)' }}>
                  Catat beberapa transaksi dan buat goal dulu, nanti kami tampilkan
                  insight keuanganmu di sini.
                </p>
              </div>
            )}

            {/* Insight list */}
            {insightData.insight_available &&
              insightData.insights &&
              insightData.insights.length > 0 && (
              <div className="flex flex-col gap-4">
                {insightData.insights.map((insight, idx) => (
                  <InsightCard key={insight.id} insight={insight} isFirst={idx === 0} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Edge case: no data, no error, not loading */}
        {!error && !insightData && !loading && (
          <div className="rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-6 text-center">
            <p className="font-body text-sm" style={{ color: 'rgba(30,30,30,0.65)' }}>
              Belum ada data insight.
            </p>
          </div>
        )}
      </div>

      {/* ─── Bottom Navigation Bar ────────────────────────────────── */}
      <BottomNav activeTab="AI Assistant" />
    </div>
  )
}