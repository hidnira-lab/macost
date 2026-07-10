'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import type {
  Category,
  CategoriesResponse,
  Wallet,
  WalletsResponse,
  ExtractedStatementTransaction,
  ImportBatchResponse,
} from '@/lib/api/types'
import { apiMutate } from '@/lib/api/client'

export interface StatementReviewTableProps {
  rows: ExtractedStatementTransaction[]
}

export default function StatementReviewTable({ rows }: StatementReviewTableProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // temp_id -> checked state
  const [checkedSet, setCheckedSet] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const row of rows) {
      if (!row.is_possible_duplicate) {
        initial.add(row.temp_id)
      }
    }
    return initial
  })

  // temp_id -> selected kategori_id (default: suggested_category_id)
  const [rowCategories, setRowCategories] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const row of rows) {
      initial[row.temp_id] = row.suggested_category_id ?? ''
    }
    return initial
  })

  // temp_id -> selected dompet_id
  const [rowWallets, setRowWallets] = useState<Record<string, string>>({})

  // temp_id -> catatan
  const [rowNotes, setRowNotes] = useState<Record<string, string>>({})

  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportBatchResponse | null>(null)

  const allChecked = checkedSet.size === rows.length
  const selectedCount = checkedSet.size

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
        // Non-critical — selectors will just be empty
      } finally {
        setLoadingOptions(false)
      }
    }
    loadOptions()
  }, [])

  function toggleRow(tempId: string) {
    setCheckedSet((prev) => {
      const next = new Set(prev)
      if (next.has(tempId)) {
        next.delete(tempId)
      } else {
        next.add(tempId)
      }
      return next
    })
  }

  function toggleAll() {
    if (allChecked) {
      setCheckedSet(new Set())
    } else {
      setCheckedSet(new Set(rows.map((r) => r.temp_id)))
    }
  }

  function updateCategory(tempId: string, value: string) {
    setRowCategories((prev) => ({ ...prev, [tempId]: value }))
  }

  function updateWallet(tempId: string, value: string) {
    setRowWallets((prev) => ({ ...prev, [tempId]: value }))
  }

  function updateNote(tempId: string, value: string) {
    setRowNotes((prev) => ({ ...prev, [tempId]: value }))
  }

  async function handleImport() {
    setImportError(null)
    setImportResult(null)

    // Validate: every checked row must have kategori and dompet
    const missing: string[] = []
    for (const row of rows) {
      if (!checkedSet.has(row.temp_id)) continue
      if (!rowCategories[row.temp_id]) {
        missing.push(row.deskripsi)
      }
      if (!rowWallets[row.temp_id]) {
        if (!missing.includes(row.deskripsi)) missing.push(row.deskripsi)
      }
    }
    if (missing.length > 0) {
      setImportError('Beberapa baris belum memiliki kategori atau dompet.')
      return
    }

    setImporting(true)
    try {
      const checkedRows = rows
        .filter((r) => checkedSet.has(r.temp_id))
        .map((r) => ({
          ...r,
          kategori_id: rowCategories[r.temp_id],
          dompet_id: rowWallets[r.temp_id],
          catatan: rowNotes[r.temp_id]?.trim() || null,
        }))

      const result = await apiMutate<ImportBatchResponse>(
        '/api/transactions/import-batch',
        'POST',
        { transactions: checkedRows }
      )
      setImportResult(result)
    } catch {
      setImportError('Gagal mengimpor transaksi. Coba lagi.')
    } finally {
      setImporting(false)
    }
  }

  if (importResult) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="rounded-xl border border-[rgba(41,141,255,0.3)] bg-[rgba(41,141,255,0.08)] px-6 py-4 text-center">
          <p className="font-body text-base font-semibold text-[#065fc5]">
            {importResult.imported_count} transaksi diimpor, {importResult.skipped_count} dilewati.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header: "Pilih semua / Hapus pilihan" toggle ── */}
      <div className="flex items-center justify-between">
        <p className="font-body text-xs font-bold uppercase tracking-wide text-[rgba(30,30,30,0.65)]">
          {selectedCount} dipilih
        </p>
        <button
          onClick={toggleAll}
          className="font-body text-xs font-bold text-[#298dff] transition-opacity hover:opacity-80"
          aria-label={allChecked ? 'Hapus pilihan' : 'Pilih semua'}
        >
          {allChecked ? 'Hapus pilihan' : 'Pilih semua'}
        </button>
      </div>

      {/* ── Transaction rows ── */}
      <div className="flex flex-col gap-2">
        {rows.map((row) => {
          const isChecked = checkedSet.has(row.temp_id)
          const isDuplicate = row.is_possible_duplicate
          return (
            <div
              key={row.temp_id}
              className={`rounded-xl border bg-white px-4 py-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] ${
                isDuplicate
                  ? 'border-[rgba(255,137,41,0.3)]'
                  : 'border-[rgba(30,30,30,0.15)]'
              } ${isChecked ? '' : 'opacity-60'}`}
            >
              {/* Checkbox + description + nominal row */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleRow(row.temp_id)}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    isChecked
                      ? 'border-[#298dff] bg-[#298dff]'
                      : 'border-[rgba(30,30,30,0.25)] bg-white'
                  }`}
                  aria-label={isChecked ? `Hapus ${row.deskripsi}` : `Pilih ${row.deskripsi}`}
                >
                  {isChecked && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-body text-base font-semibold text-[#1e1e1e] truncate">
                      {row.deskripsi}
                    </p>
                    <p className={`font-body text-base font-semibold shrink-0 ${
                      row.tipe_transaksi === 'Pemasukan' ? 'text-[#298dff]' : 'text-[#ba1a1a]'
                    }`}>
                      {row.tipe_transaksi === 'Pemasukan' ? '+' : '-'} Rp {row.nominal.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <p className="font-body text-sm text-[rgba(30,30,30,0.65)] mt-0.5">
                    {row.tanggal_transaksi}
                  </p>

                  {/* "Mungkin duplikat" badge */}
                  {isDuplicate && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[rgba(255,137,41,0.12)] px-2.5 py-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#ff8929" />
                      </svg>
                      <span className="font-body text-xs font-bold text-[rgba(255,137,41,0.85)]">
                        Mungkin duplikat
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* ── Category, Wallet, Note selectors (only when checked) ── */}
              {isChecked && (
                <div className="mt-3 flex flex-col gap-3 pl-8">
                  {/* Category selector */}
                  <div>
                    <label className="font-body block text-xs font-bold text-[rgba(30,30,30,0.65)]">
                      Kategori
                    </label>
                    <select
                      value={rowCategories[row.temp_id] ?? ''}
                      onChange={(e) => updateCategory(row.temp_id, e.target.value)}
                      disabled={loadingOptions}
                      className="font-body mt-1 w-full rounded-lg border border-[rgba(30,30,30,0.15)] bg-white px-3 py-2 text-sm text-[#1e1e1e] outline-none disabled:opacity-60"
                    >
                      <option value="" disabled>Pilih kategori</option>
                      {categories.map((c) => (
                        <option key={c.id_kategori} value={c.id_kategori}>
                          {c.nama_kategori}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Wallet selector */}
                  <div>
                    <label className="font-body block text-xs font-bold text-[rgba(30,30,30,0.65)]">
                      Dompet
                    </label>
                    <select
                      value={rowWallets[row.temp_id] ?? ''}
                      onChange={(e) => updateWallet(row.temp_id, e.target.value)}
                      disabled={loadingOptions}
                      className="font-body mt-1 w-full rounded-lg border border-[rgba(30,30,30,0.15)] bg-white px-3 py-2 text-sm text-[#1e1e1e] outline-none disabled:opacity-60"
                    >
                      <option value="" disabled>Pilih dompet</option>
                      {wallets.map((w) => (
                        <option key={w.id_dompet} value={w.id_dompet}>
                          {w.nama_dompet}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Note input */}
                  <div>
                    <label className="font-body block text-xs font-bold text-[rgba(30,30,30,0.65)]">
                      Catatan (opsional)
                    </label>
                    <input
                      type="text"
                      value={rowNotes[row.temp_id] ?? ''}
                      onChange={(e) => updateNote(row.temp_id, e.target.value)}
                      placeholder="Tambahkan catatan..."
                      className="font-body mt-1 w-full rounded-lg border border-[rgba(30,30,30,0.15)] bg-white px-3 py-2 text-sm text-[rgba(30,30,30,0.65)] outline-none placeholder:text-[rgba(30,30,30,0.35)]"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Import error ── */}
      {importError && (
        <div className="rounded-xl border border-[#ba1a1a] bg-[#ffdad6] px-4 py-3">
          <p className="font-body text-sm text-[#93000a]" role="alert">
            {importError}
          </p>
        </div>
      )}

      {/* ── Sticky bottom button ── */}
      <button
        onClick={handleImport}
        disabled={selectedCount === 0 || importing}
        className="font-body w-full rounded-xl px-6 py-4 text-lg font-bold text-white shadow-[0_4px_12px_rgba(41,141,255,0.3)] transition-opacity disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #298dff, #065fc5)' }}
      >
        {importing ? 'Mengimpor...' : `Import Terpilih (${selectedCount})`}
      </button>
    </div>
  )
}