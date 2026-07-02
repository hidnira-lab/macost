// Tauri app entry point for Macost Android/desktop wrapper.
// tauri-plugin-store provides persistent native key-value storage,
// used by the Supabase session adapter in apps/web/lib/auth/session.ts
// to survive Android WebView restarts (localStorage is unreliable on Tauri Android).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
