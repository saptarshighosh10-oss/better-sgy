# Phase 2 — Testing Guide

> **Goal:** Verify the minimal Better Schoology dashboard shows real grades, course cards, a gradebook, and an assignment preview inside the extension overlay.

---

## 1. Rebuild & Reload

```bash
cd ~/better-schoology/extension
npm run build
```

Then in Chrome:
1. Open `chrome://extensions`
2. Find **Better Schoology**
3. Click the **refresh icon** (circular arrow) on its card
4. If not loaded: **Load unpacked** → select `extension/.output/chrome-mv3/`

---

## 2. Verify Dashboard Appears

1. Navigate to **`https://fuhsd.schoology.com/grades/grades`**
2. Confirm the Better Schoology overlay covers the page
3. Confirm the **header bar** shows:
   - "Better Schoology" title
   - Current path (`/grades/grades`)
   - Status chip (starts as **Reading…** then changes to **Fresh**)
   - Course count and assignment count after scrape completes
   - Last read time after scrape completes
4. Confirm the **course sidebar** (left column) shows your courses

---

## 3. Check Course Cards

In the left sidebar:
- [ ] 6 courses appear (matching Puppeteer scraper output)
- [ ] Each card shows: course name, teacher, grade percent, letter grade
- [ ] Any courses with unsubmitted past-due assignments show a "missing" badge
- [ ] No crash or blank cards

---

## 4. Test Course Selection → Gradebook

1. Click any course card
2. Confirm:
   - [ ] Course card highlights (blue border)
   - [ ] Right panel switches to the course gradebook
   - [ ] Gradebook header shows: course name, grade %, letter grade, scored/total count
   - [ ] Categories are listed below the header
   - [ ] Each category has an assignment table with: name, score, %, due date, status badge
3. Click **← All courses** to return to the overview
4. Repeat for a second course

---

## 5. Check Assignment Preview (Overview)

When no course is selected, the right panel should show:

- [ ] **Current Grades** section: horizontal bars for each course with grades
   - Bars are colored (green/amber/red based on %)
   - "Grade trends will appear after more snapshots are collected." note at bottom
- [ ] **Missing / Issues** section (if any unsubmitted past-due assignments exist)
   - Shows assignment name and course name
   - Correct count label
- [ ] **Upcoming** section (if any unsubmitted future-due assignments exist)
   - Shows due date
- [ ] **Recently Graded** section
   - Shows assignment name, course, and score

---

## 6. Check Status States

| Condition | Expected |
|-----------|----------|
| Just loaded, scrape running | Status chip: "Reading…" |
| Scrape complete | Status chip: "Fresh" + course/assignment counts visible |
| On non-grades page (no scrape) | Status chip shows stored meta status ("Fresh" from last scrape) |
| No prior data, first load | Empty state: "No saved grades yet. Visit the Grades page first." |

---

## 7. Test Escape Hatch

1. On `/grades/grades`, click **"👁 Show Original Schoology"** (top-right, fixed button)
   - [ ] Dashboard disappears, native Schoology returns
   - [ ] Button text changes to "✨ Show Better Schoology"
2. Click **"✨ Show Better Schoology"**
   - [ ] Dashboard returns
   - [ ] Button text changes back to "👁 Show Original Schoology"

---

## 8. Test Debug Panel

1. Look for **"🔧 BS Debug"** button (bottom-right corner, small, collapsed by default)
2. Click it to expand
3. Confirm:
   - [ ] Label shows "BS Phase 2 Debug"
   - [ ] Phase 0 checks still present (Extension Loaded, Path, Mount Count, etc.)
   - [ ] Scrape Status section shows Fresh + course/assignment counts
   - [ ] Click ✕ to collapse back
4. Confirm DebugPanel appears above the dashboard (not covered)

---

## 9. Test Navigation

1. On `/grades/grades` — dashboard shows
2. Navigate to `/home` — dashboard shows (no scrape, no data update, but overlay stays)
3. Navigate back to `/grades/grades` — scrape re-runs, data refreshes

---

## 10. Test Reload (No Duplicate)

1. Press **Cmd+R** on `/grades/grades`
2. Confirm:
   - [ ] Extension reloads normally
   - [ ] No duplicate overlay
   - [ ] Mount count = 1 in DebugPanel

---

## 11. Verify Root Files Untouched

```bash
cd ~/better-schoology
git diff --name-only -- app/ lib/ data/ package.json
```
Expected: no output (nothing changed).

---

## 12. What to Report

> ⚠️ **Redact any grade numbers or personal info before sharing screenshots.**

Confirm each of:
- "6 course cards visible: yes/no"
- "Grades show on cards: yes/no"
- "Course selection → gradebook works: yes/no"
- "Missing / Upcoming / Recent sections appear: yes/no/n-a"
- "Grade bars in Current Grades section: yes/no"
- "Escape hatch still works: yes/no"
- "No duplicate on reload: yes/no"
- "DebugPanel collapsed by default: yes/no"
- "Any weird grade, blank card, crash: describe"
