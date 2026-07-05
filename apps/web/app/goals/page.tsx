'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, apiMutate } from '@/lib/api/client'
import { getToken, clearToken } from '@/lib/auth/session'
import type { GoalsResponse, Goal, GoalSettings, GoalSettingsUpdateRequest } from '@/lib/api/types'

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
      // Non-critical — settings fetch failure shouldn't block the page
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

  if (loading) {
    return (
      <div className="bg-[#1e1e1e] min-h-screen flex items-center justify-center">
        <p
          className="text-[#fcfcfc]/60 text-sm"
          style={{ fontFamily: 'Helvetica, sans-serif' }}
        >
          Memuat goal...
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[#1e1e1e] min-h-screen">
      <div className="max-w-md mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1
            className="text-2xl font-bold text-[#fcfcfc]"
            style={{ fontFamily: "'Neulis', sans-serif" }}
          >
            Goals
          </h1>
          <button
            onClick={handleLogout}
            className="text-sm text-[#fcfcfc]/50 hover:text-[#fcfcfc] transition-colors"
            style={{ fontFamily: 'Helvetica, sans-serif' }}
          >
            Logout
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            <p
              className="text-red-400 text-sm"
              style={{ fontFamily: 'Helvetica, sans-serif' }}
              role="alert"
            >
              {error}
            </p>
          </div>
        )}

        {/* Strategy toggle — segmented control */}
        <div className="mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex">
            <button
              onClick={() => handleStrategyToggle('quick_win')}
              disabled={toggleLoading}
              className={`flex-1 text-sm font-semibold rounded-lg px-4 py-2 transition-colors ${
                strategy === 'quick_win'
                  ? 'bg-[#ff8929] text-[#fcfcfc]'
                  : 'text-[#fcfcfc]/60 hover:text-[#fcfcfc]'
              }`}
              style={{ fontFamily: 'Helvetica, sans-serif' }}
            >
              Quick Win
            </button>
            <button
              onClick={() => handleStrategyToggle('importance_first')}
              disabled={toggleLoading}
              className={`flex-1 text-sm font-semibold rounded-lg px-4 py-2 transition-colors ${
                strategy === 'importance_first'
                  ? 'bg-[#ff8929] text-[#fcfcfc]'
                  : 'text-[#fcfcfc]/60 hover:text-[#fcfcfc]'
              }`}
              style={{ fontFamily: 'Helvetica, sans-serif' }}
            >
              Importance-First
            </button>
          </div>
        </div>

        {/* Goal list */}
        <div className={`flex flex-col gap-3 mb-6 transition-opacity ${toggleLoading ? 'opacity-50' : ''}`}>
          {goals.length === 0 && !loading && (
            <div className="text-center py-8">
              <p
                className="text-[#fcfcfc] font-semibold mb-2"
                style={{ fontFamily: "'Neulis', sans-serif" }}
              >
                Belum ada goal
              </p>
              <p
                className="text-[#fcfcfc]/40 text-sm mb-6"
                style={{ fontFamily: 'Helvetica, sans-serif' }}
              >
                Buat goal pertama kamu dan mulai menabung menuju targetmu.
              </p>
              <button
                onClick={() => router.push('/goals/new')}
                className="bg-[#ff8929] hover:bg-[#f77e2d] text-[#fcfcfc] font-semibold rounded-xl px-4 py-3 transition-colors"
                style={{ fontFamily: 'Helvetica, sans-serif' }}
              >
                + Buat Goal
              </button>
            </div>
          )}

          {goals.map((goal) => (
            <div
              key={goal.id_goal}
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[#fcfcfc] font-medium truncate"
                    style={{ fontFamily: 'Helvetica, sans-serif' }}
                  >
                    {goal.nama_goal}
                  </p>
                  <p
                    className="text-[#fcfcfc]/60 text-sm mt-0.5"
                    style={{ fontFamily: 'Helvetica, sans-serif' }}
                  >
                    Rp {goal.nominal_terkumpul.toLocaleString('id-ID')} / Rp {goal.nominal_target.toLocaleString('id-ID')}
                  </p>
                </div>
                <span
                  className="bg-[#ff8929]/20 text-[#ff8929] text-xs font-semibold rounded-full px-2.5 py-0.5 shrink-0"
                  style={{ fontFamily: 'Helvetica, sans-serif' }}
                >
                  #{goal.rank}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-[#ff8929] h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(goal.progress_pct, 100)}%` }}
                />
              </div>
              <p
                className="text-[#fcfcfc]/40 text-xs mt-1 text-right"
                style={{ fontFamily: 'Helvetica, sans-serif' }}
              >
                {goal.progress_pct}%
              </p>
            </div>
          ))}
        </div>

        {/* Persistent CTA — always visible when goals exist */}
        {goals.length > 0 && (
          <button
            onClick={() => router.push('/goals/new')}
            className="w-full bg-[#ff8929] hover:bg-[#f77e2d] text-[#fcfcfc] font-semibold rounded-xl px-4 py-3 transition-colors"
            style={{ fontFamily: 'Helvetica, sans-serif' }}
          >
            + Buat Goal
          </button>
        )}
      </div>
    </div>
  )
}