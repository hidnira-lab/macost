/**
 * Offline write queue — enqueue() + sync() (OFF-01).
 *
 * enqueue() writes a pending write action to IndexedDB; sync() (triggered by
 * the browser/WebView 'online' event, wired from app/layout.tsx's client
 * wrapper) replays every queued item SEQUENTIALLY (never Promise.all — this
 * preserves goal-before-allocation ordering per 04-RESEARCH.md Pitfall 3 /
 * the D-01 broadened offline scope) via the existing apiMutate()/apiFetch()
 * functions, injecting idempotency_key: item.id into each request body (the
 * field 04-01 added server-side).
 *
 * D-02 (never-negotiable): a side-income transaction's allocation-suggestion
 * fetch + modal trigger only happens HERE, inside sync()'s per-item success
 * handler for kind: 'transaction' — never at enqueue() time, since SAW
 * ranking needs live server-side goal data that doesn't exist client-side
 * while offline.
 */
import { apiMutate, apiFetch } from "@/lib/api/client";
import { getDB } from "./db";
import type {
  NewQueuedItem,
  QueuedItem,
  SyncStatus,
} from "./types";
import type {
  Transaction,
  AllocationSuggestionResponse,
  AllocationConfirmResponse,
  AllocationSkipResponse,
  Goal,
  GoalDetailResponse,
} from "@/lib/api/types";

/**
 * Called by sync() after a queued transaction successfully syncs AND the
 * response signals an allocation suggestion is available. The caller (the
 * root layout's client wrapper / transactions/new page) supplies this to
 * open its existing allocation-suggestion modal with the resolved data.
 * Never invoked at enqueue time (D-02).
 */
export type AllocationSuggestionHandler = (
  transaksiId: string,
  suggestion: AllocationSuggestionResponse
) => void;

/**
 * Enqueue a pending write action to IndexedDB. Returns the generated id,
 * which doubles as the idempotency_key sent on replay (D-03).
 */
export async function enqueue(item: NewQueuedItem): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const queued = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    attempts: 0,
  } as QueuedItem;
  await db.add("queue", queued);
  return id;
}

/** Number of items currently queued — used by SyncStatusIndicator. */
export async function getQueueCount(): Promise<number> {
  const db = await getDB();
  return db.count("queue");
}

/**
 * Replays a single queued item against the real API, injecting
 * idempotency_key: item.id into the request body. Reuses apiMutate/apiFetch
 * unchanged — no parallel fetch/error-parsing path (04-PATTERNS.md).
 *
 * Returns the transaction response when kind === 'transaction' (so sync()
 * can decide whether to fetch the deferred allocation suggestion), else
 * undefined.
 */
async function replayItem(item: QueuedItem): Promise<Transaction | undefined> {
  switch (item.kind) {
    case "transaction": {
      const body = { ...item.payload, idempotency_key: item.id };
      return apiMutate<Transaction>("/api/transactions", "POST", body);
    }
    case "goal_create": {
      const body = { ...item.payload, idempotency_key: item.id };
      await apiMutate<Goal>("/api/goals", "POST", body);
      return undefined;
    }
    case "goal_update": {
      const body = { ...item.payload, idempotency_key: item.id };
      await apiMutate<GoalDetailResponse>(`/api/goals/${item.goalId}`, "PUT", body);
      return undefined;
    }
    case "allocation_confirm": {
      const body = { ...item.payload, idempotency_key: item.id };
      await apiMutate<AllocationConfirmResponse>("/api/allocations", "POST", body);
      return undefined;
    }
    case "allocation_skip": {
      await apiMutate<AllocationSkipResponse>(
        `/api/allocations/${item.transactionId}/skip`,
        "POST",
        null
      );
      return undefined;
    }
  }
}

/**
 * Drains the offline queue sequentially (insertion order, via the
 * by-createdAt index). Never Promise.all — a queued allocation_confirm
 * referencing a queued-but-not-yet-synced goal must never race ahead of
 * that goal's own sync (Pitfall 3).
 *
 * A failing item's attempts counter increments and it stays queued; the
 * loop always continues to the next item (one bad item never blocks the
 * rest). onProgress reports 'syncing' while draining and 'synced' once the
 * loop completes (even if some items failed and remain queued for the next
 * 'online' event/app restart).
 */
export async function sync(
  onProgress?: (status: SyncStatus) => void,
  onAllocationSuggestion?: AllocationSuggestionHandler
): Promise<void> {
  const db = await getDB();
  const items = await db.getAllFromIndex("queue", "by-createdAt");
  if (items.length === 0) return;

  onProgress?.("syncing");

  for (const item of items) {
    try {
      const result = await replayItem(item);
      await db.delete("queue", item.id);

      // D-02: deferred allocation-suggestion fetch — only here, only for a
      // synced transaction whose response says a suggestion is available,
      // never at enqueue time.
      if (item.kind === "transaction" && result?.allocation_suggestion_available) {
        try {
          const suggestion = await apiFetch<AllocationSuggestionResponse>(
            `/api/transactions/${result.id_transaksi}/allocation-suggestion`
          );
          onAllocationSuggestion?.(result.id_transaksi, suggestion);
        } catch {
          // Suggestion fetch failure after a successful sync is non-fatal —
          // the transaction itself is safely persisted; the user can still
          // find it later via the Pending allocations page.
        }
      }
    } catch {
      const updated = { ...item, attempts: item.attempts + 1 };
      await db.put("queue", updated);
      // Do not throw — one bad item must never block the rest of the queue.
    }
  }

  onProgress?.("synced");
}
