/**
 * IndexedDB (via idb 8.0.3) lazy-singleton init for the offline write queue.
 *
 * Follows the same lazy client-only singleton convention already used by
 * @/lib/auth/session.ts's getStore() — getDB() must only ever be called from
 * inside a 'use client' component's useEffect/event handler or from queue.ts
 * functions invoked at runtime, NEVER at module top-level. `next build` with
 * `output: "export"` prerenders in Node, which has no `indexedDB` global
 * (04-RESEARCH.md Pitfall 1) — calling openDB() at import time would crash
 * the static export build.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { QueuedItem } from "./types";

interface MacostOfflineDB extends DBSchema {
  queue: {
    key: string;
    value: QueuedItem;
    indexes: { "by-createdAt": string };
  };
}

let dbPromise: Promise<IDBPDatabase<MacostOfflineDB>> | null = null;

/**
 * Returns the (lazily-opened) offline queue database.
 * Safe to call multiple times — only opens the DB connection once.
 */
export function getDB(): Promise<IDBPDatabase<MacostOfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MacostOfflineDB>("macost-offline", 1, {
      upgrade(db) {
        const store = db.createObjectStore("queue", { keyPath: "id" });
        store.createIndex("by-createdAt", "createdAt");
      },
    });
  }
  return dbPromise;
}
