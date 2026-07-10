'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiUpload, isAuthError } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type { UploadStatementResponse, ExtractedStatementTransaction } from '@/lib/api/types'
import StatementReviewTable from '@/components/StatementReviewTable'

const USE_MOCK = typeof window !== 'undefined'
  ? process.env.NEXT_PUBLIC_USE_MOCK === 'true'
  : process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export default function ImportStatementPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<'idle' | 'uploading' | 'review' | 'error' | 'empty'>('idle')
  const [extractedRows, setExtractedRows] = useState<ExtractedStatementTransaction[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    async function init() {
      if (!USE_MOCK) {
        const token = await getToken()
        if (!token) {
          router.push('/login')
          return
        }
      }
      setLoading(false)
      setAuthChecked(true)
    }
    init()
  }, [router])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setState('uploading')
    setErrorMessage(null)

    try {
      let result: UploadStatementResponse

      if (USE_MOCK) {
        const uploadData = await import('@/mocks/upload-statement.json')
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1500))
        result = uploadData.default as unknown as UploadStatementResponse
      } else {
        const formData = new FormData()
        formData.append('file', file)
        result = await apiUpload<UploadStatementResponse>(
          '/api/transactions/upload-statement',
          formData
        )
      }

      if ('extracted_transactions' in result) {
        const rows = result.extracted_transactions
        if (rows.length === 0) {
          setState('empty')
        } else {
          setExtractedRows(rows)
          setState('review')
        }
      } else {
        setErrorMessage(result.error_message ?? 'Gagal membaca file PDF. Pastikan filenya e-statement yang valid, lalu coba lagi.')
        setState('error')
      }
    } catch (err) {
      if (isAuthError(err)) {
        router.push('/login')
        return
      }
      setErrorMessage('Gagal membaca file PDF. Pastikan filenya e-statement yang valid, lalu coba lagi.')
      setState('error')
    }
  }

  function handleRetry() {
    setState('idle')
    setErrorMessage(null)
    setExtractedRows([])
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfcfc]">
        <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">Memuat...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <div className="mx-auto w-full px-4 pb-28 md:max-w-2xl md:px-6 lg:max-w-5xl lg:px-8">
        {/* ── Top App Bar ── */}
        <header className="sticky top-0 z-10 -mx-4 flex h-16 items-center justify-between border-b border-[rgba(30,30,30,0.08)] bg-[rgba(252,252,252,0.8)] px-4 backdrop-blur-[6px] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[rgba(30,30,30,0.05)]"
            aria-label="Kembali"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="rgba(30,30,30,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#298dff]">
            Import E-Statement
          </h1>
          <div className="h-9 w-9" />
        </header>

        {/* ── Content ── */}
        <div className="mt-6 flex flex-col gap-6">
          {/* ── Subtitle ── */}
          <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">
            Upload your bank or e-wallet transaction history to auto-sync.
          </p>

          {/* ── Upload Area (hanya saat idle) ── */}
          {state === 'idle' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed border-[rgba(30,30,30,0.15)] bg-white px-8 py-12 transition-colors hover:border-[#298dff]"
            >
              {/* Icon — upload document */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(41,141,255,0.1)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#298dff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M14 2V8H20" stroke="#298dff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M12 18V12" stroke="#298dff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 15H15" stroke="#298dff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="font-body text-base font-semibold text-[#1e1e1e]">
                Pilih File PDF
              </p>
              <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">
                Format PDF, maks 50MB
              </p>
              <button
                type="button"
                className="font-body mt-2 rounded-xl px-6 py-4 text-lg font-bold text-white shadow-[0_4px_12px_rgba(41,141,255,0.3)] transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #298dff, #065fc5)' }}
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Pilih File PDF
              </button>
            </div>
          )}

          {/* ── Preview Transactions (SELALU muncul di bawah upload area) ── */}
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[rgba(30,30,30,0.08)] pb-2">
              <h2 className="font-display text-xl font-semibold text-[#1e1e1e]">
                Preview Transactions
              </h2>
              <div className="flex items-center gap-3">
                {state === 'review' && (
                  <>
                    <span className="font-body text-xs font-bold text-[rgba(30,30,30,0.65)]">
                      Found {extractedRows.length} items
                    </span>
                    <button
                      onClick={handleRetry}
                      className="font-body rounded-lg bg-[rgba(30,30,30,0.08)] px-3 py-1.5 text-sm font-semibold text-[#1e1e1e] transition-colors hover:bg-[rgba(30,30,30,0.12)]"
                    >
                      Upload file lain
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── idle → empty state ── */}
            {state === 'idle' && (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[rgba(30,30,30,0.15)] bg-white px-8 py-12">
                <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">
                  Upload File PDF untuk menambah histori
                </p>
              </div>
            )}

            {/* ── uploading → loading spinner ── */}
            {state === 'uploading' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#298dff] border-t-transparent">
                  <svg className="h-8 w-8 animate-spin text-[#298dff]" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="font-body text-base font-semibold text-[#1e1e1e]">
                  Membaca statement…
                </p>
              </div>
            )}

            {/* ── review → StatementReviewTable ── */}
            {state === 'review' && (
              <div className="rounded-xl border border-[rgba(30,30,30,0.15)] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                <div className="px-4 py-4">
                  <StatementReviewTable rows={extractedRows} />
                </div>
              </div>
            )}

            {/* ── empty → pesan empty ── */}
            {state === 'empty' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-full rounded-xl border border-[rgba(30,30,30,0.15)] bg-white px-8 py-8 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                  <p className="font-body text-base font-semibold text-[#1e1e1e]">
                    Tidak ada transaksi ditemukan
                  </p>
                  <p className="font-body mt-2 text-sm text-[rgba(30,30,30,0.65)]">
                    Kami tidak menemukan transaksi di PDF ini. Coba file lain atau input manual.
                  </p>
                  <div className="mt-4 flex gap-3 justify-center">
                    <button
                      onClick={handleRetry}
                      className="font-body rounded-xl bg-[#298dff] px-6 py-3 text-base font-bold text-white transition-opacity hover:opacity-90"
                    >
                      Coba file lain
                    </button>
                    <button
                      onClick={() => router.push('/transactions')}
                      className="font-body rounded-xl border border-[rgba(30,30,30,0.15)] px-6 py-3 text-base font-semibold text-[#1e1e1e] transition-colors hover:bg-[rgba(30,30,30,0.05)]"
                    >
                      Input Manual
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── error → pesan error ── */}
            {state === 'error' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-full max-w-sm">
                  <div className="rounded-xl border border-[#ba1a1a] bg-[#ffdad6] px-4 py-4">
                    <p className="font-body text-sm text-[#93000a]" role="alert">
                      {errorMessage ?? 'Gagal membaca file PDF. Pastikan filenya e-statement yang valid, lalu coba lagi.'}
                    </p>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={handleRetry}
                      className="font-body flex-1 rounded-xl bg-[#298dff] px-6 py-4 text-lg font-bold text-white transition-opacity hover:opacity-90"
                    >
                      Coba Lagi
                    </button>
                    <button
                      onClick={() => router.push('/transactions')}
                      className="font-body flex-1 rounded-xl border border-[rgba(30,30,30,0.15)] px-6 py-4 text-lg font-semibold text-[#1e1e1e] transition-colors hover:bg-[rgba(30,30,30,0.05)]"
                    >
                      Input Manual
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input — PDF only */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}