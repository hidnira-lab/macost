---
created: 2026-07-02T04:20:18.190Z
updated: 2026-07-02T14:34:00.000Z
title: Fix blank white screen on Android APK (libmacost_lib.so never loads)
area: native
files:
  - .planning/phases/01-foundation/01-01-PLAN.md:165
  - apps/native/src-tauri/tauri.conf.json
  - apps/native/src-tauri/gen/android/app/build.gradle.kts
  - apps/native/src-tauri/Cargo.toml
resolves_phase: "01"
---

## Problem

Plan `01-01` (Tauri scaffold) has 3 tasks. Task 1 (Next.js static export) and Task 2
(Tauri 2.0 scaffold + tauri-plugin-store) are done and verified on disk:

- `apps/web/out/index.html` exists (static export works, now includes Neulis/Helvetica fonts)
- `apps/native/src-tauri/Cargo.toml` has `tauri-plugin-store = "2"`
- `apps/native/src-tauri/src/lib.rs` registers the plugin
- `apps/native/src-tauri/tauri.conf.json` has `build.frontendDist: "../../web/out"` (corrected
  from the plan's original `"../out"` — the real relative path from `src-tauri/` to `apps/web/out/`)
- `cargo check` passes from `apps/native/src-tauri/`

Task 3 (`type="checkpoint:human-verify"`, `gate="blocking"`) made progress but hit a **new,
deeper blocker** during the 2026-07-02 GSD session:

**Environment setup — DONE:**
- `ANDROID_HOME` and `JAVA_HOME` both set correctly
- Android Emulator + system images installed via `sdkmanager` (API 34 `google_apis;x86_64`
  AVD `macost_test`, and API 36 `google_apis;x86_64` AVD `macost_api36` — both boot fine)
- `apps/native/src-tauri/gen/android/` fully scaffolded (`tauri android init` succeeds)
- `tauri android build --target x86_64` succeeds cleanly, produces
  `gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`
- APK installs successfully via `adb install`, app launches (`MainActivity` becomes
  focused, process stays alive, **zero crashes/panics/ANRs in logcat**)

**Confirmed bug — blank white screen, root cause identified but NOT fixed:**

The rendered screen is pure white with **zero visible content** — not a CSS/asset-loading
issue, since `apps/web/out/index.html` (verified directly) contains real server-rendered
HTML/text. Diagnosis via `adb shell uiautomator dump`:

```
android:id/content (FrameLayout) — ZERO children, no WebView node anywhere in the tree
```

Cross-checked via `/proc/<pid>/maps` (through `adb shell run-as com.zephyra.macost`):
**`libmacost_lib.so` (the compiled Rust/Tauri native library, ~117MB unstripped debug
build, confirmed present inside the APK at `lib/x86_64/libmacost_lib.so`) is never loaded
into the running process.** No `UnsatisfiedLinkError`, no native crash, no tombstone —
the library load (and therefore the entire Tauri/wry WebView bootstrap, which lives
Rust-side) appears to silently never happen or never complete.

**Tested and ruled out (this exact empty-WebView symptom persists across all of these):**
1. Stale build — rebuilt `apps/web/out/` fresh + rebuilt the APK from scratch → same result
2. Corrupted/stale `gen/android/` — deleted entirely and regenerated via `tauri android init`
   from a clean state → same result
3. Android API level mismatch — project's `compileSdk`/`targetSdk` is 36; originally tested
   only on an API 34 emulator. Installed a matching API 36 `google_apis;x86_64` system image
   and AVD (`macost_api36`), retested → **same result**, so this is not an API-level mismatch
4. CSP/AndroidManifest/MainActivity.kt/lib.rs — all inspected, all look like standard Tauri
   2.x scaffolding, nothing obviously misconfigured

**Versions in play:** `@tauri-apps/cli` 2.11.4, `tauri` crate 2.11.5 (Cargo.lock), Gradle
8.14.3, AGP via `com.android.application` plugin, `androidx.webkit:webkit:1.14.0`,
NDK 27.0.12077973. WebView system component on the emulators is Chromium 113.0.5672.136
(valid, matches targetSdkVersion requirements).

This blocks:
- Plan `01-01`'s own must_haves ("tauri android build produces an APK" — technically true,
  but the APK doesn't render, so the practical intent of the check is unmet)
- ROADMAP Phase 1 success criterion #4 ("Running `tauri android build` produces an APK
  that launches to the auth screen without a blank screen")
- ROADMAP Phase 2, which formally `Depends on: Phase 1`
- UptimeRobot monitor for the Render backend also not set up — blocked separately:
  backend isn't deployed yet (Track B / Fertika), `API_CONTRACT.md` still marks the prod
  URL "(sesuaikan setelah deploy)", no `render.yaml`/`Procfile`

User (Hidayat) chose to stop deep native debugging via adb/logcat alone after exhausting
the productive automated diagnostic paths (2026-07-02 GSD session) — this needs either
Android Studio's attached debugger/Logcat (much better visibility into native library
loading than adb alone), or research into Tauri's GitHub issues for this specific
CLI/crate version combination on Android API 34-36.

## Solution

Next steps to try, roughly in order of expected signal-to-effort:

1. **Open the project in Android Studio** (`apps/native/src-tauri/gen/android/`), run on
   the emulator with the debugger attached — Android Studio's Logcat + native debugger
   has far better visibility into `System.loadLibrary` failures than `adb logcat` alone,
   and can show Java-level exceptions that might be getting swallowed.
2. **Check Tauri's GitHub issues** for "android blank screen" / "libmacost_lib.so not
   loaded" / similar against tauri 2.11.x — this may be a known regression with a documented
   workaround or fix version.
3. **Try pinning an older/different `tauri`/`tauri-cli` version** (e.g. 2.10.x or 2.9.x) to
   see if this is a regression introduced in 2.11.x.
4. **Try `tauri android dev`** (live dev loop with `next dev` running) instead of
   `android build` — this streams Rust stdout/stderr more directly and may surface an
   error `android build`'s one-shot flow doesn't.
5. Once the WebView actually renders (even the Next.js default scaffold page is enough
   to confirm the fix), reinstall, confirm visually, then:
   - Separately, once Track B deploys the backend to Render: create the UptimeRobot HTTP
     monitor for `https://macost-api.onrender.com/` (5-min interval)
   - Write `01-01`'s SUMMARY.md and let phase verification re-run

## Reusable environment (already set up, no need to redo)

- `ANDROID_HOME` / `JAVA_HOME` env vars: set correctly
- Emulators ready: `macost_test` (API 34 google_apis x86_64), `macost_api36` (API 36
  google_apis x86_64) — launch via `emulator -avd <name> -no-snapshot -no-boot-anim`
- `gen/android/` scaffolded and buildable end-to-end
