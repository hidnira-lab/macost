---
phase: quick-260704-oux
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/native/src-tauri/capabilities/default.json
  - apps/native/src-tauri/gen/schemas/capabilities.json
autonomous: false
requirements: [AUTH-02]
must_haves:
  truths:
    - "The Tauri desktop app's main window is explicitly granted core:default and store:default permissions, so tauri-plugin-store's get/set/save/delete/load IPC commands are no longer silently rejected"
    - "apps/web/lib/auth/session.ts's getToken()/setToken()/clearToken() (which call the store plugin) actually persist the JWT to .session.dat on disk instead of silently no-oping"
    - "Cargo's build-time ACL resolver (invoked via cargo check through build.rs -> tauri_build::build()) accepts core:default and store:default as valid identifiers for this project's installed plugins, with zero unknown-permission errors"
    - "A logged-in user who fully closes and reopens the Tauri desktop app remains logged in, without being sent back to the login screen"
  artifacts:
    - apps/native/src-tauri/capabilities/default.json
  key_links:
    - "capabilities/default.json windows: [\"main\"] -> tauri.conf.json app.windows[0] (unlabeled entry, defaults to Tauri v2's implicit label \"main\") -- the capability's window target must match the actual window label or the grant silently applies to nothing"
    - "capabilities/default.json permissions: [\"core:default\", \"store:default\"] -> confirmed as exact valid const identifiers in gen/schemas/desktop-schema.json (line 182 for core:default, line 2198 for store:default, which bundles allow-load/allow-get/allow-set/allow-save/allow-delete among others) -- these are the operations apps/web/lib/auth/session.ts's getStore()/getToken()/setToken()/clearToken() invoke via @tauri-apps/plugin-store's LazyStore"
---

<objective>
Fix Tauri desktop session persistence by creating the missing `capabilities/` directory and a capability file that grants the main window permission to use `tauri-plugin-store`'s IPC commands.

Purpose: `apps/native/src-tauri/` currently has NO `capabilities/` directory at all. In Tauri v2, a plugin's IPC commands (here, `tauri-plugin-store`'s get/set/save/delete/load, invoked from `apps/web/lib/auth/session.ts`'s `getToken()`/`setToken()`/`clearToken()`) require an explicit permission grant via a capability file targeting the app's window(s) -- without one, these calls are silently rejected by Tauri's IPC layer. This was independently confirmed: no `.session.dat` file (the LazyStore's backing file) exists anywhere on the test machine's filesystem despite a successful login, meaning `store.set()`/`store.save()` never actually persisted anything to disk. Root cause: zero capabilities configured project-wide, so neither the store plugin's commands nor baseline core window/app commands have ever been explicitly granted.

