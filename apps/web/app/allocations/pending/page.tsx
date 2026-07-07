'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, apiMutate } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type { AllocationPendingResponse, AllocationSuggestionResponse, AllocationConfirmResponse, AllocationConfirmRequest } from '@/lib/api/types'
import {
  Bell,
  User,
  PiggyBank,
  ChevronRight,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'

function formatRp(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PendingAllocationsPage() {
  const router = useRouter()
  const [pending, setPending] = useState<AllocationPendingResponse['pending']>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewSuggestion, setReviewSuggestion] = useState<AllocationSuggestionResponse | null>(null)
  const [reviewing, setReviewing] = useState(false)

  const loadPending = useCallback(async () => {
    try {
      const data = await apiFetch<AllocationPendingResponse>('/api/allocations/pending')
      setPending(data.pending)
    } catch {
      setError('Gagal memuat saran tertunda')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const token = await getToken()
      if (!token) {
        router.push('/login')
        return
      }
      await loadPending()
    }
    init()
  }, [router, loadPending])

  async function handleReview(transaksiId: string) {
    setReviewingId(transaksiId)
    setReviewing(true)
    setError(null)
    try {
      const data = await apiFetch<AllocationSuggestionResponse>(
        `/api/transactions/${transaksiId}/allocation-suggestion`
      )
      setReviewSuggestion(data)
    } catch {
      setError('Gagal memuat saran alokasi. Coba lagi.')
      setReviewingId(null)
      setReviewing(false)
    }
  }

  async function handleConfirm() {
    if (!reviewingId || !reviewSuggestion?.suggested_goal_id) return
    const amount = reviewSuggestion.suggested_amount ?? 0
    try {
      const body: AllocationConfirmRequest = {
        transaksi_id: reviewingId,
        goal_id: reviewSuggestion.suggested_goal_id,
        nominal_alokasi: amount,
      }
      await apiMutate<AllocationConfirmResponse>('/api/allocations', 'POST', body)
      // Remove from list
      setPending((prev) => prev.filter((p) => p.transaksi_id !== reviewingId))
      setReviewSuggestion(null)
      setReviewingId(null)
      setReviewing(false)
    } catch {
      setError('Gagal mengonfirmasi alokasi.')
    }
  }

  async function handleSkip() {
    if (!reviewingId) return
    try {
      await apiMutate(`/api/allocations/${reviewingId}/skip`, 'POST', null)
      // Keep in pending but dismiss the review
      setReviewSuggestion(null)
      setReviewingId(null)
      setReviewing(false)
    } catch {
      setError('Gagal melewati alokasi.')
    }
  }

  async function handleDismissAll() {
    // Skip all pending items
    for (const item of pending) {
      try {
        await apiMutate(`/api/allocations/${item.transaksi_id}/skip`, 'POST', null)
      } catch {
        // Continue
      }
    }
    setPending([])
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fcfcfc' }}>
        <p className="text-sm" style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}>
          Memuat...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fcfcfc' }}>
      <div className="max-w-md mx-auto px-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between pt-8 pb-5">
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: "'Neulis', sans-serif",
              color: '#298dff',
            }}
          >
            Pending Suggestions
          </h1>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(30,30,30,0.05)' }} aria-label="Notifikasi">
              <Bell className="w-4 h-4" style={{ color: '#1e1e1e' }} />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#298dff' }} aria-label="Profil">
              <User className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── Subtitle ── */}
        <p
          className="text-sm mb-5"
          style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
        >
          Smart Allocation suggestions waiting for your confirmation.
        </p>

        {/* ── Error banner ── */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2"
            style={{ backgroundColor: '#ffdad6', border: '1px solid #ba1a1a' }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#93000a' }} />
            <p
              className="text-sm"
              style={{ fontFamily: 'Helvetica, sans-serif', color: '#93000a' }}
              role="alert"
            >
              {error}
            </p>
          </div>
        )}

        {/* ── Empty state ── */}
        {pending.length === 0 && (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(41,141,255,0.1)' }}
            >
              <Sparkles className="w-8 h-8" style={{ color: '#298dff' }} />
            </div>
            <p
              className="font-semibold mb-2"
              style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
            >
              Tidak ada saran tertunda
            </p>
            <p
              className="text-sm mb-6"
              style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
            >
              Semua saran alokasi sudah kamu proses.
            </p>
          </div>
        )}

        {/* ── Pending items list ── */}
        <div className="flex flex-col gap-4 mb-6">
          {pending.map((item) => (
            <div
              key={item.transaksi_id}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(30,30,30,0.15)',
              }}
            >
              {/* Orange corner blob for first item */}
              {pending.indexOf(item) === 0 && (
                <div className="relative">
                  <div
                    className="absolute -top-8 -right-8 w-24 h-24 rounded-bl-full"
                    style={{ backgroundColor: 'rgba(255,137,41,0.15)' }}
                  />
                  <div className="relative z-10 px-4 pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'rgba(41,141,255,0.1)' }}
                      >
                        <PiggyBank className="w-5 h-5" style={{ color: '#298dff' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-base font-semibold truncate"
                          style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
                        >
                          {item.suggested_goal_name}
                        </p>
                        <p
                          className="text-sm mt-0.5"
                          style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
                        >
                          {formatRp(item.nominal)} dari side income baru
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.4)' }}
                        >
                          Expires: {formatDate(item.expires_at)}
                        </p>
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(30,30,30,0.08)' }}>
                      <p
                        className="text-sm font-semibold"
                        style={{ fontFamily: 'Helvetica, sans-serif', color: '#298dff' }}
                      >
                        +{formatRp(item.nominal)}
                      </p>
                      <button
                        onClick={() => handleReview(item.transaksi_id)}
                        disabled={reviewing && reviewingId === item.transaksi_id}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-white text-xs font-semibold transition-opacity disabled:opacity-60"
                        style={{
                          fontFamily: 'Helvetica, sans-serif',
                          backgroundColor: '#298dff',
                        }}
                      >
                        {reviewing && reviewingId === item.transaksi_id ? 'Loading...' : 'Review'}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Non-first items (no corner blob) */}
              {pending.indexOf(item) > 0 && (
                <div className="px-4 pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'rgba(41,141,255,0.1)' }}
                    >
                      <PiggyBank className="w-5 h-5" style={{ color: '#298dff' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-base font-semibold truncate"
                        style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
                      >
                        {item.suggested_goal_name}
                      </p>
                      <p
                        className="text-sm mt-0.5"
                        style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
                      >
                        {formatRp(item.nominal)} dari side income baru
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.4)' }}
                      >
                        Expires: {formatDate(item.expires_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(30,30,30,0.08)' }}>
                    <p
                      className="text-sm font-semibold"
                      style={{ fontFamily: 'Helvetica, sans-serif', color: '#298dff' }}
                    >
                      +{formatRp(item.nominal)}
                    </p>
                    <button
                      onClick={() => handleReview(item.transaksi_id)}
                      disabled={reviewing && reviewingId === item.transaksi_id}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-white text-xs font-semibold transition-opacity disabled:opacity-60"
                      style={{
                        fontFamily: 'Helvetica, sans-serif',
                        backgroundColor: '#298dff',
                      }}
                    >
                      {reviewing && reviewingId === item.transaksi_id ? 'Loading...' : 'Review'}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Dismiss all ── */}
        {pending.length > 0 && (
          <div className="text-center pb-8">
            <button
              onClick={handleDismissAll}
              className="text-sm underline"
              style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
            >
              Dismiss all
            </button>
          </div>
        )}
      </div>

      {/* ── Review Modal ── */}
      {reviewing && reviewSuggestion && reviewingId && (
        <ReviewModal
          suggestion={reviewSuggestion}
          onConfirm={handleConfirm}
          onSkip={handleSkip}
          onClose={() => {
            setReviewSuggestion(null)
            setReviewingId(null)
            setReviewing(false)
          }}
        />
      )}
    </div>
  )
}

function ReviewModal({
  suggestion,
  onConfirm,
  onSkip,
  onClose,
}: {
  suggestion: AllocationSuggestionResponse
  onConfirm: () => void
  onSkip: () => void
  onClose: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  if (!suggestion.has_active_goal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(30,30,30,0.2)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-3xl px-6 py-8 text-center"
          style={{ backgroundColor: '#ffffff' }}
          onClick={(e) => e.stopPropagation()}
        >
          <p
            className="text-sm font-semibold"
            style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
          >
            Goal sudah tidak aktif.
          </p>
          <button
            onClick={onClose}
            className="mt-4 text-sm"
            style={{ fontFamily: 'Helvetica, sans-serif', color: '#298dff' }}
          >
            Tutup
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(30,30,30,0.2)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-6"
        style={{
          backgroundColor: '#ffffff',
          boxShadow: '0 8px 32px rgba(30,30,30,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-xl font-bold text-center mb-3"
          style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
        >
          Review Allocation
        </h2>
        <p
          className="text-sm text-center mb-4"
          style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
        >
          Allocate{' '}
          <span className="font-bold" style={{ color: '#298dff' }}>
            {suggestion.suggested_amount ? formatRp(suggestion.suggested_amount) : '—'}
          </span>{' '}
          to{' '}
          <span className="font-semibold">{suggestion.suggested_goal_name}</span>?
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={async () => {
              setConfirming(true)
              await onConfirm()
            }}
            disabled={confirming}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-60"
            style={{
              fontFamily: 'Helvetica, sans-serif',
              backgroundColor: '#298dff',
            }}
          >
            {confirming ? 'Mengonfirmasi...' : 'Konfirmasi Alokasi'}
          </button>
          <button
            onClick={onSkip}
            className="text-sm font-medium text-center"
            style={{ fontFamily: 'Helvetica, sans-serif', color: '#298dff' }}
          >
            Lewati
          </button>
        </div>
      </div>
    </div>
  )
}