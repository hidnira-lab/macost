/**
 * Offline write-queue item types (OFF-01).
 *
 * A discriminated union so a single IndexedDB `queue` object store (see
 * db.ts) can hold all 3 offline-queueable write kinds (04-CONTEXT.md D-01
 * broadened scope: transaction, goal create/edit, allocation confirm/skip)
 * and be drained by one shared sync loop (queue.ts) without per-kind
 * object stores.
 *
 * Reuses existing request-body types from @/lib/api/types — do NOT
 * redefine new payload shapes here (04-PATTERNS.md).
 */
import type {
  TransactionCreateRequest,
  GoalCreateRequest,
  GoalUpdateRequest,
  AllocationConfirmRequest,
} from "@/lib/api/types";

interface QueuedItemBase {
  /** Client-generated UUID — also doubles as the idempotency_key on replay (D-03) */
  id: string;
  createdAt: string;
  attempts: number;
}

type NewTransactionItem = { kind: "transaction"; payload: TransactionCreateRequest };
type NewGoalCreateItem = { kind: "goal_create"; payload: GoalCreateRequest };
type NewGoalUpdateItem = { kind: "goal_update"; goalId: string; payload: GoalUpdateRequest };
type NewAllocationConfirmItem = { kind: "allocation_confirm"; payload: AllocationConfirmRequest };
type NewAllocationSkipItem = { kind: "allocation_skip"; transactionId: string };

/** Input shape for enqueue() — caller supplies everything except the base fields. */
export type NewQueuedItem =
  | NewTransactionItem
  | NewGoalCreateItem
  | NewGoalUpdateItem
  | NewAllocationConfirmItem
  | NewAllocationSkipItem;

export type QueuedItem =
  | (QueuedItemBase & NewTransactionItem)
  | (QueuedItemBase & NewGoalCreateItem)
  | (QueuedItemBase & NewGoalUpdateItem)
  | (QueuedItemBase & NewAllocationConfirmItem)
  | (QueuedItemBase & NewAllocationSkipItem);

/** Sync status derived client-side from navigator.onLine + queue length (OFF-02). */
export type SyncStatus = "offline" | "syncing" | "synced";