Output: `apps/native/src-tauri/capabilities/default.json` granting `core:default` (baseline window/app/webview permissions, previously entirely unset) and `store:default` (the store plugin's full command set) to the window labeled `"main"`. No other existing file is modified.
</objective>

<execution_context>
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/workflows/execute-plan.md
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Relevant STATE.md excerpts already absorbed into this plan:
- Decision `[Pre-phase]`: "tauri-plugin-store for Supabase session persistence -- localStorage is unreliable in Tauri Android WebView"
- ROADMAP.md Phase 1 success criterion #1: "User can register a new account with name, email, and password; the session persists across Tauri desktop app restarts without re-login"
- REQUIREMENTS.md `AUTH-02`: "User dapat login dengan email dan password; sesi persisten di Tauri Android (via tauri-plugin-store, bukan localStorage)" -- same mechanism applies to desktop, which is the current MVP target per the 2026-07-02/07-04 scope decisions.

Current file states (read prior to planning):

`apps/native/src-tauri/tauri.conf.json` `app.windows[0]` has no `"label"` field:
```
"windows": [
  { "title": "Macost", "width": 400, "height": 800, "resizable": true, "visible": true }
]
```
Tauri v2 defaults an unlabeled window to the label `"main"` -- this is the window the new capability file must target.

`apps/native/src-tauri/Cargo.toml` confirms `tauri-plugin-store = "2"` is a dependency, and `apps/native/src-tauri/src/lib.rs` confirms it is registered: `.plugin(tauri_plugin_store::Builder::default().build())`.

`apps/native/src-tauri/` currently has NO `capabilities/` directory (confirmed via directory listing). `apps/native/src-tauri/gen/schemas/capabilities.json` (a tracked, auto-generated cache file) currently contains only `{}`, confirming zero capabilities are resolved project-wide.

`apps/native/src-tauri/gen/schemas/desktop-schema.json` (tracked, auto-generated) was read and confirms the exact valid permission identifiers for this project's installed plugins:
- Line 182: `"const": "core:default"` -- "Default core plugins set" bundling `core:path:default`, `core:event:default`, `core:window:default`, `core:webview:default`, `core:app:default`, `core:image:default`, `core:resources:default`, `core:menu:default`, `core:tray:default`.
- Line 2198: `"const": "store:default"` -- "This permission set configures what kind of operations are available from the store plugin. All operations are enabled by default", bundling `allow-load`, `allow-get-store`, `allow-set`, `allow-get`, `allow-has`, `allow-delete`, `allow-clear`, `allow-reset`, `allow-keys`, `allow-values`, `allow-entries`, `allow-length`, `allow-reload`, `allow-save`.

`apps/web/lib/auth/session.ts` calls exactly `s.get()`, `s.set()`, `s.save()`, `s.delete()` on the `LazyStore` -- all covered by `store:default`.

The `Capability` schema (desktop-schema.json lines 39-105) requires `identifier` and `permissions`; `windows` is an optional array of window labels/glob patterns. No `app.security.capabilities` allowlist currently exists in `tauri.conf.json`, so Tauri's default behavior applies: every capability file placed in `src-tauri/capabilities/` is automatically discovered and applied per its own `windows` field -- no edit to `tauri.conf.json` is needed or permitted for this fix.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create the missing capabilities file granting store + core permissions to the main window</name>
  <files>apps/native/src-tauri/capabilities/default.json, apps/native/src-tauri/gen/schemas/capabilities.json</files>
  <action>
Create the directory `apps/native/src-tauri/capabilities/` (it does not exist yet) and write a new file `apps/native/src-tauri/capabilities/default.json` with this exact structure: a JSON object with `"$schema": "../gen/schemas/desktop-schema.json"` (editor tooling pointer, standard Tauri convention, ignored by the deserializer), `"identifier": "main-capability"`, a `"description"` string explaining that this capability grants the main window baseline core permissions plus full store-plugin access so the Supabase JWT session survives app restarts, `"windows": ["main"]` (targeting the unlabeled window in `tauri.conf.json`'s `app.windows[0]`, which Tauri v2 defaults to label `"main"`), and `"permissions": ["core:default", "store:default"]` -- using exactly these two identifier strings, confirmed present as `const` values in `gen/schemas/desktop-schema.json` at lines 182 and 2198 respectively. Do not invent or guess alternate spellings (e.g. do not use `store:allow-default` or `tauri-plugin-store:default` -- the confirmed identifier is `store:default`).

Do not modify `apps/native/src-tauri/tauri.conf.json`, `apps/native/src-tauri/Cargo.toml`, `apps/native/src-tauri/src/lib.rs`, or `apps/web/lib/auth/session.ts` -- this task only adds the one new capability file. Do not manually edit `apps/native/src-tauri/gen/schemas/capabilities.json` -- it is a generated cache file that Tauri's build script (`apps/native/src-tauri/build.rs` calling `tauri_build::build()`) automatically regenerates from the contents of `capabilities/` the next time cargo compiles the crate; running the verification command below will cause it to update from `{}` to reflect the new capability, and that resulting diff is expected and correct, not something to revert.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const c=JSON.parse(fs.readFileSync('D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/apps/native/src-tauri/capabilities/default.json','utf8')); if(!c.identifier) throw new Error('missing identifier'); const okWin=Array.isArray(c.windows)&&c.windows.includes('main'); if(!okWin) throw new Error('windows must include main'); const okPerm=Array.isArray(c.permissions)&&c.permissions.includes('core:default')&&c.permissions.includes('store:default'); if(!okPerm) throw new Error('permissions must include core:default and store:default'); console.log('PASS: capability JSON shape valid');" && cargo check --manifest-path "D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/apps/native/src-tauri/Cargo.toml" 2>&1 | tail -30</automated>
  </verify>
  <done>`apps/native/src-tauri/capabilities/default.json` exists with `identifier`, `windows: ["main"]`, and `permissions` containing both `core:default` and `store:default`; `cargo check` completes without any unknown-permission or ACL-resolution error, confirming Tauri's build-time validator accepts these exact identifiers for the project's installed plugins.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Verify session survives a full Tauri desktop app restart</name>
  <what-built>Added `apps/native/src-tauri/capabilities/default.json`, granting the main window `core:default` (baseline window/app/webview permissions) and `store:default` (all tauri-plugin-store operations, including the get/set/save/delete/load calls `apps/web/lib/auth/session.ts` uses) -- previously zero capabilities existed project-wide, so these IPC commands were silently rejected and `.session.dat` was never written.</what-built>
  <how-to-verify>
    1. From `apps/native/`, run `npm run tauri dev` to launch the Tauri desktop app in dev mode (or run the equivalent packaged build if you prefer, e.g. `npm run tauri build` then launch the produced `.exe`).
    2. Log in with a valid test account (e.g. the account used in prior UAT).
    3. Confirm a `.session.dat` file now appears in the app's local data directory (search your machine for a file named `.session.dat` under the Tauri app data path for identifier `com.zephyra.macost` -- e.g. on Windows this is typically under `%APPDATA%\com.zephyra.macost\`). This file did not exist before this fix despite successful logins.
    4. Fully close the app (quit the process entirely, not just minimize the window).
    5. Relaunch the app the same way as step 1.
    6. Confirm the app loads directly to the logged-in dashboard/home screen, WITHOUT showing the login screen again.
  </how-to-verify>
  <resume-signal>Type "approved" if `.session.dat` exists and the app skips re-login after a full restart, or describe exactly what you observed (e.g. still shows login screen, or no `.session.dat` file found) if it does not.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Tauri webview (main window) -> Tauri core via IPC | The capability file is the sole gate controlling which core/plugin commands the main window's JS (the bundled Next.js static export) may invoke over IPC |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick260704oux-01 | Elevation of Privilege | `capabilities/default.json` permissions: `store:default` | medium | accept | `store:default` grants all 14 store operations (including `allow-clear`/`allow-reset`, unused by `session.ts`) rather than the 5 operations actually called (`allow-get`, `allow-set`, `allow-save`, `allow-delete`, `allow-load`). Accepted because the window's CSP (`tauri.conf.json` `app.security.csp`) already restricts which origins the webview can load/fetch from (self + Railway backend + Supabase + localhost dev), making injection of arbitrary script into this window unlikely; task description explicitly directs using the plugin's `<plugin>:default` set rather than a hand-picked subset, matching the minimal-fix scope. A future hardening pass could narrow this to the 5 specific `allow-*` permissions if desired. |
| T-quick260704oux-02 | Information Disclosure | `.session.dat` (LazyStore-backed file on disk) | low | accept | The JWT is stored in plaintext on disk by `tauri-plugin-store` (pre-existing design from `[Pre-phase]` decision, not introduced by this fix); anyone with local filesystem access to the logged-in user's machine could read the token. Out of scope for this capability-grant fix; would require a separate encryption-at-rest decision if addressed. |
</threat_model>

<verification>
1. Run Task 1's automated verify command -- confirms the capability JSON has the correct shape (`identifier`, `windows: ["main"]`, `permissions` including `core:default` and `store:default`) and that `cargo check` accepts these identifiers with no ACL-resolution errors.
2. Complete the Task 2 human-verify checkpoint -- confirms the actual runtime behavior: `.session.dat` is written to disk on login, and the Tauri desktop app remains logged in across a full app restart.
</verification>

<success_criteria>
- `apps/native/src-tauri/capabilities/default.json` exists, granting `core:default` and `store:default` to the `"main"` window.
- `cargo check` on the `src-tauri` crate completes without unknown-permission or ACL errors.
- A logged-in Tauri desktop session survives a full app close/reopen without requiring re-login, and `.session.dat` is confirmed present on disk.
- No other existing file (`tauri.conf.json`, `Cargo.toml`, `src/lib.rs`, `session.ts`) was modified.
</success_criteria>

<output>
Create `.planning/quick/260704-oux-fix-tauri-session-persistence-tambah-cap/260704-oux-SUMMARY.md` when done
</output>
