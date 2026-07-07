'use client'

import type { AllocationPending } from '@/lib/api/types'
import { PiggyBank, ChevronRight } from 'lucide-react'

interface SuggestionCardProps {
  item: AllocationPending
  isFirst: boolean
  loading?: boolean
  onReview: (transaksiId: string) => void
}

function formatRp(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function SuggestionCard({
  item,
  isFirst,
  loading,
  onReview,
}: SuggestionCardProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid rgba(30,30,30,0.15)',
      }}
    >
      {/* Orange corner blob for first/high-priority item */}
      {isFirst ? (
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
                  {formatRp(item.nominal)} dari pemasukan sampingan baru
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.4)' }}
                >
                  Kedaluwarsa: {formatDate(item.expires_at)}
                </p>
              </div>
            </div>

            {/* Action row */}
            <div
              className="flex items-center justify-between mt-3 pt-3"
              style={{ borderTop: '1px solid rgba(30,30,30,0.08)' }}
            >
              <p
                className="text-sm font-semibold"
                style={{ fontFamily: 'Helvetica, sans-serif', color: '#298dff' }}
              >
                +{formatRp(item.nominal)}
              </p>
              <button
                onClick={() => onReview(item.transaksi_id)}
                disabled={loading}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-white text-xs font-semibold transition-all duration-200 disabled:opacity-60"
                style={{
                  fontFamily: 'Helvetica, sans-serif',
                  backgroundColor: '#298dff',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ff8929' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#298dff' }}
              >
                {loading ? 'Memuat...' : 'Tinjau Saran'}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      ) : (
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
                {formatRp(item.nominal)} dari pemasukan sampingan baru
              </p>
              <p
                className="text-xs mt-1"
                style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.4)' }}
              >
                Kedaluwarsa: {formatDate(item.expires_at)}
              </p>
            </div>
          </div>

          <div
            className="flex items-center justify-between mt-3 pt-3"
            style={{ borderTop: '1px solid rgba(30,30,30,0.08)' }}
          >
            <p
              className="text-sm font-semibold"
              style={{ fontFamily: 'Helvetica, sans-serif', color: '#298dff' }}
            >
              +{formatRp(item.nominal)}
            </p>
            <button
              onClick={() => onReview(item.transaksi_id)}
              disabled={loading}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-white text-xs font-semibold transition-all duration-200 disabled:opacity-60"
              style={{
                fontFamily: 'Helvetica, sans-serif',
                backgroundColor: '#298dff',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ff8929' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#298dff' }}
            >
              {loading ? 'Memuat...' : 'Tinjau'}
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}