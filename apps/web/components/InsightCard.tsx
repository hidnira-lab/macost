'use client'

import { useRouter } from 'next/navigation'
import { Target, TrendingDown, Wallet, ChevronRight } from 'lucide-react'
import type { AiInsight } from '@/lib/api/types'

/**
 * Maps action_verb → card visual config:
 * - heading, icon, background, decorative elements
 * - action_label (button text), action_path (navigation target)
 */
const CARD_CONFIG: Record<
  AiInsight['action_verb'],
  {
    heading: string
    Icon: typeof Target
    cardBg: string
    cardBorder: string
    iconBg: string
    iconColor: string
    actionLabel: string
    route: string
  }
> = {
  Alokasikan: {
    heading: 'Goal Accelerated!',
    Icon: Target,
    cardBg: '#D5E3FF',
    cardBorder: 'rgba(168, 200, 255, 0.3)',
    iconBg: '#298dff',
    iconColor: '#ffffff',
    actionLabel: 'Buka Goals',
    route: '/goals',
  },
  Kurangi: {
    heading: 'Spending Anomaly',
    Icon: TrendingDown,
    cardBg: '#ffffff',
    cardBorder: 'rgba(30,30,30,0.15)',
    iconBg: '#FFDCC7',
    iconColor: '#642F00',
    actionLabel: 'Cek Transaksi',
    route: '/transactions',
  },
  Pertimbangkan: {
    heading: 'Idle Funds Detected',
    Icon: Wallet,
    cardBg: '#ffffff',
    cardBorder: 'rgba(30,30,30,0.15)',
    iconBg: 'rgba(30,30,30,0.08)',
    iconColor: '#1e1e1e',
    actionLabel: 'Lihat Saran',
    route: '/allocations/pending',
  },
}

interface InsightCardProps {
  insight: AiInsight
  isFirst?: boolean
}

export default function InsightCard({ insight, isFirst = false }: InsightCardProps) {
  const router = useRouter()
  const config = CARD_CONFIG[insight.action_verb]
  const { Icon } = config

  function handleAction() {
    router.push(config.route)
  }

  return (
    <div
      className="rounded-xl overflow-hidden relative transition-shadow hover:shadow-md"
      style={{
        backgroundColor: config.cardBg,
        border: `1px solid ${config.cardBorder}`,
      }}
    >
      {/* Decorative blurred circle — only for first (motivational) card, matching Figma */}
      {isFirst && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 128,
            height: 128,
            top: -39,
            right: -10,
            backgroundColor: 'rgba(0, 91, 176, 0.05)',
            filter: 'blur(20px)',
          }}
        />
      )}

      <div className="px-4 pt-4 pb-4 relative z-10">
        <div className="flex items-start gap-3">
          {/* Circular icon */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
            style={{ backgroundColor: config.iconBg }}
          >
            <Icon className="w-5 h-5" style={{ color: config.iconColor }} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Heading */}
            <p
              className="text-[20px] font-semibold leading-7"
              style={{
                fontFamily: 'Inter, sans-serif',
                color: insight.action_verb === 'Alokasikan' ? '#001B3C' : '#1e1e1e',
              }}
            >
              {config.heading}
            </p>

            {/* Body message */}
            <p
              className="text-base leading-[26px] mt-1"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                color: insight.action_verb === 'Alokasikan' ? '#00468A' : 'rgba(30,30,30,0.65)',
              }}
            >
              {insight.message}
            </p>

            {/* Action button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleAction()
              }}
              className="mt-3 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-base font-semibold transition-opacity hover:opacity-85"
              style={{
                backgroundColor:
                  insight.action_verb === 'Alokasikan' ? 'rgba(0, 91, 176, 0.08)' : 'rgba(30,30,30,0.08)',
                color: insight.action_verb === 'Alokasikan' ? '#005BB0' : '#1e1e1e',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              {config.actionLabel}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}