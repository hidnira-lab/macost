'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, apiMutate } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type { Category, Wallet, Transaction, AllocationSuggestionResponse } from '@/lib/api/types'
import SmartAllocationModal from '@/components/SmartAllocationModal'

const USE_MOCK = typeof window !== 'undefined'
  ? process.env.NEXT_PUBLIC_USE_MOCK === 'true'
  : process.env.NEXT_PUBLIC_USE_MOCK === 'true'

function todayStr(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm} / ${dd} / ${yyyy}`
}

function toISODate(val: string): string {
  // "MM / DD / YYYY" → "YYYY-MM-DD"
  const parts = val.split(' / ')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[0]}-${parts[1]}`
  }
  return new Date().toISOString().slice(0, 10)
}

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  'Makan & Minum': { icon: '🍔', color: '#ff8929' },
  Transportasi: { icon: '🚗', color: '#298dff' },
  Hiburan: { icon: '🎬', color: '#ba1a1a' },
  'Keperluan Kuliah': { icon: '📚', color: '#45d483' },
  'Tempat Tinggal': { icon: '🏠', color: '#5d759d' },
}

export default function NewTransactionPage() {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [dateValue, setDateValue] = useState(todayStr())
  const [note, setNote] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showWalletDropdown, setShowWalletDropdown] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Smart Allocation modal state
  const [savingSuccess, setSavingSuccess] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [savedTransactionId, setSavedTransactionId] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<AllocationSuggestionResponse | null>(null)
  const [sideIncomeAmount, setSideIncomeAmount] = useState<number | undefined>(undefined)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      if (!USE_MOCK) {
        const token = await getToken()
        if (!token) {
          router.push('/login')
          return
        }
      }
      try {
        const [cats, wals] = await Promise.all([
          apiFetch<{ categories: Category[] }>('/api/categories'),
          apiFetch<{ wallets: Wallet[] }>('/api/wallets'),
        ])
        setCategories(cats.categories)
        setWallets(wals.wallets)
      } catch {
        setError('Gagal memuat data')
      }
    }
    init()
  }, [router])

  const amountNum = parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0

  function formatAmount(val: string): string {
    const digits = val.replace(/[^0-9]/g, '')
    if (!digits) return ''
    return parseInt(digits, 10).toLocaleString('id-ID')
  }

  function handleAmountInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const digits = raw.replace(/[^0-9]/g, '')
    setAmount(digits)
  }

  const selectedCategoryData = categories.find((c) => c.id_kategori === selectedCategory)
  const selectedWalletData = wallets.find((w) => w.id_dompet === selectedWallet)

  async function handleSave() {
    if (!amountNum || !selectedCategory || !selectedWallet) {
      setError('Lengkapi nominal, kategori, dan dompet')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = await apiMutate<Transaction>(
        '/api/transactions',
        'POST',
        {
          tipe_transaksi: 'pengeluaran',
          nominal: amountNum,
          tanggal_transaksi: toISODate(dateValue),
          dompet_id: selectedWallet,
          kategori_id: selectedCategory,
          metode_input: 'manual',
          catatan: note || null,
        }
      )

      setSavingSuccess(true)
      setSavedTransactionId(saved.id_transaksi)

      // If allocation suggestion is available, fetch it
      if (saved.allocation_suggestion_available) {
        setModalLoading(true)
        try {
          const data = await apiFetch<AllocationSuggestionResponse>(
            `/api/transactions/${saved.id_transaksi}/allocation-suggestion`
          )
          setSuggestion(data)
          setSideIncomeAmount(amountNum)
          setModalOpen(true)
        } catch {
          // Error fetching suggestion — show error toast, transaction is already saved
          setFetchError('Gagal memuat saran alokasi. Cek nanti di halaman Pending.')
        } finally {
          setModalLoading(false)
        }
      }
    } catch {
      setError('Gagal menyimpan transaksi. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  function handleModalClose() {
    // Close/skip — save as pending suggestion via /skip endpoint
    if (savedTransactionId) {
      apiMutate(`/api/allocations/${savedTransactionId}/skip`, 'POST', null).catch(() => {})
    }
    setModalOpen(false)
    setSuggestion(null)
    setSideIncomeAmount(undefined)
    setSavedTransactionId(null)
  }

  function handleSkipped() {
    setModalOpen(false)
    setSuggestion(null)
    setSideIncomeAmount(undefined)
    setSavedTransactionId(null)
  }

  function handleConfirmed() {
    setModalOpen(false)
    setSuggestion(null)
    setSideIncomeAmount(undefined)
    setSavedTransactionId(null)
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between h-14 px-4 md:px-6 lg:mx-auto lg:max-w-2xl lg:px-8 border-b border-[rgba(30,30,30,0.08)] bg-[#fcfcfc]">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-[rgba(30,30,30,0.05)] transition-colors"
          aria-label="Back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="#298DFF" />
          </svg>
        </button>
        <h1
          className="text-base font-bold text-[#298dff] text-center flex-1 font-display"
          style={{ fontWeight: 600 }}
        >
          New Transaction
        </h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 px-4 md:px-6 lg:mx-auto lg:max-w-2xl lg:px-8 pb-8">
        {/* ── Error ────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-[#ffdad6] border border-[#ba1a1a] rounded-xl px-4 py-3 mt-4 mb-4">
            <p className="text-[#93000a] text-sm font-body" role="alert">{error}</p>
          </div>
        )}

        {/* ── Amount Card ──────────────────────────────────────────── */}
        <div className="mt-6 bg-white border border-[rgba(30,30,30,0.15)] rounded-2xl p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="text-3xl font-bold text-[#1e1e1e] font-body">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={formatAmount(amount)}
              onChange={handleAmountInput}
              placeholder="0"
              className="text-4xl font-bold text-[#1e1e1e] bg-transparent outline-none w-[200px] text-center font-body placeholder-[rgba(30,30,30,0.25)]"
              autoFocus
            />
          </div>
        </div>

        {/* ── Category ─────────────────────────────────────────────── */}
        <div className="mt-4 relative">
          <button
            onClick={() => {
              setShowCategoryDropdown(!showCategoryDropdown)
              setShowWalletDropdown(false)
            }}
            className="w-full flex items-center justify-between bg-white border border-[rgba(30,30,30,0.15)] rounded-xl px-4 py-3.5 text-left hover:bg-[rgba(30,30,30,0.02)] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              {selectedCategoryData ? (
                <>
                  <span className="text-lg shrink-0">
                    {CATEGORY_ICONS[selectedCategoryData.nama_kategori]?.icon ?? '📁'}
                  </span>
                  <span className="text-sm font-semibold text-[#1e1e1e] font-body">
                    {selectedCategoryData.nama_kategori}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-[rgba(30,30,30,0.05)] flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 3H21V21H3V3ZM5 5V19H19V5H5ZM7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H13V17H7V15Z" fill="rgba(30,30,30,0.45)" />
                    </svg>
                  </div>
                  <span className="text-sm text-[rgba(30,30,30,0.45)] font-body">Select Category</span>
                </>
              )}
            </div>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <path d="M1.41 0.59L0 2L6 8L12 2L10.59 0.59L6 5.17L1.41 0.59Z" fill="#1e1e1e" fillOpacity="0.65" />
            </svg>
          </button>
          {showCategoryDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-[rgba(30,30,30,0.15)] rounded-xl shadow-lg overflow-hidden">
              {categories.map((cat) => (
                <button
                  key={cat.id_kategori}
                  onClick={() => {
                    setSelectedCategory(cat.id_kategori)
                    setShowCategoryDropdown(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selectedCategory === cat.id_kategori
                      ? 'bg-[rgba(41,141,255,0.1)]'
                      : 'hover:bg-[rgba(30,30,30,0.05)]'
                  }`}
                >
                  <span className="text-lg shrink-0">
                    {CATEGORY_ICONS[cat.nama_kategori]?.icon ?? '📁'}
                  </span>
                  <span className="text-sm font-semibold text-[#1e1e1e] font-body">{cat.nama_kategori}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Wallet ───────────────────────────────────────────────── */}
        <div className="mt-3 relative">
          <button
            onClick={() => {
              setShowWalletDropdown(!showWalletDropdown)
              setShowCategoryDropdown(false)
            }}
            className="w-full flex items-center justify-between bg-white border border-[rgba(30,30,30,0.15)] rounded-xl px-4 py-3.5 text-left hover:bg-[rgba(30,30,30,0.02)] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              {selectedWalletData ? (
                <span className="text-sm font-semibold text-[#1e1e1e] font-body">
                  {selectedWalletData.nama_dompet}
                </span>
              ) : (
                <span className="text-sm text-[rgba(30,30,30,0.45)] font-body">Select Wallet</span>
              )}
            </div>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <path d="M1.41 0.59L0 2L6 8L12 2L10.59 0.59L6 5.17L1.41 0.59Z" fill="#1e1e1e" fillOpacity="0.65" />
            </svg>
          </button>
          {showWalletDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-[rgba(30,30,30,0.15)] rounded-xl shadow-lg overflow-hidden">
              {wallets.map((w) => (
                <button
                  key={w.id_dompet}
                  onClick={() => {
                    setSelectedWallet(w.id_dompet)
                    setShowWalletDropdown(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selectedWallet === w.id_dompet
                      ? 'bg-[rgba(41,141,255,0.1)]'
                      : 'hover:bg-[rgba(30,30,30,0.05)]'
                  }`}
                >
                  <span className="text-sm font-semibold text-[#1e1e1e] font-body">{w.nama_dompet}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Date ─────────────────────────────────────────────────── */}
        <div className="mt-3">
          <div className="flex items-center gap-3 bg-white border border-[rgba(30,30,30,0.15)] rounded-xl px-4 py-3.5">
            <svg width="16" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="rgba(30,30,30,0.45)" strokeWidth="1.5" fill="none"/>
              <path d="M3 10H21" stroke="rgba(30,30,30,0.45)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M8 2V6" stroke="rgba(30,30,30,0.45)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M16 2V6" stroke="rgba(30,30,30,0.45)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </svg>
            <input
              type="text"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="flex-1 text-sm font-semibold text-[#1e1e1e] bg-transparent outline-none font-body"
            />
          </div>
        </div>

        {/* ── Note (Optional) ──────────────────────────────────────── */}
        <div className="mt-3">
          <div className="bg-white border border-[rgba(30,30,30,0.15)] rounded-xl px-4 py-3.5">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was this for?"
              rows={2}
              className="w-full text-sm text-[rgba(30,30,30,0.65)] bg-transparent outline-none resize-none font-body placeholder-[rgba(30,30,30,0.35)]"
            />
          </div>
        </div>
      </div>

      {/* ─── CTA ────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 px-4 md:px-6 lg:mx-auto lg:max-w-2xl lg:px-8 pb-4 pt-2 bg-[#fcfcfc]">
        <button
          onClick={handleSave}
          disabled={saving || !amountNum || !selectedCategory || !selectedWallet}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#298dff] to-[#065fc5] text-white text-sm font-semibold font-body shadow-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Menyimpan...' : 'Save Transaction'}
        </button>
      </div>

      {/* ── Modal loading overlay (D-03) ── */}
      {modalLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(30,30,30,0.2)' }}>
          <div className="flex flex-col items-center gap-3 px-6 py-8 rounded-2xl bg-white shadow-lg">
            <svg className="animate-spin h-8 w-8" style={{ color: '#298dff' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-semibold" style={{ fontFamily: 'Helvetica, sans-serif', color: '#1e1e1e' }}>
              Menghitung saran alokasi...
            </p>
          </div>
        </div>
      )}

      {/* ── Fetch error toast ── */}
      {fetchError && (
        <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
          <div className="rounded-xl px-4 py-3 shadow-lg" style={{ backgroundColor: '#ffdad6', border: '1px solid #ba1a1a' }}>
            <p className="text-sm" style={{ fontFamily: 'Helvetica, sans-serif', color: '#93000a' }} role="alert">
              {fetchError}
            </p>
          </div>
        </div>
      )}

      {/* ── Smart Allocation Modal ── */}
      <SmartAllocationModal
        open={modalOpen}
        transaksiId={savedTransactionId ?? ''}
        suggestion={suggestion}
        sideIncomeAmount={sideIncomeAmount}
        context="fresh"
        onClose={handleModalClose}
        onConfirmed={handleConfirmed}
        onSkipped={handleSkipped}
      />
    </div>
  )
}
