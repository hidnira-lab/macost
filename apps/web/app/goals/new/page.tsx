'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiMutate, apiFetch } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type { GoalCreateRequest, GoalDetailResponse } from '@/lib/api/types'
import {
  Plus,
  Calendar,
  AlertTriangle,
  Heart,
  Umbrella,
  Laptop,
  Stethoscope,
  ArrowLeft,
} from 'lucide-react'

const templates = [
  { label: 'Dana Darurat', Icon: Umbrella, bg: 'bg-[#ffdad6]' },
  { label: 'Liburan', Icon: Heart, bg: 'bg-[rgba(41,141,255,0.2)]' },
  { label: 'Kesehatan', Icon: Stethoscope, bg: 'bg-[rgba(255,137,41,0.14)]' },
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

function isTodayOrPast(dateStr: string): boolean {
  if (!dateStr) return true
  const input = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  input.setHours(0, 0, 0, 0)
  return input <= today
}

function GoalForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const isEdit = Boolean(editId)

  const [nama, setNama] = useState('')
  const [target, setTarget] = useState(0)
  const [targetDisplay, setTargetDisplay] = useState('')
  const [deadline, setDeadline] = useState('')
  const [importance, setImportance] = useState(3)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingGoal, setLoadingGoal] = useState(isEdit)

  // ── Auth guard ──
  useEffect(() => {
    async function checkAuth() {
      const token = await getToken()
      if (!token) {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  // ── Load existing goal for edit mode ──
  useEffect(() => {
    if (!editId) return
    async function loadGoal() {
      try {
        const data = await apiFetch<GoalDetailResponse>(`/api/goals/${editId}`)
        setNama(data.nama_goal)
        setTarget(data.nominal_target)
        setTargetDisplay(formatRpInput(data.nominal_target))
        setDeadline(data.deadline.split('T')[0])
        setImportance(data.skor_keinginan)
      } catch {
        setError('Gagal memuat data goal.')
      } finally {
        setLoadingGoal(false)
      }
    }
    loadGoal()
  }, [editId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // ── Client-side validation ──
    if (!nama.trim()) {
      setError('Nama goal harus diisi.')
      return
    }
    if (target <= 0) {
      setError('Target nominal harus lebih dari 0.')
      return
    }
    if (!deadline) {
      setError('Tenggat waktu harus diisi.')
      return
    }
    if (isTodayOrPast(deadline)) {
      setError('Tenggat waktu harus setelah hari ini.')
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

      if (isEdit && editId) {
        await apiMutate(`/api/goals/${editId}`, 'PUT', body)
        router.push(`/goals/${editId}`)
      } else {
        await apiMutate('/api/goals', 'POST', body)
        router.push('/goals')
      }
    } catch {
      setError('Gagal menyimpan goal. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  function applyTemplate(label: string) {
    setNama(label)
  }

  if (loadingGoal) {
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
      <div className="mx-auto w-full px-4 md:max-w-2xl md:px-6 lg:max-w-5xl lg:px-8 pb-8">
        {/* ── Header ── */}
        <div className="flex items-center justify-center pt-8 pb-5 relative">
          <button
            onClick={() => router.back()}
            className="absolute left-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(30,30,30,0.05)' }}
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: '#1e1e1e' }} />
          </button>
          <h1
            className="text-xl lg:text-2xl font-bold"
            style={{
              fontFamily: "'Neulis', sans-serif",
              color: '#298dff',
            }}
          >
            {isEdit ? 'Edit Goal' : 'Buat Goal Baru'}
          </h1>
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

        {/* ── Quick Start Templates (hide in edit mode) ── */}
        {!isEdit && (
          <div className="mb-5">
            <h2
              className="text-base font-semibold mb-3"
              style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
            >
              Template Cepat
            </h2>
            <div className="flex gap-3 lg:gap-4 overflow-x-auto pb-2">
              {templates.map(({ label, Icon, bg }) => (
                <button
                  key={label}
                  onClick={() => applyTemplate(label)}
                  className="flex flex-col items-center gap-2 shrink-0 rounded-xl px-4 py-4 w-32 lg:w-40 lg:py-5"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(30,30,30,0.15)',
                  }}
                >
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center ${bg}`}>
                    <Icon className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: '#1e1e1e' }} />
                  </div>
                  <span
                    className="text-xs lg:text-sm font-semibold text-center leading-tight"
                    style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>
          <div
            className="rounded-xl px-6 pt-6 pb-2 mb-6 lg:px-8 lg:pt-8"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid rgba(30,30,30,0.15)',
            }}
          >
            {/* Goal Name */}
            <div className="mb-5 lg:mb-6">
              <label
                className="block text-sm font-semibold mb-1 lg:mb-1.5"
                style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
              >
                Nama Goal
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="misal: Laptop Baru"
                className="w-full rounded-lg px-4 py-3 text-sm outline-none lg:px-5 lg:py-3.5"
                style={{
                  fontFamily: 'Helvetica, sans-serif',
                  color: '#1e1e1e',
                  backgroundColor: 'rgba(30,30,30,0.05)',
                  border: '1px solid rgba(30,30,30,0.1)',
                }}
              />
            </div>

            {/* Target Amount */}
            <div className="mb-5 lg:mb-6">
              <label
                className="block text-sm font-semibold mb-1 lg:mb-1.5"
                style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
              >
                Target Nominal
              </label>
              <div
                className="flex items-center rounded-lg px-4 py-3 lg:px-5 lg:py-3.5"
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
            <div className="mb-5 lg:mb-6">
              <label
                className="block text-sm font-semibold mb-1 lg:mb-1.5"
                style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}
              >
                Tenggat Waktu
              </label>
              <div
                className="flex items-center rounded-lg px-4 py-3 lg:px-5 lg:py-3.5"
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
                  Seberapa penting goal ini bagimu?
                </label>
                <span
                  className="text-sm font-bold"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: '#298dff' }}
                >
                  {importance === 1 && 'Boleh ada'}
                  {importance === 2 && 'Lumayan'}
                  {importance === 3 && 'Penting'}
                  {importance === 4 && 'Sangat penting'}
                  {importance === 5 && 'Krusial!'}
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
                  Boleh ada
                </span>
                <span
                  className="text-[10px]"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.4)' }}
                >
                  Krusial
                </span>
              </div>
            </div>
          </div>

          {/* ── Submit CTA ── */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl px-6 py-4 transition-opacity disabled:opacity-60"
            style={{
              fontFamily: 'Helvetica, sans-serif',
              fontSize: '18px',
              background: 'linear-gradient(135deg, #298dff, #065fc5)',
              boxShadow: '0 4px 12px rgba(41,141,255,0.3)',
            }}
          >
            {isEdit ? null : <Plus className="w-5 h-5" />}
            {submitting
              ? 'Menyimpan...'
              : isEdit
                ? 'Simpan Perubahan'
                : 'Buat Goal'
            }
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CreateGoalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fcfcfc' }}>
        <p className="text-sm" style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}>
          Memuat...
        </p>
      </div>
    }>
      <GoalForm />
    </Suspense>
  )
}