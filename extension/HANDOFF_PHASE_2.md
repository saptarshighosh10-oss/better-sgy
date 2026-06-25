# Phase 2 Handoff — Minimal Dashboard UI

> **Date:** 2026-06-09
> **Status:** ✅ Phase 2 Code-Complete (pending manual testing)

---

## What Was Built

Phase 2 adds a real usable dashboard inside the Chrome extension overlay.  
The UI reads scraped grades from `chrome.storage.local` (written by Phase 1) and displays:

1. **Header bar** — title, current path, live status chip, course/assignment counts, last-read time, stale/error notes
2. **Course sidebar** — clickable cards with grade %, letter, missing count
3. **Course gradebook** — selected course detail: header, categories, assignment table (score, %, due date, status)
4. **Overview (no course selected)** — current grade bars + assignment preview (Missing / Upcoming / Recently Graded)
5. **Empty/stale/failure states** — every code path has a clear message

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/grade-utils.ts` | Grade color, parseGradeString, scorePercent, date helpers, isMissing/isUpcoming |
| `lib/use-extension-grades.ts` | React hook: loads storage on mount, subscribes to onChanged |
| `components/MiniDashboard.tsx` | Full-screen layout shell (header + sidebar + main) |
| `components/CourseCards.tsx` | Course list with clickable cards |
| `components/CourseGradebook.tsx` | Category and assignment table for selected course |
| `components/AssignmentsPreview.tsx` | Missing / Upcoming / Recently Graded groups |
| `components/CurrentGradesMiniGraph.tsx` | Honest horizontal grade bars; placeholder note for trends |
| `TESTING_PHASE_2.md` | Manual test script |
| `HANDOFF_PHASE_2.md` | This file |

## Files Modified

| File | Change |
|------|--------|
| `components/App.tsx` | Added `<MiniDashboard>` alongside `<DebugPanel>` |
| `components/DebugPanel.tsx` | Starts collapsed (`useState(true)`), label updated to Phase 2 |
| `entrypoints/schoology.content.ts` | Added thin scrollbar CSS to shadow styles only |

## Files NOT Modified

- `lib/scrape-dom.ts`, `schemas.ts`, `storage.ts`, `scrape-status.ts`, `transform.ts`
- `lib/fetch-experiment.ts`, `lib/dom-takeover.ts`
- `entrypoints/background.ts`
- All root files, `app/api/`, `lib/scraper/`, `data/`, root `package.json`

---

## Build Result

```bash
cd extension && npm run build   # ✅ 330ms, zero errors, 288.72 kB
cd extension && npm run typecheck  # ✅ Zero TypeScript errors
```

Output:
- `.output/chrome-mv3/manifest.json` (429 B)
- `.output/chrome-mv3/background.js` (2.88 kB)
- `.output/chrome-mv3/content-scripts/schoology.js` (285.41 kB)

---

## Architecture

```
chrome.storage.local
        │  (bs_grade_data, bs_last_good_data, bs_scrape_meta)
        ▼
useExtensionGrades()        ← subscribes to storage.onChanged for auto-refresh
        │
        ▼
App.tsx
  ├── MiniDashboard          ← receives scrapeResult prop (live scrape status)
  │     ├── Header           (status chip uses live scrapeResult; stale fallback to stored meta)
  │     ├── CourseCards      (sidebar, 288px wide)
  │     └── Main panel
  │           ├── (no selection) → CurrentGradesMiniGraph + AssignmentsPreview
  │           └── (course selected) → CourseGradebook
  └── DebugPanel             (collapsed by default, floats in corner)
```

**Data flow:**  
Scrape runs → saves to `bs_grade_data` + `bs_scrape_meta` → `storage.onChanged` fires →
`useExtensionGrades` reloads → MiniDashboard re-renders with fresh data.

---

## How Escape Hatch Is Preserved

The escape hatch button is created in `createEscapeHatch()` in `schoology.content.ts`, appended to `document.body` outside React, at `z-index: 2147483647`. Phase 2 did not touch this function. MiniDashboard uses `position: fixed; z-index: 1` inside the shadow DOM — the escape hatch remains on top.

---

## Graph Guidance

`CurrentGradesMiniGraph` shows **current grade percentages only** as horizontal bars.  
No fake sparklines. No historical trends. No ECharts.  
Footer note: "Grade trends will appear after more snapshots are collected."

---

## Empty / Error States

| State | Component shows |
|-------|----------------|
| `loading === true` | "Loading…" centered text |
| `data === null`, scrape in progress | "Reading grades from Schoology…" |
| `data === null`, scrape idle | "No saved grades yet. Visit the Grades page first." |
| `usingFallback === true` | "⚠ cached" badge in header |
| `meta.status === 'failed'` | "Couldn't read grades — showing last saved version." in header |
| `meta.status === 'stale'` | "Showing last saved grades from [time]." in header |

---

## How to Reload & Test

```bash
cd ~/better-schoology/extension
npm run build
```

1. Open `chrome://extensions`
2. Click the refresh icon on **Better Schoology**
3. Go to `https://fuhsd.schoology.com/grades/grades`
4. Watch status chip change from "Reading…" to "Fresh"
5. Verify 6 course cards appear
6. Click a course → gradebook appears
7. Click "← All courses" → grade bars + assignment preview
8. Click "👁 Show Original Schoology" → original page returns
9. Click "✨ Show Better Schoology" → dashboard returns
10. Reload → no duplicate, mount count = 1

---

## Known Limitations

| Issue | Notes |
|-------|-------|
| `parseGrade` doesn't handle `Inc` / `Exc` status strings | These appear as literal text in the letter column — acceptable for Phase 2 |
| "Upcoming" assignments sorted by insertion order, not date | Good enough for Phase 2; Phase 3 could sort by due date |
| "Recently Graded" shows assignments in reverse-insertion order, not by actual graded date | Schoology doesn't expose graded date; due date is used as proxy |
| No per-assignment drill-down links | Phase 3 / post-Phase 2 |
| `href` field on ScrapedCourse is always `''` | Not scraped in Phase 1; extension links to grades page are not needed yet |

---

## Is It Safe to Proceed to Phase 3?

**Pending manual testing.** Verify on `fuhsd.schoology.com/grades/grades`:
1. Dashboard appears and shows real grades
2. Course cards are accurate
3. Clicking a course shows its gradebook
4. Assignment preview has correct groupings
5. Escape hatch still works
6. No duplicate mount
7. DebugPanel still accessible (collapsed)

Once manual testing passes, Phase 3 planning can begin.

---

> ⚠️ **Phase 2 is code-complete. Do not continue to Phase 3 until manually tested.**
