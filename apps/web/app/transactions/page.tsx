'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, apiMutate } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type {
  Transaction,
  TransactionCreateRequest,
  AllocationSuggestionResponse,
} from '@/lib/api/types'
import TransactionForm from '@/components/TransactionForm'
import AllocationSuggestionModal from '@/components/AllocationSuggestionModal'

// ─── Bottom nav items ────────────────────────────────────────────────
// Transaksi is a sub-destination reached from Home/FAB, not one of the 5
// primary tabs — no tab is marked active here (same convention as goals/new).
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
    href: '/home',
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

interface ModalState {
  suggestion: AllocationSuggestionResponse
  transaksiId: string
}

export default function TransactionsPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)

  // D-03: full-overlay blocking loading state, no client-side timeout
  const [calculating, setCalculating] = useState(false)
  const [modalState, setModalState] = useState<ModalState | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [savedBanner, setSavedBanner] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const token = await getToken()
      if (!token) {
        router.push('/login')
        return
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 5000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    if (!savedBanner) return
    const timer = setTimeout(() => setSavedBanner(false), 3000)
    return () => clearTimeout(timer)
  }, [savedBanner])

  async function handleSaveTransaction(payload: TransactionCreateRequest) {
    const created = await apiMutate<Transaction>('/api/transactions', 'POST', payload)

    if (!created.allocation_suggestion_available) {
      setSavedBanner(true)
      return
    }

    setCalculating(true)
    try {
      const suggestion = await apiFetch<AllocationSuggestionResponse>(
        `/api/transactions/${created.id_transaksi}/allocation-suggestion`
      )
      setCalculating(false)
      setModalState({ suggestion, transaksiId: created.id_transaksi })
    } catch {
      setCalculating(false)
      setToastMessage('Gagal memuat saran alokasi. Cek nanti di halaman Pending.')
    }
  }

  function handleModalResolved() {
    setModalState(null)
    setSavedBanner(true)
    // Transaction list refresh is wired up in 02-13-PLAN.md
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfcfc]">
        <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">Memuat...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <div className="mx-auto w-full px-4 pb-28 md:max-w-2xl md:px-6 md:pb-32 lg:max-w-5xl lg:px-8 lg:pb-32">
        {/* ── Top App Bar ── */}
        <header className="sticky top-0 z-10 -mx-4 flex h-16 items-center justify-between border-b border-[rgba(30,30,30,0.08)] bg-[rgba(252,252,252,0.8)] px-4 backdrop-blur-[6px] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 shrink-0 rounded-full bg-[rgba(41,141,255,0.2)]" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#298dff]">
              Macost
            </h1>
          </div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[rgba(30,30,30,0.05)]"
            aria-label="Notifikasi"
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 20C9.1 20 10 19.1 10 18H6C6 19.1 6.9 20 8 20ZM14 14V9C14 5.93 12.36 3.36 9.5 2.68V2C9.5 1.17 8.83 0.5 8 0.5C7.17 0.5 6.5 1.17 6.5 2V2.68C3.64 3.36 2 5.92 2 9V14L0 16V17H16V16L14 14Z" fill="#005BB0" />
            </svg>
          </button>
        </header>

        <h2 className="font-display mt-6 mb-6 text-2xl font-bold text-[#1e1e1e]">
          Transaksi
        </h2>

        {savedBanner && (
          <div className="mb-4 rounded-xl border border-[rgba(41,141,255,0.3)] bg-[rgba(41,141,255,0.08)] px-4 py-3">
            <p className="font-body text-sm text-[#065fc5]">
              Transaksi berhasil disimpan.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          {/* ── Left / Form ── */}
          <section>
            <h3 className="font-display mb-3 text-xl font-semibold text-[#1e1e1e]">
              Tambah Transaksi
            </h3>
            <TransactionForm onSubmit={handleSaveTransaction} />
          </section>

          {/* ── Right / Recent list placeholder ── */}
          <section>
            <h3 className="font-display mb-3 text-xl font-semibold text-[#1e1e1e]">
              Transaksi Terbaru
            </h3>
            <div className="rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-6 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
              <p className="font-body text-sm font-semibold text-[#1e1e1e]">
                Belum ada transaksi
              </p>
              <p className="font-body mt-1 text-sm text-[rgba(30,30,30,0.65)]">
                Catat transaksi pertamamu untuk mulai melacak keuanganmu.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* D-03/D-04: blocking overlay, no timeout — dismissed only by the
          allocation-suggestion fetch's own resolution/rejection. */}
      {calculating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(30,30,30,0.4)]">
          <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-xl">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[rgba(41,141,255,0.3)] border-t-[#298dff]" />
            <p className="font-body mt-3 text-sm text-[#1e1e1e]">
              Menghitung saran alokasi...
            </p>
          </div>
        </div>
      )}

      {modalState && (
        <AllocationSuggestionModal
          open={true}
          suggestion={modalState.suggestion}
          transaksiId={modalState.transaksiId}
          onResolved={handleModalResolved}
          onClose={() => setModalState(null)}
        />
      )}

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-[#ba1a1a] bg-[#ffdad6] px-4 py-3 shadow-lg">
          <p className="font-body text-sm text-[#93000a]" role="alert">
            {toastMessage}
          </p>
        </div>
      )}

      {/* ─── Bottom Navigation Bar ────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(30,30,30,0.08)] bg-white shadow-[0_-4px_12px_0_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-1.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1 transition-colors ${
                item.active ? 'bg-[#298dff]' : 'bg-transparent'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center">
                {item.icon(item.active)}
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight whitespace-nowrap ${
                  item.active ? 'text-white' : 'text-[rgba(30,30,30,0.45)]'
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
