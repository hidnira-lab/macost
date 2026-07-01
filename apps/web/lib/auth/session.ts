/**
 * Session token accessor.
 *
 * Stub implementation — returns null until Track D merges the real Supabase
 * session persistence layer (tauri-plugin-store adapter).
 *
 * The real implementation will read the JWT access_token from the Supabase
 * client session and return it here. apiFetch in lib/api/client.ts calls
 * getToken() to attach the Authorization header on every protected request.
 */
export function getToken(): string | null {
  // TODO(Track D): replace with real session read from Supabase client
  // e.g. supabase.auth.getSession() result stored in tauri-plugin-store
  return null;
}
