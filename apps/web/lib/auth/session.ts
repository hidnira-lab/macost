/**
 * Session token persistence layer.
 *
 * Runtime detection:
 *   - Tauri Android (window.__TAURI__ present): uses @tauri-apps/plugin-store
 *     via LazyStore so the token survives WebView restarts on Android.
 *   - Browser / Next.js dev server: falls back to localStorage.
 *
 * All three exports are async and safe to call during SSR
 * (typeof window guard returns null before touching any browser API).
 *
 * NOTE: Store is imported dynamically inside getStore() to avoid SSR errors
 * during `next build` — static export builds run in Node.js where neither
 * window nor the Tauri IPC bridge is available.
 */

import type { LazyStore } from '@tauri-apps/plugin-store'

let tauriStore: LazyStore | null = null

/**
 * Returns a LazyStore instance if running inside Tauri, null otherwise.
 * Uses a module-level singleton so the store file is opened only once.
 */
async function getStore(): Promise<LazyStore | null> {
  if (typeof window === 'undefined') return null
  if (!('__TAURI__' in window)) return null
  const { LazyStore } = await import('@tauri-apps/plugin-store')
  if (!tauriStore) tauriStore = new LazyStore('.session.dat')
  return tauriStore
}

/**
 * Read the stored JWT access token.
 * Returns null if no token has been stored yet.
 */
export async function getToken(): Promise<string | null> {
  const s = await getStore()
  if (s) return (await s.get<string>('access_token')) ?? null
  return localStorage.getItem('access_token')
}

/**
 * Persist the JWT access token after a successful login or register.
 */
export async function setToken(token: string): Promise<void> {
  const s = await getStore()
  if (s) {
    await s.set('access_token', token)
    await s.save()
    return
  }
  localStorage.setItem('access_token', token)
}

/**
 * Remove the stored JWT access token (logout).
 */
export async function clearToken(): Promise<void> {
  const s = await getStore()
  if (s) {
    await s.delete('access_token')
    await s.save()
    return
  }
  localStorage.removeItem('access_token')
}
