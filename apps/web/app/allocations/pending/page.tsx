'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type {
  AllocationPendingResponse,
  AllocationSuggestionResponse,
} from '@/lib/api/types'
import SmartAllocationModal from '@/components/SmartAllocationModal'
import SuggestionCard from '@/components/SuggestionCard'
import BottomNav from '@/components/BottomNav'
import { Sparkles, AlertTriangle, ArrowLeft, Bell } from 'lucide-react'

export default function PendingAllocationsPage() {
  const router = useRouter()
  const [pending, setPending] = useState<AllocationPendingResponse['pending']>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [reviewSuggestion, setReviewSuggestion] = useState<AllocationSuggestionResponse | null>(null)
  const [reviewSideIncome, setReviewSideIncome] = useState<number | undefined>(undefined)

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
      // Determine side income amount from the pending item's nominal
      const pendingItem = pending.find((p) => p.transaksi_id === transaksiId)
      setReviewSuggestion(data)
      setReviewSideIncome(pendingItem?.nominal)
      setModalOpen(true)
    } catch {
      setError('Gagal memuat saran alokasi. Coba lagi.')
      setReviewingId(null)
      setReviewing(false)
    }
  }

  function handleModalClose() {
    setModalOpen(false)
    setReviewSuggestion(null)
    setReviewingId(null)
    setReviewing(false)
    setReviewSideIncome(undefined)
  }

  function handleConfirmed() {
    // Remove confirmed item from pending list
    if (reviewingId) {
      setPending((prev) => prev.filter((p) => p.transaksi_id !== reviewingId))
    }
    handleModalClose()
  }

  function handleSkipped() {
    // Remove skipped item from pending list
    if (reviewingId) {
      setPending((prev) => prev.filter((p) => p.transaksi_id !== reviewingId))
    }
    handleModalClose()
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fcfcfc' }}
      >
        <p
          className="text-sm"
          style={{
            fontFamily: 'Helvetica, sans-serif',
            color: 'rgba(30,30,30,0.65)',
          }}
        >
          Memuat...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fcfcfc' }}>
      {/*
        Responsive container:
        - default (360px): px-4
        - md (768px+): px-6
        - lg (1024px+): max-w-2xl centered mx-auto px-8
      */}
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

        {/* ── Page title + subtitle ── */}
        <div className="mt-6 mb-5">
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: "'Neulis', sans-serif",
              color: '#1e1e1e',
            }}
          >
            Saran Tertunda
          </h1>
          <p
            className="text-sm mt-1"
            style={{
              fontFamily: 'Helvetica, sans-serif',
              color: 'rgba(30,30,30,0.65)',
            }}
          >
            Saran Smart Allocation yang menunggu konfirmasi kamu.
          </p>
        </div>

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

        {/* ── Empty state (no CTA — resolved-state empty per UI-SPEC) ── */}
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
            {/* No CTA — this is a resolved-state empty */}
          </div>
        )}

        {/* ── Pending items list ── */}
        <div className="flex flex-col gap-4 mb-6">
          {pending.map((item, index) => (
            <SuggestionCard
              key={item.transaksi_id}
              item={item}
              isFirst={index === 0}
              loading={reviewing && reviewingId === item.transaksi_id}
              onReview={handleReview}
            />
          ))}
        </div>

        {/* ── Dismiss all ── */}
        {pending.length > 0 && (
          <div className="text-center pb-8">
            <button
              onClick={() => setPending([])}
              className="text-sm underline"
              style={{
                fontFamily: 'Helvetica, sans-serif',
                color: 'rgba(30,30,30,0.65)',
              }}
            >
              Hapus semua saran
            </button>
          </div>
        )}
      </div>

      {/* ─── Bottom Navigation Bar ────────────────────────────────── */}
      <BottomNav activeTab="AI Assistant" />

      {/* ── Reusable Smart Allocation Modal ── */}
      <SmartAllocationModal
        open={modalOpen}
        transaksiId={reviewingId ?? ''}
        suggestion={reviewSuggestion}
        sideIncomeAmount={reviewSideIncome}
        context="pending"
        onClose={handleModalClose}
        onConfirmed={handleConfirmed}
        onSkipped={handleSkipped}
      />
    </div>
  )
}
