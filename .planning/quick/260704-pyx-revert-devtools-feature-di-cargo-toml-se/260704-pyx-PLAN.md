---
phase: quick-260704-pyx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/native/src-tauri/Cargo.toml
autonomous: true
requirements: []
must_haves:
  truths:
    - "apps/native/src-tauri/Cargo.toml no longer enables the devtools Cargo feature for the tauri dependency"
    - "Release desktop builds no longer bundle Tauri's DevTools panel"
  artifacts:
    - apps/native/src-tauri/Cargo.toml
  key_links: []
---

<objective>
Revert the temporary `devtools` Cargo feature that was enabled on the `tauri` dependency in `apps/native/src-tauri/Cargo.toml` during quick task 260704-o31, now that the underlying login-connection bug (CORS origin mismatch, fixed in 260704-ogx) and the session-persistence bug (fixed in 260704-pju) have both been root-caused, fixed, and confirmed working end-to-end by the user.

Purpose: `devtools` was only ever meant to be temporary, to let DevTools open in a release build for debugging. It should not ship long-term in release builds — leaving it enabled increases release binary size and exposes a debug surface unintentionally.

Output: `apps/native/src-tauri/Cargo.toml` with the `tauri` dependency's `features` list restored to empty (`[]`), matching its pre-debugging state. No other dependency lines change.
</objective>

<execution_context>
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/workflows/execute-plan.md
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Revert devtools feature flag in Cargo.toml</name>
  <files>apps/native/src-tauri/Cargo.toml</files>
  <action>
    In apps/native/src-tauri/Cargo.toml, change the `tauri` dependency line under `[dependencies]` from `tauri = { version = "2", features = ["devtools"] }` back to `tauri = { version = "2", features = [] }`. This is the sole change — do not modify `tauri-build`, `tauri-plugin-store`, `serde`, `serde_json`, or any other line in the file. The devtools feature was a temporary debugging aid added in quick task 260704-o31; the underlying bugs it was used to diagnose (CORS origin mismatch and session-persistence redirect) are both now fixed and user-confirmed working, so it is safe to revert.
  </action>
  <verify>
    <automated>grep -c 'devtools' apps/native/src-tauri/Cargo.toml | grep -qx 0 && echo PASS || echo FAIL</automated>
  </verify>
  <done>apps/native/src-tauri/Cargo.toml contains `tauri = { version = "2", features = [] }` and the string "devtools" no longer appears anywhere in the file.</done>
</task>

</tasks>

<verification>
Run `grep -n 'tauri = ' apps/native/src-tauri/Cargo.toml` and confirm the `tauri` dependency line reads `tauri = { version = "2", features = [] }` with no `devtools` feature present, and that no other dependency line was altered (diff should be a single-line change).
</verification>

<success_criteria>
- `apps/native/src-tauri/Cargo.toml` `tauri` dependency has `features = []`
- No other line in the file was modified
- Next release/debug Tauri desktop build will no longer include the DevTools feature
</success_criteria>

<output>
Create `.planning/quick/260704-pyx-revert-devtools-feature-di-cargo-toml-se/260704-pyx-SUMMARY.md` when done
</output>
