'use client'

import { useRouter } from 'next/navigation'
import { Plus, ScanLine, Wallet } from 'lucide-react'

interface QuickAccessPanelProps {
  remainingBudget: number
}

export default function QuickAccessPanel({ remainingBudget }: QuickAccessPanelProps) {
  const router = useRouter()

  return (
    <section>
      <h2 className="font-display mb-4 text-xl font-semibold text-[#1e1e1e]">Quick Access</h2>
      <div className="flex flex-col gap-4">
        {/* ── 1. Add Transaction ── */}
        <button
          onClick={() => router.push('/transactions')}
          className="flex h-20 flex-row items-center gap-4 rounded-xl p-4 text-left shadow-[0_4px_4px_0_rgba(0,0,0,0.05)] transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #298dff, #065fc5)' }}
          aria-label="Tambah Transaksi"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.1)] backdrop-blur-sm">
            <Plus className="h-4 w-4 text-white" />
          </span>
          <span>
            <span className="font-display block text-xl font-semibold text-[#fcfcfc]">Tambah</span>
            <span className="font-body block text-xs font-bold text-[rgba(255,255,255,0.65)]">Transaksi</span>
          </span>
        </button>

        {/* ── 2. Scan Receipt ── */}
        <button
          onClick={() => router.push('/transactions/scan')}
          className="flex h-20 flex-row items-center gap-4 rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-4 text-left shadow-[0_4px_4px_0_rgba(0,0,0,0.05)] transition-opacity hover:opacity-90"
          aria-label="Scan Struk"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(41,141,255,0.14)]">
            <ScanLine className="h-5 w-5 text-[#298dff]" />
          </span>
          <span>
            <span className="font-display block text-xl font-semibold text-[#1e1e1e]">Scan</span>
            <span className="font-body block text-xs font-bold text-[rgba(30,30,30,0.65)]">Struk</span>
          </span>
        </button>

        {/* ── 3. Balance Summary ── */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex h-20 flex-row items-center gap-4 rounded-xl border border-[rgba(30,30,30,0.15)] bg-white p-4 text-left shadow-[0_4px_4px_0_rgba(0,0,0,0.05)] transition-opacity hover:opacity-90"
          aria-label="Ringkasan saldo"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(41,141,255,0.14)]">
            <Wallet className="h-5 w-5 text-[#298dff]" />
          </span>
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-wide text-[rgba(30,30,30,0.65)]">
              Sisa Anggaran
            </p>
            <p className="font-display mt-0.5 text-[22px] font-extrabold leading-tight text-[#1e1e1e]">
              Rp {remainingBudget.toLocaleString('id-ID')}
            </p>
          </div>
        </button>
      </div>
    </section>
  )
}