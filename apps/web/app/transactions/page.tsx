'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, apiMutate } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type {
  Transaction,
  TransactionsResponse,
  TransactionCreateRequest,
  AllocationSuggestionResponse,
  Category,
  CategoriesResponse,
  Wallet,
  WalletsResponse,
} from '@/lib/api/types'
import TransactionForm from '@/components/TransactionForm'
import AllocationSuggestionModal from '@/components/AllocationSuggestionModal'

const LIMIT = 20

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

function formatRp(value: number) {
  return value.toLocaleString('id-ID')
}

function formatTime(isoDatetime: string) {
  return new Date(isoDatetime).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dateGroupLabel(tanggal: string) {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (tanggal === today) return 'Hari Ini'
  if (tanggal === yesterday) return 'Kemarin'
  return new Date(tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Icon + tint pair for a transaction row, matched by category name */
function categoryVisual(namaKategori: string | undefined, tipe: string) {
  const fallback =
    tipe === 'Pemasukan'
      ? { bg: 'bg-[rgba(41,141,255,0.2)]', fg: '#298dff' }
      : { bg: 'bg-[rgba(255,137,41,0.2)]', fg: '#ff8929' }
  const map: Record<string, { bg: string; fg: string }> = {
    'Makan & Minum': { bg: 'bg-[rgba(255,137,41,0.2)]', fg: '#ff8929' },
    Transportasi: { bg: 'bg-[rgba(41,141,255,0.2)]', fg: '#298dff' },
    Hiburan: { bg: 'bg-[rgba(168,85,247,0.15)]', fg: '#9333ea' },
    'Keperluan Kuliah': { bg: 'bg-[rgba(16,185,129,0.15)]', fg: '#059669' },
    'Tempat Tinggal': { bg: 'bg-[rgba(30,30,30,0.08)]', fg: '#1e1e1e' },
    'Uang Saku / Kiriman Orang Tua': { bg: 'bg-[rgba(41,141,255,0.2)]', fg: '#298dff' },
    'Freelance / Kerja Sampingan': { bg: 'bg-[rgba(255,137,41,0.2)]', fg: '#ff8929' },
  }
  return (namaKategori && map[namaKategori]) || fallback
}

export default function TransactionsPage() {
  const router = useRouter()
  const formSectionRef = useRef<HTMLDivElement>(null)

  const [checkingAuth, setCheckingAuth] = useState(true)

  // D-03: full-overlay blocking loading state, no client-side timeout
  const [calculating, setCalculating] = useState(false)
  const [modalState, setModalState] = useState<ModalState | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [savedBanner, setSavedBanner] = useState(false)

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  const refreshWallets = useCallback(async () => {
    try {
      const res = await apiFetch<WalletsResponse>('/api/wallets')
      setWallets(res.wallets)
    } catch {
      // Non-critical — wallet strip just won't refresh this cycle
    }
  }, [])

  const refreshList = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('start_date', startDate)
      if (endDate) params.set('end_date', endDate)
      if (categoryFilter) params.set('category_id', categoryFilter)
      if (sourceFilter) params.set('source', sourceFilter)
      params.set('page', String(page))
      params.set('limit', String(LIMIT))
      const res = await apiFetch<TransactionsResponse>(`/api/transactions?${params.toString()}`)
      setTransactions(res.transactions)
      setTotalTransactions(res.total)
    } catch {
      setListError('Gagal memuat riwayat transaksi')
    } finally {
      setListLoading(false)
    }
  }, [startDate, endDate, categoryFilter, sourceFilter, page])

  useEffect(() => {
    async function init() {
      const token = await getToken()
      if (!token) {
        router.push('/login')
        return
      }
      setCheckingAuth(false)
      const [categoriesRes] = await Promise.all([
        apiFetch<CategoriesResponse>('/api/categories').catch(() => ({ categories: [] })),
        refreshWallets(),
      ])
      setCategories(categoriesRes.categories)
    }
    init()
  }, [router, refreshWallets])

  useEffect(() => {
    if (checkingAuth) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on filter/page change is the intended sync-with-API use case for this effect
    refreshList()
  }, [checkingAuth, refreshList])

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

  function categoryName(kategoriId: string) {
    return categories.find((c) => c.id_kategori === kategoriId)?.nama_kategori
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (value: string) => {
      setter(value)
      setPage(1)
    }
  }

  // Client-side re-filter on top of whatever page is currently loaded — makes
  // filters visibly work under mock data too (the mock ignores query params).
  const visibleTransactions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transactions.filter((trx) => {
      if (categoryFilter && trx.kategori_id !== categoryFilter) return false
      if (sourceFilter && trx.source_label !== sourceFilter) return false
      if (startDate && trx.tanggal_transaksi < startDate) return false
      if (endDate && trx.tanggal_transaksi > endDate) return false
      if (q) {
        const nama = (categoryName(trx.kategori_id) ?? '').toLowerCase()
        const catatan = (trx.catatan ?? '').toLowerCase()
        if (!nama.includes(q) && !catatan.includes(q)) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, search, categoryFilter, sourceFilter, startDate, endDate, categories])

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, Transaction[]>()
    for (const trx of visibleTransactions) {
      const label = dateGroupLabel(trx.tanggal_transaksi)
      const bucket = groups.get(label) ?? []
      bucket.push(trx)
      groups.set(label, bucket)
    }
    return Array.from(groups.entries())
  }, [visibleTransactions])

  const totalPages = Math.max(1, Math.ceil(totalTransactions / LIMIT))

  async function handleSaveTransaction(payload: TransactionCreateRequest) {
    const isEdit = Boolean(editingTransaction)
    const saved = isEdit
      ? await apiMutate<Transaction>(
          `/api/transactions/${editingTransaction!.id_transaksi}`,
          'PUT',
          payload
        )
      : await apiMutate<Transaction>('/api/transactions', 'POST', payload)

    await refreshWallets()
    await refreshList()

    if (isEdit) {
      setEditingTransaction(null)
      setSavedBanner(true)
      return
    }

    if (!saved.allocation_suggestion_available) {
      setSavedBanner(true)
      return
    }

    setCalculating(true)
    try {
      const suggestion = await apiFetch<AllocationSuggestionResponse>(
        `/api/transactions/${saved.id_transaksi}/allocation-suggestion`
      )
      setCalculating(false)
      setModalState({ suggestion, transaksiId: saved.id_transaksi })
    } catch {
      setCalculating(false)
      setToastMessage('Gagal memuat saran alokasi. Cek nanti di halaman Pending.')
    }
  }

  function handleModalResolved() {
    setModalState(null)
    setSavedBanner(true)
    refreshList()
    refreshWallets()
  }

  async function handleDeleteTransaction(id: string) {
    if (!window.confirm('Hapus transaksi ini? Tindakan ini tidak dapat dibatalkan.')) return
    try {
      await apiMutate<Record<string, never>>(`/api/transactions/${id}`, 'DELETE', null)
      await refreshList()
      await refreshWallets()
    } catch {
      setListError('Gagal menghapus transaksi')
    }
  }

  function scrollToForm() {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
          <div className="h-8 w-8 shrink-0 rounded-full bg-[rgba(41,141,255,0.2)]" />
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#298dff]">
            Macost
          </h1>
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
          <section ref={formSectionRef}>
            <h3 className="font-display mb-3 text-xl font-semibold text-[#1e1e1e]">
              {editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
            </h3>
            <TransactionForm
              key={editingTransaction?.id_transaksi ?? 'create'}
              transactionId={editingTransaction?.id_transaksi}
              initialValues={
                editingTransaction
                  ? {
                      nominal: editingTransaction.nominal,
                      tanggal_transaksi: editingTransaction.tanggal_transaksi,
                      dompet_id: editingTransaction.dompet_id,
                      kategori_id: editingTransaction.kategori_id,
                      catatan: editingTransaction.catatan,
                    }
                  : undefined
              }
              onSubmit={handleSaveTransaction}
              onCancel={() => setEditingTransaction(null)}
            />
          </section>

          {/* ── Right / History ── */}
          <section>
            <h3 className="font-display mb-3 text-xl font-semibold text-[#1e1e1e]">
              Riwayat Transaksi
            </h3>

            {/* Wallet balances — refreshes after every create/edit/delete */}
            {wallets.length > 0 && (
              <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
                {wallets.map((w) => (
                  <div
                    key={w.id_dompet}
                    className="shrink-0 rounded-xl border border-[rgba(30,30,30,0.15)] bg-white px-4 py-3 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
                  >
                    <p className="font-body text-xs text-[rgba(30,30,30,0.65)]">{w.nama_dompet}</p>
                    <p className="font-body text-base font-semibold text-[#1e1e1e]">
                      Rp {formatRp(w.saldo)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Search + filter toggle */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                >
                  <circle cx="11" cy="11" r="7" stroke="rgba(30,30,30,0.35)" strokeWidth="2" fill="none" />
                  <path d="M21 21L17 17" stroke="rgba(30,30,30,0.35)" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari transaksi..."
                  className="font-body w-full rounded-lg border border-[rgba(30,30,30,0.15)] bg-white py-3 pl-11 pr-4 text-sm text-[#1e1e1e] outline-none placeholder:text-[rgba(30,30,30,0.35)]"
                />
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                aria-label="Filter transaksi"
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  showFilters
                    ? 'border-[#298dff] bg-[rgba(41,141,255,0.1)]'
                    : 'border-[rgba(30,30,30,0.15)] bg-[rgba(30,30,30,0.05)]'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6H20M8 12H16M11 18H13" stroke="#1e1e1e" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {showFilters && (
              <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-4">
                <div>
                  <label className="font-body block text-xs text-[rgba(30,30,30,0.65)]">
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleFilterChange(setStartDate)(e.target.value)}
                    className="font-body mt-1 w-full rounded-lg border border-[rgba(30,30,30,0.15)] px-3 py-2 text-sm text-[#1e1e1e] outline-none"
                  />
                </div>
                <div>
                  <label className="font-body block text-xs text-[rgba(30,30,30,0.65)]">
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleFilterChange(setEndDate)(e.target.value)}
                    className="font-body mt-1 w-full rounded-lg border border-[rgba(30,30,30,0.15)] px-3 py-2 text-sm text-[#1e1e1e] outline-none"
                  />
                </div>
                <div>
                  <label className="font-body block text-xs text-[rgba(30,30,30,0.65)]">
                    Kategori
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => handleFilterChange(setCategoryFilter)(e.target.value)}
                    className="font-body mt-1 w-full rounded-lg border border-[rgba(30,30,30,0.15)] px-3 py-2 text-sm text-[#1e1e1e] outline-none"
                  >
                    <option value="">Semua Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id_kategori} value={c.id_kategori}>
                        {c.nama_kategori}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-body block text-xs text-[rgba(30,30,30,0.65)]">
                    Sumber
                  </label>
                  <select
                    value={sourceFilter}
                    onChange={(e) => handleFilterChange(setSourceFilter)(e.target.value)}
                    className="font-body mt-1 w-full rounded-lg border border-[rgba(30,30,30,0.15)] px-3 py-2 text-sm text-[#1e1e1e] outline-none"
                  >
                    <option value="">Semua Sumber</option>
                    <option value="Fixed Routine">Rutin (Fixed Routine)</option>
                    <option value="Flexible Side Income">Sampingan (Side Income)</option>
                  </select>
                </div>
              </div>
            )}

            {listError && (
              <div className="mt-4 rounded-xl border border-[#ba1a1a] bg-[#ffdad6] px-4 py-3">
                <p className="font-body text-sm text-[#93000a]" role="alert">
                  {listError}
                </p>
              </div>
            )}

            {/* Date-grouped list */}
            <div className="mt-4 flex flex-col gap-6">
              {listLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgba(41,141,255,0.3)] border-t-[#298dff]" />
                </div>
              ) : groupedTransactions.length === 0 ? (
                <div className="rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-6 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                  <p className="font-body text-sm font-semibold text-[#1e1e1e]">
                    Belum ada transaksi
                  </p>
                  <p className="font-body mt-1 text-sm text-[rgba(30,30,30,0.65)]">
                    Catat transaksi pertamamu untuk mulai melacak keuanganmu.
                  </p>
                  <button
                    onClick={scrollToForm}
                    className="font-body mt-3 rounded-xl bg-[#298dff] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    + Tambah Transaksi
                  </button>
                </div>
              ) : (
                groupedTransactions.map(([label, items]) => (
                  <div key={label}>
                    <p className="font-body pl-1 text-xs font-bold uppercase tracking-wide text-[rgba(30,30,30,0.35)]">
                      {label}
                    </p>
                    <div className="mt-2 overflow-hidden rounded-xl border border-[rgba(30,30,30,0.15)] bg-white">
                      {items.map((trx, i) => {
                        const nama = categoryName(trx.kategori_id)
                        const { bg, fg } = categoryVisual(nama, trx.tipe_transaksi)
                        const isIncome = trx.tipe_transaksi === 'Pemasukan'
                        return (
                          <div
                            key={trx.id_transaksi}
                            className={`flex items-center justify-between gap-3 px-4 py-4 ${
                              i < items.length - 1 ? 'border-b border-[rgba(30,30,30,0.15)]' : ''
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${bg}`}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="9" stroke={fg} strokeWidth="1.5" fill="none" />
                                  <circle cx="12" cy="12" r="3" fill={fg} />
                                </svg>
                              </span>
                              <div className="min-w-0">
                                <p className="font-body truncate text-base font-semibold text-[#1e1e1e]">
                                  {nama ?? 'Transaksi'}
                                </p>
                                <p className="font-body truncate text-sm text-[rgba(30,30,30,0.65)]">
                                  {trx.catatan || trx.source_label || (isIncome ? 'Pemasukan' : 'Pengeluaran')}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <div className="mr-1 text-right">
                                <p
                                  className="font-body text-base font-semibold"
                                  style={{ color: isIncome ? '#298dff' : '#ba1a1a' }}
                                >
                                  {isIncome ? '+' : '-'} Rp {formatRp(trx.nominal)}
                                </p>
                                <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">
                                  {formatTime(trx.created_at)}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingTransaction(trx)
                                  formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }}
                                aria-label="Edit transaksi"
                                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors hover:bg-[rgba(30,30,30,0.05)]"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 20H21" stroke="rgba(30,30,30,0.65)" strokeWidth="1.5" strokeLinecap="round" />
                                  <path d="M16.5 3.5C16.8978 3.10218 17.4374 2.87868 18 2.87868C18.5626 2.87868 19.1022 3.10218 19.5 3.5C19.8978 3.89782 20.1213 4.43739 20.1213 5C20.1213 5.56261 19.8978 6.10218 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke="rgba(30,30,30,0.65)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(trx.id_transaksi)}
                                aria-label="Hapus transaksi"
                                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors hover:bg-[rgba(186,26,26,0.08)]"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3 6H21" stroke="#ba1a1a" strokeWidth="1.5" strokeLinecap="round" />
                                  <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6L18.2 20.2C18.15 20.9 17.5 21.5 16.8 21.5H7.2C6.5 21.5 5.85 20.9 5.8 20.2L5 6" stroke="#ba1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalTransactions > LIMIT && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="font-body rounded-lg border border-[rgba(30,30,30,0.15)] px-4 py-2 text-sm font-semibold text-[#1e1e1e] disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span className="font-body text-sm text-[rgba(30,30,30,0.65)]">
                  Halaman {page} dari {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="font-body rounded-lg border border-[rgba(30,30,30,0.15)] px-4 py-2 text-sm font-semibold text-[#1e1e1e] disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            )}
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
