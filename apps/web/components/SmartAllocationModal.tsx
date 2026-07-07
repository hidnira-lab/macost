'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiMutate } from '@/lib/api/client'
import type { AllocationSuggestionResponse, AllocationConfirmRequest, AllocationConfirmResponse } from '@/lib/api/types'
import { Sparkles, X } from 'lucide-react'

interface SmartAllocationModalProps {
  /** The transaction ID that triggered this allocation suggestion */
  transaksiId: string
  /** Raw allocation suggestion data from the API */
  suggestion: AllocationSuggestionResponse
  /** Called when the modal is dismissed without confirming */
  onDismiss: () => void
  /** Called after successful allocation confirmation */
  onConfirmed?: () => void
  /** Called when user chooses to skip */
  onSkip?: () => void
}

function formatRp(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

export default function SmartAllocationModal({
  transaksiId,
  suggestion,
  onDismiss,
  onConfirmed,
  onSkip,
}: SmartAllocationModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<'modal' | 'no_goal'>(
    suggestion.has_active_goal ? 'modal' : 'no_goal'
  )
  const [confirming, setConfirming] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // No active goal state
  if (step === 'no_goal') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(30,30,30,0.2)' }}
      >
        <div
          className="w-full max-w-sm rounded-3xl px-6 py-8 text-center"
          style={{
            backgroundColor: '#ffffff',
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(41,141,255,0.1)' }}
          >
            <Sparkles className="w-7 h-7" style={{ color: '#298dff' }} />
          </div>
          <h2
            className="text-xl font-bold mb-2"
            style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
          >
            Belum ada goal aktif
          </h2>
          <p
            className="text-sm mb-6"
            style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
          >
            Buat goal dulu supaya kami bisa menyarankan alokasi yang tepat.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                onDismiss()
                router.push('/goals/new')
              }}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm"
              style={{
                fontFamily: 'Helvetica, sans-serif',
                backgroundColor: '#298dff',
              }}
            >
              Buat Goal
            </button>
            <button
              onClick={onDismiss}
              className="text-sm font-medium"
              style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
            >
              Nanti saja
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main allocation modal
  const suggestedGoalName = suggestion.suggested_goal_name ?? 'Goal'
  const suggestedAmount = suggestion.suggested_amount ?? 0
  const suggestedPct = suggestion.suggested_pct ?? 0
  const alternatives = suggestion.alternative_goals ?? []

  async function handleConfirm() {
    if (!suggestion.suggested_goal_id) return

    setConfirming(true)
    setError(null)
    try {
      const body: AllocationConfirmRequest = {
        transaksi_id: transaksiId,
        goal_id: suggestion.suggested_goal_id,
        nominal_alokasi: suggestedAmount,
      }
      await apiMutate<AllocationConfirmResponse>('/api/allocations', 'POST', body)
      onConfirmed?.()
    } catch {
      setError('Gagal mengonfirmasi alokasi. Coba lagi.')
    } finally {
      setConfirming(false)
    }
  }

  async function handleSkip() {
    setSkipping(true)
    setError(null)
    try {
      await apiMutate(`/api/allocations/${transaksiId}/skip`, 'POST', null)
      onSkip?.()
    } catch {
      setError('Gagal melewati alokasi.')
    } finally {
      setSkipping(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(30,30,30,0.2)' }}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(252,252,252,0.85)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(30,30,30,0.15)',
        }}
      >
        {/* Header illustration band */}
        <div
          className="h-32 flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: 'rgba(41,141,255,0.2)' }}
        >
          {/* Decorative blobs */}
          <div
            className="absolute w-24 h-24 rounded-full"
            style={{ backgroundColor: 'rgba(41,141,255,0.15)', top: '-20%', left: '-10%' }}
          />
          <div
            className="absolute w-20 h-20 rounded-full"
            style={{ backgroundColor: 'rgba(41,141,255,0.1)', bottom: '-15%', right: '5%' }}
          />
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center relative z-10"
            style={{ backgroundColor: '#ffffff' }}
          >
            <Sparkles className="w-7 h-7" style={{ color: '#298dff' }} />
          </div>
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(30,30,30,0.08)' }}
            aria-label="Tutup"
          >
            <X className="w-4 h-4" style={{ color: '#1e1e1e' }} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pt-5 pb-6">
          <h2
            className="text-2xl font-bold text-center mb-3"
            style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
          >
            Smart Allocation
          </h2>

          <p
            className="text-sm text-center leading-relaxed mb-4"
            style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
          >
            Your side income of{' '}
            <span className="font-bold" style={{ color: '#1e1e1e' }}>
              {formatRp(suggestedAmount * (100 / suggestedPct))}
            </span>{' '}
            just came in! We suggest allocating{' '}
            <span className="font-bold" style={{ color: '#298dff' }}>
              {formatRp(suggestedAmount)} ({suggestedPct}%)
            </span>{' '}
            to your{' '}
            <span className="font-semibold">{suggestedGoalName}</span> goal — it's
            your top priority right now.
          </p>

          {/* Mini progress card */}
          <div
            className="rounded-xl px-4 py-4 mb-4"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid rgba(30,30,30,0.15)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p
                className="text-sm font-semibold"
                style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
              >
                {suggestedGoalName}
              </p>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  fontFamily: 'Helvetica, sans-serif',
                  backgroundColor: 'rgba(41,141,255,0.1)',
                  color: '#298dff',
                }}
              >
                Priority 1
              </span>
            </div>
            {/* Split progress bar */}
            <div className="w-full rounded-full h-2 mb-2 flex" style={{ backgroundColor: 'rgba(30,30,30,0.08)' }}>
              <div
                className="h-2 rounded-l-full"
                style={{
                  width: '60%',
                  backgroundColor: 'rgba(30,30,30,0.22)',
                }}
              />
              <div
                className="h-2 rounded-r-full"
                style={{
                  width: '40%',
                  backgroundColor: '#298dff',
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span
                className="text-xs"
                style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
              >
                Current Progress
              </span>
              <span
                className="text-xs font-semibold"
                style={{ fontFamily: 'Helvetica, sans-serif', color: '#298dff' }}
              >
                + {formatRp(suggestedAmount)}
              </span>
            </div>
          </div>

          {/* Alternative goals */}
          {alternatives.length > 0 && (
            <div className="mb-4">
              <p
                className="text-xs font-semibold mb-2"
                style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
              >
                Alternative goals:
              </p>
              <div className="flex flex-wrap gap-2">
                {alternatives.map((alt) => (
                  <span
                    key={alt.goal_id}
                    className="text-xs px-3 py-1 rounded-full"
                    style={{
                      fontFamily: 'Helvetica, sans-serif',
                      backgroundColor: 'rgba(30,30,30,0.05)',
                      color: 'rgba(30,30,30,0.65)',
                    }}
                  >
                    #{alt.rank} {alt.goal_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="rounded-lg px-3 py-2 mb-3"
              style={{ backgroundColor: '#ffdad6' }}
            >
              <p
                className="text-xs"
                style={{ fontFamily: 'Helvetica, sans-serif', color: '#93000a' }}
                role="alert"
              >
                {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-60"
              style={{
                fontFamily: 'Helvetica, sans-serif',
                backgroundColor: '#298dff',
              }}
            >
              {confirming ? 'Mengonfirmasi...' : 'Confirm Allocation'}
            </button>
            <button
              onClick={() => {/* TODO: open edit amount */}}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{
                fontFamily: 'Helvetica, sans-serif',
                color: '#1e1e1e',
                border: '1px solid rgba(30,30,30,0.15)',
                backgroundColor: 'transparent',
              }}
            >
              Change Amount
            </button>
            <button
              onClick={handleSkip}
              disabled={skipping}
              className="text-sm font-medium transition-opacity disabled:opacity-60"
              style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
            >
              {skipping ? 'Melewati...' : 'Not Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}