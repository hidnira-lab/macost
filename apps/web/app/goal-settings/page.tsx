'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, apiMutate, isAuthError } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import BottomNav from '@/components/BottomNav'
import SawWeightEditor from '@/components/SawWeightEditor'
import type { GoalSettings, GoalSettingsUpdateRequest, GoalSettingsWeights } from '@/lib/api/types'

const USE_MOCK =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('mock') ??
      process.env.NEXT_PUBLIC_USE_MOCK === 'true'
    : process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export default function GoalSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<GoalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      const data = await apiFetch<GoalSettings>('/api/goal-settings')
      setSettings(data)
    } catch (err) {
      if (isAuthError(err)) {
        router.push('/login')
        return
      }
      setError('Gagal memuat pengaturan bobot.')
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
      await loadSettings()
    }
    init()
  }, [router, loadSettings])

  const handleSave = useCallback(
    async (strategy: string, weights: GoalSettingsWeights) => {
      const body: GoalSettingsUpdateRequest = {
        strategy: strategy as 'quick_win' | 'importance_first',
        weights,
      }
      await apiMutate<GoalSettings>('/api/goal-settings', 'PUT', body)
    },
    []
  )

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
        {/* ── Header ── */}
        <header className="sticky top-0 z-10 -mx-4 flex h-16 items-center justify-between border-b border-[rgba(30,30,30,0.08)] bg-[rgba(252,252,252,0.8)] px-4 backdrop-blur-[6px] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[rgba(30,30,30,0.05)]"
            aria-label="Kembali"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="#1e1e1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-[#1e1e1e]">
            Prioritas Goal
          </h1>
          <div className="h-9 w-9" />
        </header>

        {error && (
          <div className="mt-4 rounded-xl border border-[#ba1a1a] bg-[#ffdad6] px-4 py-3">
            <p className="font-body text-sm text-[#93000a]" role="alert">
              {error}
            </p>
          </div>
        )}

        {settings && (
          <div className="mt-6">
            <SawWeightEditor
              initialWeights={settings.weights}
              initialStrategy={settings.strategy}
              onSave={handleSave}
            />
          </div>
        )}
      </div>

      {/* ─── Bottom Navigation Bar ────────────────────────────────── */}
      <BottomNav activeTab="Goals" />
    </div>
  )
}