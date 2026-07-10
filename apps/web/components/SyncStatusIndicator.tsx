'use client'

import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, Check } from 'lucide-react'
import { getQueueCount } from '@/lib/offline/queue'
import type { SyncStatus } from '@/lib/offline/types'

const SYNCED_DISPLAY_MS = 2000

interface StatusStyle {
  background: string
  color: string
  label: string
}

const STATUS_STYLES: Record<SyncStatus, StatusStyle> = {
  offline: {
    background: 'rgba(30,30,30,0.05)',
    color: 'rgba(30,30,30,0.65)',
    label: 'Offline',
  },
  syncing: {
    background: 'rgba(41,141,255,0.1)',
    color: '#298dff',
    label: 'Menyinkronkan...',
  },
  synced: {
    background: 'rgba(16,185,129,0.12)',
    color: '#059669',
    label: 'Tersinkron',
  },
}

/**
 * Ambient sync status indicator (OFF-02). Derives its state from
 * navigator.onLine + the offline queue's pending count. Renders NOTHING in
 * the default synced+online+empty-queue case — only appears when there's
 * something to communicate (offline, syncing, or a brief post-sync
 * confirmation), per 04-UI-SPEC.md Visibility Rule.
 *
 * Mounted globally from app/layout.tsx's client wrapper, positioned as a
 * slim full-width bar directly above BottomNav.
 */
export default function SyncStatusIndicator() {
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState<SyncStatus>('synced')

  useEffect(() => {
    let cancelled = false
    let hideTimer: ReturnType<typeof setTimeout> | undefined

    async function evaluate() {
      const count = await getQueueCount()
      if (cancelled) return

      const online = typeof navigator !== 'undefined' ? navigator.onLine : true

      if (!online) {
        setStatus('offline')
        setVisible(true)
        return
      }

      if (count > 0) {
        setStatus('syncing')
        setVisible(true)
        return
      }

      // online + empty queue = default synced state — absent entirely,
      // unless we're mid-transition (handled by the 'synced' branch below).
      setVisible(false)
    }

    function handleOnline() {
      evaluate()
    }

    function handleOffline() {
      setStatus('offline')
      setVisible(true)
    }

    function handleSyncStatus(e: Event) {
      const detail = (e as CustomEvent<SyncStatus>).detail
      if (cancelled) return

      if (detail === 'synced') {
        setStatus('synced')
        setVisible(true)
        hideTimer = setTimeout(() => {
          if (!cancelled) setVisible(false)
        }, SYNCED_DISPLAY_MS)
        return
      }

      setStatus(detail)
      setVisible(true)
    }

    evaluate()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('macost:sync-status', handleSyncStatus)

    return () => {
      cancelled = true
      if (hideTimer) clearTimeout(hideTimer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('macost:sync-status', handleSyncStatus)
    }
  }, [])

  if (!visible) return null

  const style = STATUS_STYLES[status]

  return (
    <div
      className="fixed bottom-[56px] left-0 right-0 z-40 transition-opacity transition-colors duration-200"
      style={{ backgroundColor: style.background }}
    >
      <div className="max-w-2xl mx-auto flex items-center gap-1 px-4 py-2">
        {status === 'offline' && <WifiOff className="w-3.5 h-3.5" style={{ color: style.color }} />}
        {status === 'syncing' && (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: style.color }} />
        )}
        {status === 'synced' && <Check className="w-3.5 h-3.5" style={{ color: style.color }} />}
        <span
          className="text-xs font-semibold font-body"
          style={{ color: style.color }}
        >
          {style.label}
        </span>
      </div>
    </div>
  )
}
