'use client'

import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { Sparkles, Clock, ChevronRight } from 'lucide-react'

export default function AiAssistantPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fcfcfc' }}>
      <div className="mx-auto w-full px-4 md:max-w-2xl md:px-6 lg:max-w-5xl lg:px-8 pb-28 md:pb-32 lg:pb-32">
        {/* ── Header ── */}
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

        {/* ── AI Insights Card ── */}
        <div
          className="rounded-xl overflow-hidden mb-5 mt-4 cursor-pointer transition-shadow hover:shadow-md"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(30,30,30,0.15)',
          }}
          onClick={() => router.push('/ai/insights')}
        >
          <div className="px-4 pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(41,141,255,0.1)' }}
              >
                <Sparkles className="w-5 h-5" style={{ color: '#298dff' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-base font-semibold"
                  style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
                >
                  AI Insights
                </p>
                <p
                  className="text-sm mt-0.5"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
                >
                  Wawasan dan rekomendasi cerdas untuk keuanganmu.
                </p>
              </div>
              <ChevronRight
                className="w-4 h-4 shrink-0 mt-2"
                style={{ color: 'rgba(30,30,30,0.3)' }}
              />
            </div>
          </div>
        </div>

        {/* ── Pending Suggestions Card ── */}
        <div
          className="rounded-xl overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(30,30,30,0.15)',
          }}
          onClick={() => router.push('/allocations/pending')}
        >
          <div className="px-4 pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(255,137,41,0.15)' }}
              >
                <Clock className="w-5 h-5" style={{ color: '#ff8929' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-base font-semibold"
                  style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}
                >
                  Pending Suggestions
                </p>
                <p
                  className="text-sm mt-0.5"
                  style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}
                >
                  Saran Smart Allocation yang menunggu konfirmasi kamu.
                </p>
              </div>
              <ChevronRight
                className="w-4 h-4 shrink-0 mt-2"
                style={{ color: 'rgba(30,30,30,0.3)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Navigation Bar ────────────────────────────────── */}
      <BottomNav activeTab="AI Assistant" />
    </div>
  )
}