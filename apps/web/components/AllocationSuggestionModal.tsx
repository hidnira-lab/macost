'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiMutate } from '@/lib/api/client'
import { isApiErrorBody } from '@/lib/api/types'
import type {
  AllocationSuggestionResponse,
  AllocationConfirmRequest,
  AllocationConfirmResponse,
  AllocationSkipResponse,
} from '@/lib/api/types'
import { enqueue } from '@/lib/offline/queue'

export interface AllocationSuggestionModalProps {
  open: boolean
  suggestion: AllocationSuggestionResponse
  transaksiId: string
  /** Called after the user has confirmed or skipped — parent refetches/closes */
  onResolved: () => void
  onClose: () => void
}

function formatRp(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

export default function AllocationSuggestionModal({
  open,
  suggestion,
  transaksiId,
  onResolved,
  onClose,
}: AllocationSuggestionModalProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const isSuggestionValid =
    Boolean(suggestion.suggested_goal_id) && (suggestion.suggested_amount ?? 0) > 0

  async function handleConfirm() {
    if (!suggestion.suggested_goal_id || !suggestion.suggested_amount || suggestion.suggested_amount <= 0) {
      setError('Saran alokasi tidak valid. Coba tutup dan buka kembali.')
      return
    }
    setBusy(true)
    setError(null)

    const body: AllocationConfirmRequest = {
      transaksi_id: transaksiId,
      goal_id: suggestion.suggested_goal_id,
      nominal_alokasi: suggestion.suggested_amount,
    }

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

    if (isOffline) {
      try {
        await enqueue({ kind: 'allocation_confirm', payload: body })
        onResolved()
      } catch {
        setError('Gagal menyimpan alokasi. Coba lagi.')
      } finally {
        setBusy(false)
      }
      return
    }

    try {
      await apiMutate<AllocationConfirmResponse>('/api/allocations', 'POST', body)
      onResolved()
    } catch (err) {
      if (!isApiErrorBody(err)) {
        try {
          await enqueue({ kind: 'allocation_confirm', payload: body })
          onResolved()
        } catch {
          setError('Gagal menyimpan alokasi. Coba lagi.')
        }
      } else {
        setError('Gagal menyimpan alokasi. Coba lagi.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleSkip() {
    setBusy(true)
    setError(null)

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

    if (isOffline) {
      try {
        await enqueue({ kind: 'allocation_skip', transactionId: transaksiId })
        onResolved()
      } catch {
        setError('Gagal melewati saran alokasi. Coba lagi.')
      } finally {
        setBusy(false)
      }
      return
    }

    try {
      await apiMutate<AllocationSkipResponse>(
        `/api/allocations/${transaksiId}/skip`,
        'POST',
        null
      )
      onResolved()
    } catch (err) {
      if (!isApiErrorBody(err)) {
        try {
          await enqueue({ kind: 'allocation_skip', transactionId: transaksiId })
          onResolved()
        } catch {
          setError('Gagal melewati saran alokasi. Coba lagi.')
        }
      } else {
        setError('Gagal melewati saran alokasi. Coba lagi.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(30,30,30,0.2)] px-4 backdrop-blur-[1px]">
      <div className="w-full max-w-[384px] overflow-hidden rounded-t-3xl rounded-b-2xl bg-[rgba(252,252,252,0.85)] shadow-2xl backdrop-blur-[12px]">
        {/* Header illustration band */}
        <div className="relative flex h-32 items-center justify-center bg-[rgba(41,141,255,0.2)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#298dff" />
            </svg>
          </div>
        </div>

        <div className="px-6 py-6">
          {suggestion.has_active_goal ? (
            <>
              <h2 className="font-display text-center text-2xl font-extrabold text-[#1e1e1e]">
                Smart Allocation
              </h2>
              <p className="font-body mt-3 text-center text-sm text-[rgba(30,30,30,0.65)]">
                Side income kamu sebesar{' '}
                <span className="font-semibold text-[#1e1e1e]">
                  {formatRp(suggestion.suggested_amount ?? 0)}
                </span>{' '}
                baru saja masuk! Kami sarankan alokasikan{' '}
                <span className="font-semibold text-[#1e1e1e]">
                  {formatRp(suggestion.suggested_amount ?? 0)} (
                  {suggestion.suggested_pct ?? 0}%)
                </span>{' '}
                ke goal{' '}
                <span className="font-semibold text-[#1e1e1e]">
                  {suggestion.suggested_goal_name}
                </span>{' '}
                — ini prioritas tertinggimu saat ini.
              </p>

              <div className="mt-4 rounded-xl border border-[rgba(30,30,30,0.15)] bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm font-semibold text-[#1e1e1e]">
                    {suggestion.suggested_goal_name}
                  </span>
                  <span className="font-body rounded-full bg-[rgba(41,141,255,0.14)] px-2 py-0.5 text-[11px] font-bold text-[#298dff]">
                    Prioritas 1
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgba(30,30,30,0.08)]">
                  <div
                    className="h-full rounded-full bg-[#298dff]"
                    style={{ width: `${Math.min(suggestion.suggested_pct ?? 0, 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <span className="font-body text-sm font-semibold text-[#298dff]">
                    + {formatRp(suggestion.suggested_amount ?? 0)}
                  </span>
                </div>
              </div>

              {error && (
                <p className="font-body mt-3 text-center text-sm text-[#93000a]" role="alert">
                  {error}
                </p>
              )}

              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={handleConfirm}
                  disabled={busy || !isSuggestionValid}
                  className="font-body w-full rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #298dff, #065fc5)' }}
                >
                  {busy ? 'Memproses...' : 'Konfirmasi Alokasi'}
                </button>
                <button
                  onClick={handleSkip}
                  disabled={busy}
                  className="font-body w-full py-2 text-sm font-semibold text-[#298dff] disabled:opacity-60"
                >
                  Lewati
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-center text-2xl font-extrabold text-[#1e1e1e]">
                Belum ada goal aktif
              </h2>
              <p className="font-body mt-3 text-center text-sm text-[rgba(30,30,30,0.65)]">
                Buat goal dulu supaya kami bisa menyarankan alokasi yang tepat.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={() => router.push('/goals/new')}
                  className="font-body w-full rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #298dff, #065fc5)' }}
                >
                  Buat Goal
                </button>
                <button
                  onClick={onClose}
                  className="font-body w-full py-2 text-sm font-semibold text-[#298dff]"
                >
                  Nanti saja
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
