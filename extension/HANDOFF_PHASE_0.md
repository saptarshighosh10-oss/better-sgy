# Phase 0 Handoff — Better Schoology Chrome Extension

> **Date:** 2026-06-09
> **Status:** ✅ Phase 0 Complete

---

## Current Status

Phase 0 (Safety / Proof Spike) is **complete**. The WXT Chrome MV3 extension scaffold is fully built, type-checks clean, and produces a working production bundle.

## Files Created / Changed

### New files (all inside `extension/`)

| File | Purpose |
|------|---------|
| `entrypoints/schoology.content.ts` | Content script — Shadow DOM overlay, escape hatch, single-mount guard |
| `components/App.tsx` | Root React component (ErrorBoundary + DebugPanel) |
| `components/DebugPanel.tsx` | Debug diagnostics panel (7 checks) |
| `components/ErrorBoundary.tsx` | React error boundary — restores native UI on crash |
| `lib/dom-takeover.ts` | Hides/restores specific Schoology containers with style preservation |
| `README.md` | Extension overview and architecture |
| `TESTING_PHASE_0.md` | Full testing guide (10 sections) |
| `HANDOFF_PHASE_0.md` | This file |

### Modified files (inside `extension/`)

| File | Change |
|------|--------|
| `tsconfig.json` | Added `.wxt/wxt.d.ts` to include, removed `.wxt` from exclude |
| `entrypoints/background.ts` | Switched from `chrome.*` to WXT `browser.*` API for type safety |

### Pre-existing files (from previous session, unchanged by this session)

| File | Status |
|------|--------|
| `package.json` | ✅ Unchanged (deps were already correct) |
| `wxt.config.ts` | ✅ Unchanged |

## Commands Run

```bash
# In extension/
npm install                  # Install dependencies
npm run typecheck            # wxt prepare && tsc --noEmit → PASS
npm run build                # wxt build → PASS
```

## Build / Typecheck Result

- **Typecheck:** ✅ Clean — zero errors
- **Build:** ✅ Success — 196ms
  - `.output/chrome-mv3/manifest.json` (429 B)
  - `.output/chrome-mv3/background.js` (2.88 kB)
  - `.output/chrome-mv3/content-scripts/schoology.js` (201.33 kB)

## Root Files Touched

**None.** All work was confined to `extension/`. The root `package.json` has an existing `postcss` override from a previous session — that was not added or modified by this session.

## Old Next/Puppeteer/API/Data Files

**All untouched.** The following directories were never read or written:
- `app/api/**` ✅
- `lib/scraper/**` ✅
- `data/**` ✅
- All existing Next.js / Puppeteer code ✅

## How to Run the Extension

### Development (with HMR)
```bash
cd extension
npm install   # if not already done
npm run dev
```
Output: `extension/.output/chrome-mv3-dev/`

### Production Build
```bash
cd extension
npm run build
```
Output: `extension/.output/chrome-mv3/`

## How to Load in chrome://extensions

1. Open Chrome, navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select:
   - Dev: `extension/.output/chrome-mv3-dev/`
   - Prod: `extension/.output/chrome-mv3/`
5. "Better Schoology" should appear in the extensions list

## How to Test Show Original Schoology

1. Navigate to any page on `fuhsd.schoology.com`
2. Look for **"👁 Show Original Schoology"** button (top-right, fixed position, dark theme)
3. Click it — native Schoology containers are restored, overlay is hidden
4. Button changes to **"✨ Show Better Schoology"**
5. Click again — overlay returns, native containers hidden
6. Verify: no elements remain incorrectly hidden, no duplicate overlays

## Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| `npm audit` shows 6 vulnerabilities (2 moderate, 4 high) | Low | All in WXT/Vite dev dependencies, not in extension runtime |
| `uuid@8.3.2` deprecation warning | Informational | Transitive dep from WXT |
| Container selectors are best-guesses | Low | If Schoology's HTML doesn't match, native UI stays visible (safe default) |

## Go/No-Go Checklist

| Requirement | Status |
|-------------|--------|
| WXT scaffold complete | ✅ |
| Matches only `fuhsd.schoology.com/*` | ✅ |
| Shadow DOM overlay | ✅ |
| "Show Original Schoology" escape hatch (outside React) | ✅ |
| Hides only specific containers (not `document.body`) | ✅ |
| Preserves previous inline styles for exact restore | ✅ |
| Single-mount guard | ✅ |
| ErrorBoundary around React overlay | ✅ |
| Debug panel with all 7 diagnostics | ✅ |
| `chrome.storage.local` test (not sync) | ✅ |
| `TESTING_PHASE_0.md` with all 10 sections | ✅ |
| Typecheck passes | ✅ |
| Build passes | ✅ |
| No root files modified | ✅ |
| No scraping, no grade storage, no dashboard UI | ✅ |
| No Phase 1 features | ✅ |

## Is It Safe to Proceed to Phase 1?

**Yes** — pending manual testing on live `fuhsd.schoology.com` to confirm:
1. The overlay loads without breaking Schoology
2. The escape hatch fully restores native UI
3. No duplicate mounts on navigation
4. Storage test passes in the debug panel

Once manual testing passes, Phase 1 can begin. **Do not proceed until testing is validated.**

---

> ⚠️ **Phase 0 is complete. Do not continue to Phase 1.**
