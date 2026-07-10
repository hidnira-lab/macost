'use client'

import { useEffect } from 'react'
import { sync } from '@/lib/offline/queue'
import type { SyncStatus } from '@/lib/offline/types'
import SyncStatusIndicator from './SyncStatusIndicator'

/**
 * Global offline-sync mount point (OFF-01/OFF-02). Registers the
 * window 'online' listener exactly once (mount-time useEffect, never at
 * module scope — Pitfall 1: next build's static-export prerender runs in
 * Node, which has no `indexedDB`/`window` global) and renders the ambient
 * SyncStatusIndicator alongside {children} in the root layout.
 *
 * On each successful sync of a queued transaction whose response signals
 * allocation_suggestion_available, dispatches a 'macost:allocation-suggestion'
 * CustomEvent carrying { transaksiId, suggestion } so any mounted page (e.g.
 * transactions/new) can open its existing allocation modal — never at
 * enqueue time (D-02).
 */
export default function OfflineSyncProvider() {
  useEffect(() => {
    function reportStatus(status: SyncStatus) {
      window.dispatchEvent(new CustomEvent<SyncStatus>('macost:sync-status', { detail: status }))
    }

    function handleOnline() {
      sync(reportStatus, (transaksiId, suggestion) => {
        window.dispatchEvent(
          new CustomEvent('macost:allocation-suggestion', {
            detail: { transaksiId, suggestion },
          })
        )
      })
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return <SyncStatusIndicator />
}
