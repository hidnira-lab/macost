'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import type {
  Category,
  CategoriesResponse,
  Wallet,
  WalletsResponse,
  TransactionCreateRequest,
} from '@/lib/api/types'

export interface TransactionFormProps {
  /** Pre-filled values for edit mode */
  initialValues?: Partial<TransactionCreateRequest>
  /** Present in edit mode only — parent decides POST vs PUT based on this */
  transactionId?: string
  /** Parent owns the actual apiMutate call + save-sequencing logic */
  onSubmit: (payload: TransactionCreateRequest) => Promise<void>
  /** Shown next to the submit button in edit mode only */
  onCancel?: () => void
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatRpInput(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('id-ID')
}

function parseRpInput(value: string): number {
  return Number(value.replace(/[^0-9]/g, '')) || 0
}

export default function TransactionForm({
  initialValues,
  transactionId,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const isEditMode = Boolean(transactionId)
  const [categories, setCategories] = useState<Category[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const [nominal, setNominal] = useState(initialValues?.nominal ?? 0)
  const [nominalDisplay, setNominalDisplay] = useState(
    formatRpInput(initialValues?.nominal ?? 0)
  )
  const [kategoriId, setKategoriId] = useState(initialValues?.kategori_id ?? '')
  const [dompetId, setDompetId] = useState(initialValues?.dompet_id ?? '')
  const [tanggalTransaksi, setTanggalTransaksi] = useState(
    initialValues?.tanggal_transaksi ?? todayIso()
  )
  const [catatan, setCatatan] = useState(initialValues?.catatan ?? '')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOptions() {
      try {
        const [categoriesRes, walletsRes] = await Promise.all([
          apiFetch<CategoriesResponse>('/api/categories'),
          apiFetch<WalletsResponse>('/api/wallets'),
        ])
        setCategories(categoriesRes.categories)
        setWallets(walletsRes.wallets)
      } catch {
        setError('Gagal memuat kategori atau dompet.')
      } finally {
        setLoadingOptions(false)
      }
    }
    loadOptions()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (nominal <= 0) {
      setError('Nominal harus lebih dari 0.')
      return
    }
    if (!kategoriId) {
      setError('Kategori harus dipilih.')
      return
    }
    if (!dompetId) {
      setError('Dompet harus dipilih.')
      return
    }

    // tipe_transaksi is auto-derived from the selected category's own `tipe` —
    // never a manual Pemasukan/Pengeluaran toggle the user can set independently.
    const selectedCategory = categories.find((c) => c.id_kategori === kategoriId)

    setError(null)
    setSubmitting(true)
    try {
      const payload: TransactionCreateRequest = {
        tipe_transaksi: selectedCategory?.tipe ?? 'Pengeluaran',
        nominal,
        tanggal_transaksi: tanggalTransaksi,
        metode_input: 'Manual',
        dompet_id: dompetId,
        kategori_id: kategoriId,
        catatan: catatan.trim() || null,
      }
      await onSubmit(payload)
      if (!isEditMode) {
        // Reset for the next entry (create mode only) — edit mode unmounts
        // via the parent's `key` swap once editing finishes.
        setNominal(0)
        setNominalDisplay('')
        setKategoriId('')
        setDompetId('')
        setTanggalTransaksi(todayIso())
        setCatatan('')
      }
    } catch {
      setError('Gagal menyimpan transaksi. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="rounded-xl border border-[#ba1a1a] bg-[#ffdad6] px-4 py-3">
          <p className="font-body text-sm text-[#93000a]" role="alert">
            {error}
          </p>
        </div>
      )}

      {/* Amount */}
      <div className="rounded-xl border border-[rgba(30,30,30,0.15)] bg-white px-4 py-8 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <label
          htmlFor="nominal"
          className="font-body text-sm text-[rgba(30,30,30,0.65)]"
        >
          Nominal
        </label>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="font-body text-xl font-semibold text-[#1e1e1e]">
            Rp
          </span>
          <input
            id="nominal"
            type="text"
            inputMode="numeric"
            required
            aria-required="true"
            value={nominalDisplay}
            onChange={(e) => {
              const num = parseRpInput(e.target.value)
              setNominal(num)
              setNominalDisplay(formatRpInput(num))
            }}
            placeholder="0"
            className="font-display w-40 bg-transparent text-center text-[40px] font-extrabold text-[#1e1e1e] outline-none placeholder:text-[rgba(30,30,30,0.35)]"
          />
        </div>
      </div>

      {/* Category, Wallet, Date, Note */}
      <div className="flex flex-col gap-4 rounded-xl border border-[rgba(30,30,30,0.15)] bg-white px-4 py-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        {/* Category */}
        <div>
          <label
            htmlFor="kategori"
            className="font-body block text-sm text-[rgba(30,30,30,0.65)]"
          >
            Kategori
          </label>
          <select
            id="kategori"
            required
            aria-required="true"
            value={kategoriId}
            onChange={(e) => setKategoriId(e.target.value)}
            disabled={loadingOptions}
            className="font-body mt-1 w-full rounded-lg border border-[rgba(30,30,30,0.15)] bg-white px-4 py-3 text-sm text-[#1e1e1e] outline-none disabled:opacity-60"
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {categories.map((c) => (
              <option key={c.id_kategori} value={c.id_kategori}>
                {c.nama_kategori}
              </option>
            ))}
          </select>
        </div>

        {/* Wallet */}
        <div>
          <label
            htmlFor="dompet"
            className="font-body block text-sm text-[rgba(30,30,30,0.65)]"
          >
            Dompet
          </label>
          <select
            id="dompet"
            required
            aria-required="true"
            value={dompetId}
            onChange={(e) => setDompetId(e.target.value)}
            disabled={loadingOptions}
            className="font-body mt-1 w-full rounded-lg border border-[rgba(30,30,30,0.15)] bg-white px-4 py-3 text-sm text-[#1e1e1e] outline-none disabled:opacity-60"
          >
            <option value="" disabled>
              Pilih dompet
            </option>
            {wallets.map((w) => (
              <option key={w.id_dompet} value={w.id_dompet}>
                {w.nama_dompet}
              </option>
            ))}
          </select>
        </div>

        {/* Date — pre-filled, editable, NOT part of the 3-required budget */}
        <div>
          <label
            htmlFor="tanggal"
            className="font-body block text-sm text-[rgba(30,30,30,0.65)]"
          >
            Tanggal
          </label>
          <input
            id="tanggal"
            type="date"
            value={tanggalTransaksi}
            onChange={(e) => setTanggalTransaksi(e.target.value)}
            className="font-body mt-1 w-full rounded-lg border border-[rgba(30,30,30,0.15)] bg-white px-4 py-3 text-sm text-[#1e1e1e] outline-none"
          />
        </div>

        {/* Note — optional, visually de-emphasized */}
        <div>
          <label
            htmlFor="catatan"
            className="font-body block text-xs text-[rgba(30,30,30,0.5)]"
          >
            Catatan (opsional)
          </label>
          <textarea
            id="catatan"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Untuk apa transaksi ini?"
            rows={2}
            className="font-body mt-1 w-full resize-none rounded-lg border border-[rgba(30,30,30,0.15)] bg-white px-4 py-3 text-sm text-[rgba(30,30,30,0.65)] outline-none placeholder:text-[rgba(30,30,30,0.35)]"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="font-body flex-1 rounded-xl px-6 py-4 text-lg font-bold text-white shadow-[0_4px_12px_rgba(41,141,255,0.3)] transition-opacity disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #298dff, #065fc5)' }}
        >
          {submitting ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Simpan Transaksi'}
        </button>
        {isEditMode && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="font-body rounded-xl border border-[rgba(30,30,30,0.15)] px-6 py-4 text-lg font-semibold text-[#1e1e1e] transition-colors hover:bg-[rgba(30,30,30,0.05)] disabled:opacity-60"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  )
}
