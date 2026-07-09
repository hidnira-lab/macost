'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiMutate, apiUpload, isAuthError } from '@/lib/api/client'
import { getToken } from '@/lib/auth/session'
import type { ScanReceiptResponse, TransactionCreateRequest } from '@/lib/api/types'
import ReceiptReviewForm from '@/components/ReceiptReviewForm'

const USE_MOCK = typeof window !== 'undefined'
  ? process.env.NEXT_PUBLIC_USE_MOCK === 'true'
  : process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export default function ScanReceiptPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<'idle' | 'uploading' | 'review' | 'error'>('idle')
  const [scanResult, setScanResult] = useState<ScanReceiptResponse | null>(null)
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

    try {
      let result: ScanReceiptResponse

      if (USE_MOCK) {
        // Load static mock instead of calling the backend
        const scanData = await import('@/mocks/scan-receipt.json')
        // Simulate network delay for realistic UX
        await new Promise((resolve) => setTimeout(resolve, 1500))
        result = scanData.default as unknown as ScanReceiptResponse
      } else {
        const formData = new FormData()
        formData.append('image', file)
        result = await apiUpload<ScanReceiptResponse>(
          '/api/transactions/scan-receipt',
          formData
        )
      }

      if (result.extracted) {
        setScanResult(result)
        setState('review')
      } else {
        setScanResult(result)
        setState('error')
      }
    } catch (err) {
      if (isAuthError(err)) {
        router.push('/login')
        return
      }
      setScanResult({
        extracted: false,
        error_message: 'Gagal membaca struk. Silakan masukkan transaksi secara manual.',
      })
      setState('error')
    }
  }

  async function handleSubmit(payload: TransactionCreateRequest) {
    await apiMutate('/api/transactions', 'POST', payload)
    router.push('/transactions')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfcfc]">
        <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">Memuat...</p>
      </div>
    )
  }

  if (state === 'review' && scanResult) {
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
              Scan Struk
            </h1>
            <div className="h-9 w-9" />
          </header>

          <div className="mt-6 space-y-6">
            {/* Read-only extraction summary */}
            {scanResult.merchant && (
              <div className="rounded-xl border border-[rgba(30,30,30,0.15)] bg-white px-4 py-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                <p className="font-body text-xs font-bold uppercase tracking-wide text-[rgba(30,30,30,0.65)]">
                  Merchant
                </p>
                <p className="font-body mt-1 text-base font-semibold text-[#1e1e1e]">
                  {scanResult.merchant}
                </p>
              </div>
            )}

            {scanResult.items && scanResult.items.length > 0 && (
              <div className="rounded-xl border border-[rgba(30,30,30,0.15)] bg-white px-4 py-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                <p className="font-body text-xs font-bold uppercase tracking-wide text-[rgba(30,30,30,0.65)]">
                  Item yang terdeteksi
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {scanResult.items.map((item, idx) => (
                    <li
                      key={idx}
                      className="font-body text-sm text-[rgba(30,30,30,0.65)]"
                    >
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ReceiptReviewForm
              key={JSON.stringify(scanResult)}
              initialValues={scanResult}
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
            />
          </div>
        </div>
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
            Scan Struk
          </h1>
          <div className="h-9 w-9" />
        </header>

        <div className="mt-16 flex flex-col items-center gap-8">
          {/* ── Upload Area ── */}
          {state === 'uploading' ? (
            <div className="flex flex-col items-center gap-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#298dff] border-t-transparent">
                <svg className="h-12 w-12 animate-spin text-[#298dff]" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
              </div>
              <p className="font-body text-base font-semibold text-[#1e1e1e]">
                Mengekstrak data struk…
              </p>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full max-w-sm cursor-pointer flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-[rgba(30,30,30,0.15)] bg-white px-8 py-12 transition-colors hover:border-[#298dff]"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(41,141,255,0.1)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#298dff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M14 2V8H20" stroke="#298dff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M12 18V12" stroke="#298dff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 15H15" stroke="#298dff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="font-body text-base font-semibold text-[#1e1e1e]">
                Upload foto struk belanja
              </p>
              <p className="font-body text-sm text-[rgba(30,30,30,0.65)]">
                Format JPG atau PNG
              </p>
              <button
                type="button"
                className="font-body mt-2 rounded-xl px-6 py-4 text-lg font-bold text-white shadow-[0_4px_12px_rgba(41,141,255,0.3)] transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #298dff, #065fc5)' }}
              >
                Pilih File Struk
              </button>
            </div>
          )}

          {/* Hidden file input — JPG/PNG only, no camera capture */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            capture={undefined}
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* ── Error state ── */}
          {state === 'error' && scanResult && (
            <div className="w-full max-w-sm">
              <div className="rounded-xl border border-[#ba1a1a] bg-[#ffdad6] px-4 py-4">
                <p className="font-body text-sm text-[#93000a]" role="alert">
                  {scanResult.error_message ?? 'Gagal membaca struk. Silakan masukkan transaksi secara manual.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/transactions')}
                className="font-body mt-4 w-full rounded-xl border border-[rgba(30,30,30,0.15)] px-6 py-4 text-lg font-semibold text-[#1e1e1e] transition-colors hover:bg-[rgba(30,30,30,0.05)]"
              >
                Input Manual
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}