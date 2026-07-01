---
phase: 01-foundation
plan: A
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/next.config.ts
  - apps/native/src-tauri/tauri.conf.json
  - apps/native/src-tauri/Cargo.toml
  - apps/native/src-tauri/src/lib.rs
  - apps/native/src-tauri/src/main.rs
  - apps/native/package.json
autonomous: false
requirements:
  - AUTH-02
user_setup:
  - service: android-ndk
    why: "Required for tauri android build to produce an APK"
    env_vars:
      - name: ANDROID_HOME
        source: "Android Studio -> SDK Manager -> Android SDK location (e.g., C:/Users/{user}/AppData/Local/Android/Sdk on Windows)"
      - name: JAVA_HOME
        source: "JDK 17 installation directory (install via Android Studio or standalone JDK 17 package)"
    dashboard_config:
      - task: "Install Android Studio and NDK r27+ via SDK Manager"
        location: "Android Studio -> SDK Manager -> SDK Tools -> NDK (Side by side)"
      - task: "Accept all Android SDK licenses"
        location: "Run: yes | sdkmanager --licenses (or via Android Studio)"
  - service: uptimerobot
    why: "Keep Render.com free tier backend warm; 30-60s cold start kills demo"
    dashboard_config:
      - task: "Create HTTP monitor for https://macost-api.onrender.com/ with 5-minute interval"
        location: "https://uptimerobot.com -> Add New Monitor -> HTTP(s)"

must_haves:
  truths:
    - npm run build from apps/web/ exits 0 and produces apps/web/out/ with static HTML (no _next/server/ directory)
    - apps/native/src-tauri/tauri.conf.json build.frontendDist points to ../out
    - tauri-plugin-store is declared in apps/native/src-tauri/Cargo.toml and registered as a plugin in lib.rs
    - Tauri CSP allows connect-src to https://macost-api.onrender.com and https://*.supabase.co
    - tauri android build produces an APK (verified by Hidayat running the command)
  artifacts:
    - apps/web/next.config.ts with output='export', images.unoptimized=true, trailingSlash=true
    - apps/native/src-tauri/tauri.conf.json with productName, identifier, build, app.security.csp, and bundle.android sections
    - apps/native/src-tauri/Cargo.toml with tauri-plugin-store = "2" in [dependencies]
    - apps/native/src-tauri/src/lib.rs with tauri_plugin_store::Builder::default().build() registered
  key_links:
    - next.config.ts output='export' -> tauri.conf.json build.frontendDist='../out' (broken link = blank APK screen; this is the most common failure mode)
    - tauri-plugin-store Rust crate (Cargo.toml) must match @tauri-apps/plugin-store npm package (apps/web/package.json) — both must be present for the session adapter in Track D to work
---

<objective>
Configure Next.js for Tauri static export and scaffold the Tauri 2.0 Android wrapper with tauri-plugin-store for persistent session storage.

Purpose: The Tauri APK cannot load any content without `output: 'export'` in next.config.ts — this is a Day 1 blocker. The apps/native/ scaffold must exist before any APK builds or integration tests can run. session persistence via tauri-plugin-store is required before auth works on Android (localStorage is cleared on WebView restart).

Output: apps/web/out/ builds successfully from next build; apps/native/ Tauri 2.0 project scaffolded with tauri-plugin-store; Android NDK verified and first test APK build confirmed by Hidayat.

Owner: Hidayat — branch native/foundation
</objective>

