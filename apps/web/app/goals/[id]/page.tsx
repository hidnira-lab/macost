'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type { GoalDetailResponse } from '@/lib/api/types'
import {
  ArrowLeft,
  Calendar,
  Edit3,
  Trash2,
  PiggyBank,
  RotateCcw,
} from 'lucide-react'
import GoalPixelArt from '@/components/GoalPixelArt'

function formatRp(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function GoalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [goal, setGoal] = useState<GoalDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        if (!token) {
          router.push('/login')
          return
        }
        const data = await apiFetch<GoalDetailResponse>(`/api/goals/${id}`)
        setGoal(data)
      } catch {
        setError('Gagal memuat detail goal')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  async function handleDelete() {
    if (!goal) return
    const confirmed = window.confirm('Hapus goal ini? Tindakan ini tidak dapat dibatalkan.')
    if (!confirmed) return
    try {
      const { apiMutate } = await import('@/lib/api/client')
      await apiMutate(`/api/goals/${id}`, 'DELETE', null)
      router.push('/goals')
    } catch (err: unknown) {
      const { isApiErrorBody } = await import('@/lib/api/types')
      if (isApiErrorBody(err) && err.error.code === 'GOAL_HAS_ALLOCATIONS') {
        setError('Goal ini punya riwayat alokasi, tidak bisa dihapus.')
      } else {
        setError('Gagal menghapus goal.')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fcfcfc' }}>
        <p className="text-sm" style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}>
          Memuat detail goal...
        </p>
      </div>
    )
  }

  if (error && !goal) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fcfcfc' }}>
        <p className="text-sm" style={{ fontFamily: 'Helvetica, sans-serif', color: '#93000a' }}>
          {error}
        </p>
      </div>
    )
  }

  if (!goal) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fcfcfc' }}>
      <div className="mx-auto w-full px-4 md:max-w-2xl md:px-6 lg:max-w-5xl lg:px-8">
        {/* ── Header ── */}
        <div className="flex items-center justify-center pt-8 pb-5 relative">
          <button
            onClick={() => router.push('/goals')}
            className="absolute left-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(30,30,30,0.05)' }}
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: '#1e1e1e' }} />
          </button>
          <h1
            className="text-xl font-bold text-center"
            style={{
              fontFamily: "'Neulis', sans-serif",
              color: '#298dff',
            }}
          >
            {goal.nama_goal}
          </h1>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-4"
            style={{ backgroundColor: '#ffdad6', border: '1px solid #ba1a1a' }}
          >
            <p
              className="text-sm"
              style={{ fontFamily: 'Helvetica, sans-serif', color: '#93000a' }}
              role="alert"
            >
              {error}
            </p>
          </div>
        )}

        {/* ── Hero Graphic ── */}
        <div
          className="rounded-xl mb-5 flex items-center justify-center overflow-hidden relative"
          style={{
            height: '256px',
            background: 'linear-gradient(135deg, #ffb787, #ff8929)',
            opacity: 0.8,
          }}
        >
          <GoalPixelArt progressPct={goal.progress_pct} size="detail" />
          <div
            className="absolute inset-0"
            style={{ mixBlendMode: 'overlay', backgroundColor: 'rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* ── Progress Card ── */}
        <div
          className="rounded-xl px-5 pt-5 pb-4 mb-6"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(30,30,30,0.15)',
          }}
        >
          {/* Top row: label + icon badge */}
          <div className="flex items-center justify-between mb-1">
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
            >
              Progress Saat Ini
            </p>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,137,41,0.2)' }}
            >
              <PiggyBank className="w-5 h-5" style={{ color: '#ff8929' }} />
            </div>
          </div>

          {/* Big stat */}
          <p
            className="text-3xl font-bold mb-3"
            style={{ fontFamily: "'Neulis', sans-serif", color: '#298dff' }}
          >
            {formatRp(goal.nominal_terkumpul)}
          </p>

          {/* Progress bar */}
          <div className="w-full rounded-full h-3 mb-1" style={{ backgroundColor: 'rgba(30,30,30,0.08)' }}>
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${Math.min(goal.progress_pct, 100)}%`,
                background: 'linear-gradient(90deg, #ffb787, #ff8929)',
              }}
            />
          </div>
          <p
            className="text-xs font-semibold mb-3"
            style={{ fontFamily: 'Helvetica, sans-serif', color: '#ff8929' }}
          >
            {goal.progress_pct}%
          </p>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(30,30,30,0.15)' }} className="pt-3">
            {/* 2-column stats */}
            <div className="flex mb-2">
              <div className="flex-1">
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-0.5"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
                >
                  Terkumpul
                </p>
                <p
                  className="text-base font-semibold"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
                >
                  {formatRp(goal.nominal_terkumpul)}
                </p>
              </div>
              <div className="flex-1">
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-0.5"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
                >
                  Target
                </p>
                <p
                  className="text-base font-semibold"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
                >
                  {formatRp(goal.nominal_target)}
                </p>
              </div>
            </div>

            {/* Deadline row */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: 'rgba(30,30,30,0.65)' }} />
              <p
                className="text-sm font-semibold"
                style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
              >
                {formatDate(goal.deadline)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Allocation History ── */}
        <div className="mb-6">
          <h2
            className="text-lg font-semibold mb-3"
            style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
          >
            Riwayat Alokasi
          </h2>

          {goal.allocation_history.length === 0 ? (
            <p
              className="text-sm"
              style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
            >
              Belum ada riwayat alokasi.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {goal.allocation_history.map((entry, index) => (
                <div
                  key={entry.id_alokasi}
                  className="rounded-lg px-4 py-3 flex items-center gap-3"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(30,30,30,0.15)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: index % 2 === 0
                        ? 'rgba(255,137,41,0.2)'
                        : 'rgba(41,141,255,0.1)',
                    }}
                  >
                    {index % 2 === 0 ? (
                      <PiggyBank className="w-4 h-4" style={{ color: '#ff8929' }} />
                    ) : (
                      <RotateCcw className="w-4 h-4" style={{ color: '#298dff' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium"
                      style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
                    >
                      {formatDate(entry.tanggal_alokasi)}
                    </p>
                    <p
                      className="text-xs"
                      style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
                    >
                      {index % 2 === 0 ? 'Tabungan Manual' : 'Auto-roundup'}
                    </p>
                  </div>
                  <p
                    className="text-sm font-semibold shrink-0"
                    style={{ fontFamily: 'Helvetica, sans-serif', color: '#ff8929' }}
                  >
                    +{formatRp(entry.nominal_alokasi)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-center gap-6 pb-8">
          {/* Edit */}
          <button
            onClick={() => router.push(`/goals/new?edit=${id}`)}
            className="flex flex-col items-center gap-1"
            aria-label="Edit goal"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(30,30,30,0.05)' }}
            >
              <Edit3 className="w-5 h-5" style={{ color: '#1e1e1e' }} />
            </div>
            <span
              className="text-xs font-bold"
              style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
            >
              Edit
            </span>
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="flex flex-col items-center gap-1"
            aria-label="Hapus goal"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,218,214,0.5)' }}
            >
              <Trash2 className="w-5 h-5" style={{ color: '#ba1a1a' }} />
            </div>
            <span
              className="text-xs font-bold"
              style={{ fontFamily: 'Helvetica, sans-serif', color: '#ba1a1a' }}
            >
              Hapus
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}