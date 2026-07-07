'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiMutate, apiFetch } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type { GoalCreateRequest } from '@/lib/api/types'
import {
  Plus,
  Calendar,
  AlertTriangle,
  Heart,
  Umbrella,
  Laptop,
  Stethoscope,
} from 'lucide-react'

const templates = [
  { label: 'Dana Darurat', Icon: Umbrella, bg: 'bg-[#ffdad6]' },
  { label: 'Liburan', Icon: Heart, bg: 'bg-[rgba(41,141,255,0.2)]' },
  { label: 'Kesehatan', Icon: Stethoscope, bg: 'bg-[rgba(255,137,41,0.14)]' },
  { label: 'Laptop/Gadget', Icon: Laptop, bg: 'bg-[rgba(41,141,255,0.14)]' },
]

// ─── Bottom nav items ────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M9 22V12H15V22" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    active: false,
    href: '/dashboard',
  },
  {
    label: 'Dashboard',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <rect x="13" y="3" width="8" height="4" rx="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <rect x="13" y="9" width="8" height="12" rx="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <rect x="3" y="13" width="8" height="8" rx="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    active: false,
    href: '/dashboard',
  },
  {
    label: 'Goals',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" fill="none"/>
        <circle cx="12" cy="12" r="6" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" fill="none"/>
        <circle cx="12" cy="12" r="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    active: false,
    href: '/goals',
  },
  {
    label: 'AI Assistant',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    active: false,
    href: '/ai',
  },
  {
    label: 'Profile',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    active: false,
    href: '/profile',
  },
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
      <div className="mx-auto max-w-md px-4 pb-28 md:max-w-lg md:px-6 md:pb-32 lg:max-w-2xl lg:px-8 lg:pb-32">
        {/* ── Header ── */}
        <div className="pt-8 pb-5">
          <h1
            className="text-xl lg:text-2xl font-bold"
            style={{
              fontFamily: "'Neulis', sans-serif",
              color: '#298dff',
            }}
          >
            Buat Goal Baru
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

        {/* ── Quick Start Templates ── */}
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
                  {importance === 1 && 'Tidak terlalu'}
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
            className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl px-6 py-4 mb-8 transition-opacity disabled:opacity-60"
            style={{
              fontFamily: 'Helvetica, sans-serif',
              fontSize: '18px',
              background: 'linear-gradient(135deg, #298dff, #065fc5)',
              boxShadow: '0 4px 12px rgba(41,141,255,0.3)',
            }}
          >
            <Plus className="w-5 h-5" />
            {submitting ? 'Menyimpan...' : 'Buat Goal'}
          </button>
        </form>
      </div>

      {/* ─── Bottom Navigation Bar ────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[rgba(30,30,30,0.08)] shadow-[0_-4px_12px_0_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around px-2 py-1.5 max-w-2xl mx-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] min-h-[44px] justify-center rounded-full transition-colors ${
                item.active
                  ? 'bg-[#298dff]'
                  : 'bg-transparent'
              }`}
            >
              <span className="w-6 h-6 flex items-center justify-center">
                {item.icon(item.active)}
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight whitespace-nowrap ${
                  item.active
                    ? 'text-white'
                    : 'text-[rgba(30,30,30,0.45)]'
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}