<execution_context>
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/workflows/execute-plan.md
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/research/STACK.md
@.planning/research/PITFALLS.md
@API_CONTRACT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Configure Next.js static export for Tauri</name>
  <files>apps/web/next.config.ts</files>

  <read_first>
    apps/web/next.config.ts — current config is 7 lines with empty NextConfig object; modify in place, do not recreate
    apps/web/AGENTS.md — CRITICAL: this is Next.js 16 with potential breaking changes; read the note before touching any Next.js file
    .planning/research/STACK.md — section "Critical Configuration Steps #1" for the exact next.config.ts template with rationale
    .planning/research/PITFALLS.md — Pitfall 1 (blank APK screen) and Pitfall 2 (Server Actions incompatible with static export)
  </read_first>

  <action>
    Open apps/web/next.config.ts and set three properties on the NextConfig object:

    Set output to the string 'export'. This switches next build from generating server files in .next/ to generating static HTML/CSS/JS in apps/web/out/. Without this property the APK will show a blank screen because Tauri's WebView reads from a file directory, not a Node server.

    Set images.unoptimized to true. The default Next.js image optimizer requires a running Node server and is incompatible with static export. Without this flag any page using next/image will fail to build.

    Set trailingSlash to true. This causes Next.js to generate wallets/index.html instead of wallets.html, which is required for file-system serving inside the Tauri WebView (Tauri resolves paths as directories, not files).

    IMPORTANT — do not add:
    - Any 'use server' directive anywhere in the project (server actions are incompatible with static export per Pitfall 2)
    - basePath or assetPrefix (not needed and can break Tauri asset loading)
    - output: 'standalone' (this is for Docker/serverless Node.js deployment, not Tauri)

    After editing, run npm run build from apps/web/ to confirm the change produces apps/web/out/ with an index.html at the root. If the build fails with a dynamic route error, check for any [id] folder segments and convert them to query-parameter pages (see Pitfall 3).
  </action>

  <verify>
    <automated>cd "C:/Users/hiday/WebstormProjects/Zephyra/macost/apps/web" && npm run build && test -f out/index.html && echo "PASS: static export OK" || echo "FAIL"</automated>
  </verify>

  <acceptance_criteria>
    npm run build exits 0; apps/web/out/ directory exists and contains index.html; there is no apps/web/out/_next/server/ subdirectory (which would indicate SSR output, not static).
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Scaffold Tauri 2.0 Android wrapper with tauri-plugin-store</name>
  <files>
    apps/native/src-tauri/tauri.conf.json,
    apps/native/src-tauri/Cargo.toml,
    apps/native/src-tauri/src/lib.rs,
    apps/native/src-tauri/src/main.rs,
    apps/native/package.json
  </files>

  <read_first>
    .planning/research/STACK.md — section "Critical Configuration Steps #2" for tauri.conf.json template; section "#3" for Android HTTP cleartext issue and network_security_config.xml; section "Development Tools" for CLI install command
    .planning/research/PITFALLS.md — Pitfall 4 (scaffold urgency and scaffold command); Pitfall 5 (session persistence and tauri-plugin-store)
    API_CONTRACT.md — base URL lines: http://localhost:8000 (dev) and https://macost-api.onrender.com (prod); these must be in the Tauri CSP connect-src
  </read_first>

  <action>
    Initialize the Tauri 2.0 project in apps/native/. From the repo root, run: npm create tauri-app@latest -- --name macost --identifier com.zephyra.macost --template vanilla-ts --manager npm --output apps/native. If that command is unavailable for Tauri 2.0, alternatively run: cd apps/native && npx @tauri-apps/cli@^2 init --app-name macost --identifier com.zephyra.macost --window-title "Macost".

    After scaffold, configure tauri.conf.json (located at apps/native/src-tauri/tauri.conf.json) with these specific values:

    In the build section: set frontendDist to "../out" (pointing at the static export output from Task 1); set devUrl to "http://localhost:3000" (Next.js dev server); set beforeBuildCommand to "cd ../web && npm run build".

    In app.security.csp: set a Content-Security-Policy that includes default-src 'self' ipc: asset:; connect-src ipc: asset: https://macost-api.onrender.com https://*.supabase.co http://localhost:8000; style-src 'self' 'unsafe-inline'; img-src 'self' data: asset: blob:. Do NOT include unsafe-eval.

    In bundle.android: set minSdkVersion to 24 (Android 7.0+, widely supported).

    Set the productName to "Macost" and version to "0.1.0".

    Add tauri-plugin-store to Cargo.toml under [dependencies] with version "2". This is the Rust side of the session persistence plugin.

    In src/lib.rs (the Tauri app builder function), chain .plugin(tauri_plugin_store::Builder::default().build()) onto the Tauri app builder before calling .run(). Import it at the top of the file with use tauri_plugin_store.

    Android HTTP cleartext (important for dev): After running tauri android init, navigate to the generated Android project at apps/native/src-tauri/gen/android/app/src/main/. Create res/xml/network_security_config.xml that permits cleartext for localhost and 10.0.2.2 (emulator alias). Reference it in AndroidManifest.xml via android:networkSecurityConfig="@xml/network_security_config". This allows http://localhost:8000 calls during local dev without HTTPS. For the production demo, all calls go to https://macost-api.onrender.com (HTTPS), so this only affects local dev.

    In apps/native/package.json (or apps/web/package.json depending on scaffold location), add @tauri-apps/plugin-store to dependencies. This is the JavaScript side of the plugin that Track D (Zarra) will import in lib/auth/session.ts.

    Install Rust targets for Android by running: rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android.

    After all configuration, run cargo check from apps/native/src-tauri/ to verify the Rust build compiles without errors.
  </action>

  <verify>
    <automated>cd "C:/Users/hiday/WebstormProjects/Zephyra/macost/apps/native/src-tauri" && cargo check 2>&1 | tail -5</automated>
  </verify>

  <acceptance_criteria>
    cargo check exits 0 from apps/native/src-tauri/; apps/native/src-tauri/Cargo.toml contains tauri-plugin-store; apps/native/src-tauri/tauri.conf.json has build.frontendDist set to "../out"; apps/native/src-tauri/src/lib.rs registers the plugin; @tauri-apps/plugin-store appears in a package.json under apps/.
  </acceptance_criteria>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Verify Android NDK toolchain and produce first test APK</name>

  <read_first>
    .planning/research/PITFALLS.md — Pitfall 10 (Render cold start; UptimeRobot setup)
    apps/native/src-tauri/tauri.conf.json — confirm frontendDist is ../out before building
  </read_first>

  <what-built>
    Tasks 1 and 2 have configured next.config.ts for static export and scaffolded the Tauri 2.0 Android wrapper with tauri-plugin-store. The Next.js static build produces apps/web/out/. All Tauri Rust config compiles.
  </what-built>

  <how-to-verify>
    1. Confirm ANDROID_HOME and JAVA_HOME are set to valid Android Studio SDK and JDK 17 paths.
    2. From apps/native/, run: npx @tauri-apps/cli@^2 android init. This generates the Android project under apps/native/src-tauri/gen/android/.
    3. Build the APK: npx @tauri-apps/cli@^2 android build. This will take several minutes on first run (Rust compilation + Android toolchain). Expected output: an .apk file under apps/native/src-tauri/gen/android/app/build/outputs/apk/universal/release/ or similar.
    4. Install the APK on an Android device or emulator: adb install path/to/macost.apk. The app should launch and display the Next.js root page (even if it's a blank scaffold — the important check is that it does NOT show a blank white screen with no content).
    5. Log in to UptimeRobot (https://uptimerobot.com), create a new HTTP(s) monitor for https://macost-api.onrender.com/ with check interval 5 minutes. The backend must be deployed first (Track B), but set this up now to avoid forgetting before Phase 2.
  </how-to-verify>

  <resume-signal>
    Type "approved" with the APK path and confirm UptimeRobot monitor was created. If the APK build failed, paste the error message for diagnosis.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Device storage → Tauri WebView | Session token must survive Android process restarts; localStorage is cleared under memory pressure |
| Tauri WebView → FastAPI backend | All HTTP calls from the WebView cross the network; CSP and CORS enforce allowed origins |
| npm install → runtime code | @tauri-apps/plugin-store and @tauri-apps/cli are third-party npm packages loaded into the build |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-A-01 | Information Disclosure | Session token in localStorage (Tauri WebView) | high | mitigate | Use tauri-plugin-store for native persistent storage instead of localStorage; localStorage is cleared on WebView restart per Pitfall 5 |
| T-01-A-02 | Tampering | CSP too permissive (unsafe-eval or wildcard) | medium | mitigate | CSP in tauri.conf.json restricts connect-src to macost-api.onrender.com and *.supabase.co only; no unsafe-eval; no wildcard |
| T-01-A-03 | Denial of Service | Render.com free-tier cold start (30-60s) kills demo | medium | mitigate | UptimeRobot HTTP monitor every 5 minutes keeps the backend warm; manual warm-up 2 minutes before demo |
| T-01-A-SC | Tampering | @tauri-apps/plugin-store and @tauri-apps/cli supply chain | high | mitigate | Packages are from the official @tauri-apps organization on npm (npmjs.com/org/tauri-apps); verify publisher matches tauri-apps before install; pin to @^2 major version |
</threat_model>

<verification>
Overall phase checks for Track A:

1. apps/web/out/index.html exists after npm run build (static export confirmed)
2. apps/native/src-tauri/Cargo.toml contains tauri-plugin-store = "2"
3. apps/native/src-tauri/src/lib.rs contains tauri_plugin_store in the plugin chain
4. apps/native/src-tauri/tauri.conf.json build.frontendDist is "../out"
5. APK file exists in apps/native/src-tauri/gen/android/app/build/outputs/
6. UptimeRobot monitor created for https://macost-api.onrender.com/
</verification>

<success_criteria>
- npm run build from apps/web/ exits 0 and produces a complete out/ directory
- cargo check from apps/native/src-tauri/ exits 0
- tauri android build produces an .apk file (first build may take 15+ minutes)
- Installing and launching the APK on an Android device shows the Next.js page, not a blank screen
- UptimeRobot monitor is active and pinging the Render backend every 5 minutes
- AUTH-02 (session persistence via tauri-plugin-store) is structurally satisfied: the plugin is installed and registered; Track D will wire the actual session storage in session.ts
</success_criteria>

<output>
Create `.planning/phases/01-foundation/01-A-SUMMARY.md` when done
</output>
