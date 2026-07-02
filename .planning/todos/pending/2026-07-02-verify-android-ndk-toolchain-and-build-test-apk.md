---
created: 2026-07-02T04:20:18.190Z
title: Verify Android NDK toolchain and build test APK
area: native
files:
  - .planning/phases/01-foundation/01-01-PLAN.md:165
  - apps/native/src-tauri/tauri.conf.json
resolves_phase: "01"
---

## Problem

Plan `01-01` (Tauri scaffold) has 3 tasks. Task 1 (Next.js static export) and Task 2
(Tauri 2.0 scaffold + tauri-plugin-store) are done and verified on disk:

- `apps/web/out/index.html` exists (static export works)
- `apps/native/src-tauri/Cargo.toml` has `tauri-plugin-store = "2"`
- `apps/native/src-tauri/src/lib.rs` registers the plugin
- `apps/native/src-tauri/tauri.conf.json` has `build.frontendDist: "../out"`
- `cargo check` passes from `apps/native/src-tauri/`

Task 3 (`type="checkpoint:human-verify"`, `gate="blocking"`) is NOT done:

- `ANDROID_HOME` is not set (JAVA_HOME is set correctly to JDK 17)
- `apps/native/src-tauri/gen/android/` only has a `schemas` stub — `android init` was never run
- No `.apk` file exists anywhere under `apps/native/`
- UptimeRobot monitor for the Render backend also not set up — but this sub-step is
  blocked separately: backend isn't deployed yet (Track B / Fertika), `API_CONTRACT.md`
  still marks the prod URL "(sesuaikan setelah deploy)", no `render.yaml`/`Procfile`

This blocks:
- Plan `01-01`'s own must_haves ("tauri android build produces an APK")
- ROADMAP Phase 1 success criterion #4 ("Running `tauri android build` produces an APK
  that launches to the auth screen without a blank screen")
- ROADMAP Phase 2, which formally `Depends on: Phase 1`

User (Hidayat) explicitly chose to defer this and continue other work rather than stop
to do the Android Studio/NDK setup right now (2026-07-02 GSD session).

## Solution

1. Install Android Studio + NDK r27+ via SDK Manager; accept licenses (`sdkmanager --licenses`)
2. Set `ANDROID_HOME` env var to the SDK location
3. From `apps/native/`: `npx @tauri-apps/cli@^2 android init`
4. `npx @tauri-apps/cli@^2 android build` → find `.apk` under `gen/android/app/build/outputs/apk/`
5. Install on device/emulator (`adb install ...`), confirm it's not a blank white screen
6. Separately, once Track B deploys the backend to Render: create the UptimeRobot HTTP
   monitor for `https://macost-api.onrender.com/` (5-min interval)
7. After both are done, write `01-01`'s SUMMARY.md and let phase verification re-run
