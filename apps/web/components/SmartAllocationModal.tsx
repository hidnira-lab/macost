'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiMutate } from '@/lib/api/client'
import type {
  AllocationSuggestionResponse,
  AllocationConfirmRequest,
  AllocationConfirmResponse,
} from '@/lib/api/types'
import { Sparkles, X, PiggyBank } from 'lucide-react'

interface SmartAllocationModalProps {
  open: boolean
  transaksiId: string
  suggestion: AllocationSuggestionResponse | null
  /** Side income amount for dynamic body text — derived from suggestion if not provided */
  sideIncomeAmount?: number
  onClose: () => void
  onConfirmed: () => void
  onSkipped: () => void
}

function formatRp(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

function formatRpShort(value: number) {
  if (value >= 1000000) {
    return `Rp ${(value / 1000000).toFixed(1).replace('.0', '')}jt`
  }
  if (value >= 1000) {
    return `Rp ${(value / 1000).toFixed(0).replace('.0', '')}rb`
  }
  return formatRp(value)
}

export default function SmartAllocationModal({
  open,
  transaksiId,
  suggestion,
  sideIncomeAmount,
  onClose,
  onConfirmed,
  onSkipped,
}: SmartAllocationModalProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState(false)
  const [customAmount, setCustomAmount] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setConfirming(false)
      setSkipping(false)
      setError(null)
      setEditingAmount(false)
      setCustomAmount(null)
    }
  }, [open])

  // Focus input when editing mode activates
  useEffect(() => {
    if (editingAmount && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingAmount])

  if (!open) return null

  // ── No active goal state ──
  if (!suggestion?.has_active_goal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ backgroundColor: 'rgba(30,30,30,0.2)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-3xl px-6 py-8 text-center"
          style={{ backgroundColor: '#ffffff' }}
          onClick={(e) => e.stopPropagation()}
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
                onClose()
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
              onClick={onClose}
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

  // ── Main allocation modal ──
  // Non-null assertion safe because we already returned above for null/!has_active_goal
  const data = suggestion!
  const suggestedGoalName = data.suggested_goal_name ?? 'Goal'
  const suggestedAmount = data.suggested_amount ?? 0
  const suggestedPct = data.suggested_pct ?? 0
  const alternatives = data.alternative_goals ?? []
  const incomeAmount = sideIncomeAmount ?? (suggestedPct > 0 ? Math.round(suggestedAmount / (suggestedPct / 100)) : 0)
  const allocationAmount = customAmount ?? suggestedAmount

  // Calculate progress bar ratio
  const progressRatio = 0.6 // 60% existing, 40% suggested addition
  const suggestedRatio = 0.4

  async function handleConfirm() {
    if (!data.suggested_goal_id) return
    if (allocationAmount <= 0) {
      setError('Nominal alokasi harus lebih dari Rp 0.')
      return
    }
    if (allocationAmount > incomeAmount) {
      setError('Nominal alokasi tidak boleh melebihi pemasukan sampingan.')
      return
    }

    setConfirming(true)
    setError(null)
    try {
      const body: AllocationConfirmRequest = {
        transaksi_id: transaksiId,
        goal_id: data.suggested_goal_id!,
        nominal_alokasi: allocationAmount,
      }
      await apiMutate<AllocationConfirmResponse>('/api/allocations', 'POST', body)
      onConfirmed()
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
      onSkipped()
    } catch {
      setError('Gagal melewati alokasi.')
    } finally {
      setSkipping(false)
    }
  }

  function handleToggleEditAmount() {
    if (editingAmount) {
      // Save custom amount
      setEditingAmount(false)
    } else {
      setCustomAmount(allocationAmount)
      setEditingAmount(true)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(30,30,30,0.2)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(252,252,252,0.85)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(30,30,30,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header illustration band ── */}
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
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(30,30,30,0.08)' }}
            aria-label="Tutup"
          >
            <X className="w-4 h-4" style={{ color: '#1e1e1e' }} />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="px-6 pt-5 pb-6">
          <h2
            className="text-2xl font-bold text-center mb-3"
            style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
          >
            Smart Allocation
          </h2>

          {/* ── Dynamic body text ── */}
          <p
            className="text-sm text-center leading-relaxed mb-4"
            style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
          >
            Pemasukan sampingan sebesar{' '}
            <span className="font-bold" style={{ color: '#1e1e1e' }}>
              {formatRp(incomeAmount)}
            </span>{' '}
            masuk! Kami sarankan alokasikan{' '}
            <span className="font-bold" style={{ color: '#298dff' }}>
              {formatRp(suggestedAmount)} ({suggestedPct}%)
            </span>{' '}
            ke goal{' '}
            <span className="font-semibold">{suggestedGoalName}</span> — ini
            prioritas utama kamu saat ini.
          </p>

          {/* ── Edit amount input ── */}
          {editingAmount && (
            <div className="mb-4">
              <label
                className="text-xs font-semibold mb-1 block"
                style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
              >
                Ubah nominal alokasi
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
                >
                  Rp
                </span>
                <input
                  ref={inputRef}
                  type="number"
                  min={0}
                  max={incomeAmount}
                  value={customAmount ?? suggestedAmount}
                  onChange={(e) => setCustomAmount(Number(e.target.value) || 0)}
                  className="w-full rounded-xl px-10 py-3 text-sm font-semibold outline-none"
                  style={{
                    fontFamily: 'Helvetica, sans-serif',
                    color: '#1e1e1e',
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(30,30,30,0.15)',
                  }}
                />
              </div>
              <p
                className="text-xs mt-1"
                style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.4)' }}
              >
                Maksimal {formatRp(incomeAmount)}
              </p>
            </div>
          )}

          {/* ── Mini progress card ── */}
          <div
            className="rounded-xl px-4 py-4 mb-4"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid rgba(30,30,30,0.15)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4" style={{ color: 'rgba(30,30,30,0.65)' }} />
                <p
                  className="text-sm font-semibold"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
                >
                  {suggestedGoalName}
                </p>
              </div>
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
            <div
              className="w-full rounded-full h-3 flex mb-2"
              style={{ backgroundColor: 'rgba(30,30,30,0.08)' }}
            >
              <div
                className="h-3 rounded-l-full"
                style={{
                  width: `${progressRatio * 100}%`,
                  backgroundColor: 'rgba(30,30,30,0.22)',
                }}
              />
              <div
                className="h-3 rounded-r-full"
                style={{
                  width: `${suggestedRatio * 100}%`,
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
                + {formatRpShort(allocationAmount)}
              </span>
            </div>
          </div>

          {/* ── Alternative goals ── */}
          {alternatives.length > 0 && (
            <div className="mb-4">
              <p
                className="text-xs font-semibold mb-2"
                style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
              >
                Goal alternatif:
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

          {/* ── Error ── */}
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

          {/* ── Actions ── */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full py-3 rounded-full text-white font-semibold text-sm transition-opacity disabled:opacity-60"
              style={{
                fontFamily: 'Helvetica, sans-serif',
                backgroundColor: '#ff8929',
              }}
            >
              {confirming ? 'Mengonfirmasi...' : 'Konfirmasi Alokasi'}
            </button>

            <button
              onClick={handleToggleEditAmount}
              className="w-full py-3 rounded-full text-sm font-semibold transition-colors"
              style={{
                fontFamily: 'Helvetica, sans-serif',
                color: '#1e1e1e',
                border: '1px solid rgba(30,30,30,0.15)',
                backgroundColor: 'transparent',
              }}
            >
              {editingAmount ? 'Gunakan Nominal Ini' : 'Ubah Nominal'}
            </button>

            <button
              onClick={handleSkip}
              disabled={skipping}
              className="w-full text-sm font-medium text-center transition-opacity disabled:opacity-60 py-2"
              style={{
                fontFamily: 'Helvetica, sans-serif',
                color: '#298dff',
                backgroundColor: 'transparent',
                border: 'none',
              }}
            >
              {skipping ? 'Melewati...' : 'Lewati'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}