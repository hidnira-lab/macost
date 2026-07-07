'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiMutate, apiFetch } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type { GoalCreateRequest } from '@/lib/api/types'
import {
  ArrowLeft,
  Plus,
  Calendar,
  AlertTriangle,
  Heart,
  Umbrella,
  Laptop,
  Stethoscope,
} from 'lucide-react'

const templates = [
  { label: 'Emergency Fund', Icon: Umbrella, bg: 'bg-[#ffdad6]' },
  { label: 'Vacation', Icon: Heart, bg: 'bg-[rgba(41,141,255,0.2)]' },
  { label: 'Health', Icon: Stethoscope, bg: 'bg-[rgba(255,137,41,0.14)]' },
  { label: 'Laptop/Gadget', Icon: Laptop, bg: 'bg-[rgba(41,141,255,0.14)]' },
]

function formatRp(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

function parseRpInput(value: string): number {
  return Number(value.replace(/[^0-9]/g, '')) || 0
}

function formatRpInput(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('id-ID')
}

export default function CreateGoalPage() {
  const router = useRouter()

  const [nama, setNama] = useState('')
  const [target, setTarget] = useState(0)
  const [targetDisplay, setTargetDisplay] = useState('')
  const [deadline, setDeadline] = useState('')
  const [importance, setImportance] = useState(3)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const token = await getToken()
      if (!token) {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

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
      const body: GoalCreateRequest = {
        nama_goal: nama.trim(),
        nominal_target: target,
        deadline,
        skor_keinginan: importance,
      }
      await apiMutate('/api/goals', 'POST', body)
      router.push('/goals')
    } catch {
      setError('Gagal menyimpan goal. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  function applyTemplate(label: string) {
    setNama(label)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fcfcfc' }}>
      <div className="max-w-md mx-auto px-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between pt-8 pb-5">
          <button
            onClick={() => router.push('/goals')}
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
            Create New Goal
          </h1>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'transparent' }}
            aria-label="Menu"
          >
            <span className="text-lg font-bold tracking-wider" style={{ color: '#1e1e1e' }}>⋮</span>
          </button>
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

        {/* ── Quick Start Templates ── */}
        <div className="mb-5">
          <h2
            className="text-base font-semibold mb-3"
            style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
          >
            Quick Start
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {templates.map(({ label, Icon, bg }) => (
              <button
                key={label}
                onClick={() => applyTemplate(label)}
                className="flex flex-col items-center gap-2 shrink-0 rounded-xl px-4 py-4"
                style={{
                  width: '128px',
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(30,30,30,0.15)',
                }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg}`}>
                  <Icon className="w-5 h-5" style={{ color: '#1e1e1e' }} />
                </div>
                <span
                  className="text-xs font-semibold text-center leading-tight"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

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
            <Plus className="w-5 h-5" />
            {submitting ? 'Menyimpan...' : 'Create Goal'}
          </button>
        </form>
      </div>
    </div>
  )
}