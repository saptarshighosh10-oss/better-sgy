# Phase 1 — Testing Guide

> **Goal:** Verify the extension can scrape real grades from the live Schoology DOM, validate them, and store them safely.

---

## 1. Rebuild & Reload

```bash
cd extension
npm install
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Find "Better Schoology"
3. Click the **refresh** icon (circular arrow) to reload the extension
4. If you don't have it loaded yet, click **Load unpacked** → select `extension/.output/chrome-mv3/`

## 2. Test Live DOM Scrape on /grades/grades

1. Navigate to **`https://fuhsd.schoology.com/grades/grades`**
2. The debug panel (bottom-right) should now show a **"Scrape Status"** section
3. Watch the status progress through:
   ```
   Checking session… → Scraping live DOM… → Parsing… → Validating… → Saving… → ✅ Fresh
   ```
4. Once it reaches **Fresh**, check:
   - [ ] **Courses** count matches what you see on the page
   - [ ] **Assignments** count is > 0
   - [ ] **Period** shows your grading period (e.g. "25-26 T2")
   - [ ] **Scraped At** shows the current time
   - [ ] **No errors** shown

## 3. Parity Check with Old Scraper

If you have existing data from the Puppeteer scraper:

```bash
# From the project root (not extension/)
cat data/schoology-data.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f'Puppeteer: {len(d[\"courses\"])} courses')
for c in d['courses']:
    acount = sum(len(cat['assignments']) for cat in c['categories'])
    print(f'  {c[\"name\"]}: {acount} assignments')
"
```

Compare these numbers against what the debug panel shows.

## 4. Test Fetch Experiment (Non-Grades Pages)

1. Navigate to **`https://fuhsd.schoology.com/home`** (or any non-grades page)
2. The debug panel should show a **"Fetch Experiment"** section
3. Check:
   - [ ] Result shows either ✅ Success or ❌ Failed
   - [ ] Note explains what happened
   - [ ] This is informational only — it does NOT affect grade storage

## 5. Test Safety Guards

### Zero courses guard
- If you navigate to a non-grades Schoology page, the scrape won't run (it only runs on `/grades/grades`)

### Data integrity
- Open DevTools → Application → Extension Storage (under "Better Schoology")
- Check:
  - [ ] `bs_grade_data` contains your grade data
  - [ ] `bs_last_good_data` contains a fallback copy
  - [ ] `bs_scrape_meta` shows status "fresh"

## 6. Test Escape Hatch Still Works

1. On `/grades/grades`, click **"👁 Show Original Schoology"**
   - [ ] Native grades page is fully restored
2. Click **"✨ Show Better Schoology"**
   - [ ] Overlay returns with scrape data still shown in debug panel

## 7. Test Reload / Navigation

1. On `/grades/grades`, press **Cmd+R**
   - [ ] Extension reloads, scrape runs again
   - [ ] Mount count = 1
   - [ ] Status returns to Fresh
2. Navigate to another page and back
   - [ ] Scrape re-runs on grades page
   - [ ] No duplicate overlays

## 8. What to Report

> ⚠️ **REDACT any grades, names, or personal info before sharing!**

1. **Screenshot of debug panel on `/grades/grades`** showing:
   - Scrape status = Fresh
   - Course count
   - Assignment count
2. **Screenshot of debug panel on `/home`** showing:
   - Fetch experiment result
3. **DevTools Console** filtered for `[BS]` — screenshot showing scrape logs:
   ```
   [BS] Scraping live DOM...
   [BS] Scraped N courses, period="..."
   [BS] Scrape complete and saved!
   ```
4. **DevTools Application tab** → Extension Storage screenshot showing stored data
5. **Confirmation:**
   - "Scrape status reached Fresh: yes/no"
   - "Course count matches expected: yes/no"
   - "Escape hatch still works: yes/no"
   - "Fetch experiment result: success/failed"
