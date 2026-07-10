# Plan 03-03 Summary: Quick Access Panel (QAP-01)

**Status:** ✅ Complete  
**Date:** 2026-07-09  
**Owner:** Zarra (Cline)

---

## Files Modified

### 1. `apps/web/components/QuickAccessPanel.tsx` (CREATED → MODIFIED)

**What:** Vertical-stack panel with 3 shortcut cards and a "Quick Access" heading.

**Layout change:** Originally a 2×2 grid with 4 shortcuts. Redesigned as a vertical `flex-col` list with 3 shortcuts — the top-goal tile moved into the right column of Home alongside "Goal Aktif".

**Removed:** `Goal` type import and `goals` prop — the top-goal tile moved into `home/page.tsx`.

**3 shortcuts (vertical layout, horizontal card orientation):**
- **1. Tambah Transaksi:** Blue gradient, `Plus` icon, `router.push('/transactions')`.
- **2. Scan Struk:** White card, `ScanLine` icon, `router.push('/transactions/scan')`.
- **3. Sisa Anggaran:** White card, `Wallet` icon, `router.push('/dashboard')`, shows `remainingBudget` in Bricolage Grotesque hero-stat (`font-display text-[22px] font-extrabold`).

**Design tokens preserved:** Matches existing card shadows, border, spacing, icon colors, and typography.

---

### 2. `apps/web/app/home/page.tsx` (MODIFIED)

**Layout restructured to two columns:**

| Column | Contents |
|--------|----------|
| Left   | **Quick Access** — 3 shortcuts rendered by `<QuickAccessPanel remainingBudget={remainingBudget} />` |
| Right  | **Top Active Goal** (SAW rank-1 with card title) + **Goal Aktif** (horiz carousel, unchanged) + **Terbaru** (recent transactions, unchanged) |

**Key changes:**
1. **QuickAccessPanel** now only receives `remainingBudget` (no `goals` prop).
2. **Removed standalone "Sisa Anggaran" section** — no duplication, the balance is shown inside Quick Access via the Sisa Anggaran card.
3. **Added Top Active Goal section** in the right column with its own `<h2>` heading "Top Active Goal". Shows the SAW rank-1 goal's `nama_goal`, accent-orange progress bar and `progress_pct`. Empty state: "Belum ada goal" with "Buat goal sekarang" hint, navigates to `/goals/new`.
4. **Goal Aktif** and **Terbaru** sections are unchanged in logic — only repositioned below Top Active Goal in the right column.
5. **All business logic preserved** — same 4 API fetches, same state, same navigation, same FAB.

---

### 3. `apps/web/components/BottomNav.tsx` (BUG FIX)

**Bug:** The "Home" nav item's `href` was set to `'/dashboard'` instead of `'/home'`. Clicking "Home" from any page (Goals, AI Assistant, etc.) navigated to Dashboard instead of the Home page.

**Fix:** Changed `href: '/dashboard'` → `href: '/home'` for the Home nav item.

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Passed (exit code 0) |
| Exactly 3 shortcuts in Quick Access | ✅ Tambah Transaksi, Scan Struk, Sisa Anggaran |
| Sisa Anggaran shown only once (in QAP) | ✅ Standalone section removed |
| Top Active Goal in right column | ✅ With its own heading "Top Active Goal" |
| Goal Aktif in right column | ✅ Below Top Active Goal, unchanged |
| Terbaru in right column | ✅ Below Goal Aktif, unchanged |
| SAW rank-1 goal used | ✅ `goals.find(g => g.rank === 1)` |
| "Belum ada goal" empty state | ✅ On both Top Active Goal and Goal Aktif sections |
| Zero new API calls | ✅ No new fetches |
| FAB preserved | ✅ Unchanged |
| Bottom nav Home → /home (not /dashboard) | ✅ Fixed |
| All buttons/navigation work | ✅ All `router.push()` calls intact |