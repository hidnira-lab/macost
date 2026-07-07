'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiMutate, apiFetch } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type { GoalDetailResponse, GoalUpdateRequest } from '@/lib/api/types'
import {
  ArrowLeft,
  Save,
  Calendar,
  AlertTriangle,
} from 'lucide-react'

function parseRpInput(value: string): number {
  return Number(value.replace(/[^0-9]/g, '')) || 0
}

function formatRpInput(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('id-ID')
}

function formatDateForInput(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toISOString().split('T')[0]
}

export default function EditGoalPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [nama, setNama] = useState('')
  const [target, setTarget] = useState(0)
  const [targetDisplay, setTargetDisplay] = useState('')
  const [deadline, setDeadline] = useState('')
  const [importance, setImportance] = useState(3)
  const [submitting, setSubmitting] = useState(false)
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
        setNama(data.nama_goal)
        setTarget(data.nominal_target)
        setTargetDisplay(formatRpInput(data.nominal_target))
        setDeadline(formatDateForInput(data.deadline))
        setImportance(data.skor_kepentingan)
      } catch {
        setError('Gagal memuat data goal')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim()) {
      setError('Nama goal harus diisi.')
      return
    }
    if (target <= 0) {
      setError('Target nominal harus lebih dari 0.')
      return
    }
    if (!deadline) {
      setError('Deadline harus diisi.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const body: GoalUpdateRequest = {
        nama_goal: nama.trim(),
        nominal_target: target,
        deadline,
        skor_keinginan: importance,
      }
      await apiMutate(`/api/goals/${id}`, 'PUT', body)
      router.push(`/goals/${id}`)
    } catch {
      setError('Gagal menyimpan goal. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fcfcfc' }}>
        <p className="text-sm" style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}>
          Memuat data goal...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fcfcfc' }}>
      <div className="max-w-md mx-auto px-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between pt-8 pb-5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(30,30,30,0.05)' }}
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: '#1e1e1e' }} />
          </button>
          <h1
            className="text-xl font-bold text-center flex-1"
            style={{
              fontFamily: "'Neulis', sans-serif",
              color: '#298dff',
            }}
          >
            Edit Goal
          </h1>
          <div className="w-9" />
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

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>
          <div
            className="rounded-xl px-6 pt-6 pb-2 mb-6"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid rgba(30,30,30,0.15)',
            }}
          >
            {/* Goal Name */}
            <div className="mb-5">
              <label
                className="block text-sm font-semibold mb-1"
                style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
              >
                Goal Name
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="e.g. New Laptop"
                className="w-full rounded-lg px-4 py-3 text-sm outline-none"
                style={{
                  fontFamily: 'Helvetica, sans-serif',
                  color: '#1e1e1e',
                  backgroundColor: 'rgba(30,30,30,0.05)',
                  border: '1px solid rgba(30,30,30,0.1)',
                }}
              />
            </div>

            {/* Target Amount */}
            <div className="mb-5">
              <label
                className="block text-sm font-semibold mb-1"
                style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
              >
                Target Amount
              </label>
              <div
                className="flex items-center rounded-lg px-4 py-3"
                style={{
                  backgroundColor: 'rgba(30,30,30,0.05)',
                  border: '1px solid rgba(30,30,30,0.1)',
                }}
              >
                <span
                  className="text-sm font-semibold mr-2"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
                >
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={targetDisplay}
                  onChange={(e) => {
                    const raw = e.target.value
                    const num = parseRpInput(raw)
                    setTarget(num)
                    setTargetDisplay(formatRpInput(num))
                  }}
                  placeholder="10,000,000"
                  className="flex-1 bg-transparent text-sm font-semibold outline-none"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
                />
              </div>
            </div>

            {/* Deadline */}
            <div className="mb-5">
              <label
                className="block text-sm font-semibold mb-1"
                style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
              >
                Deadline
              </label>
              <div
                className="flex items-center rounded-lg px-4 py-3"
                style={{
                  backgroundColor: 'rgba(30,30,30,0.05)',
                  border: '1px solid rgba(30,30,30,0.1)',
                }}
              >
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
                />
                <Calendar className="w-4 h-4" style={{ color: 'rgba(30,30,30,0.65)' }} />
              </div>
            </div>

            {/* Importance Slider */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label
                  className="text-sm font-semibold"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
                >
                  How important is this to you?
                </label>
                <span
                  className="text-sm font-bold"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: '#298dff' }}
                >
                  {importance === 1 && 'Not really'}
                  {importance === 2 && 'Kinda'}
                  {importance === 3 && 'Important'}
                  {importance === 4 && 'Very important'}
                  {importance === 5 && 'Critical!'}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={importance}
                onChange={(e) => setImportance(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  backgroundColor: 'rgba(30,30,30,0.08)',
                  accentColor: '#298dff',
                }}
              />
              <div className="flex justify-between mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className="text-xs"
                    style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.5)' }}
                  >
                    {n}
                  </span>
                ))}
              </div>
              <div className="flex justify-between mt-0.5">
                <span
                  className="text-[10px]"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.4)' }}
                >
                  Nice to have
                </span>
                <span
                  className="text-[10px]"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.4)' }}
                >
                  Critical
                </span>
              </div>
            </div>
          </div>

          {/* ── Submit CTA ── */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl px-6 py-4 mb-8 transition-opacity disabled:opacity-60"
            style={{
              fontFamily: 'Helvetica, sans-serif',
              fontSize: '18px',
              background: 'linear-gradient(135deg, #298dff, #065fc5)',
              boxShadow: '0 4px 12px rgba(41,141,255,0.3)',
            }}
          >
            <Save className="w-5 h-5" />
            {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </div>
  )
}