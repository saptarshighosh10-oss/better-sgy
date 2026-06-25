# Phase 0 — Testing Guide

> **Goal:** Verify the extension loads safely on `fuhsd.schoology.com`, does not break native Schoology, and the escape hatch works.

---

## 1. Install Dependencies

```bash
cd extension
npm install
```

## 2. Build / Dev

### Development (with HMR)
```bash
npm run dev
```
WXT will output the unpacked extension to `extension/.output/chrome-mv3-dev/`.

### Production build
```bash
npm run build
```
Output: `extension/.output/chrome-mv3/`.

### Type check
```bash
npm run typecheck
```

## 3. Load in Chrome

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the output directory:
   - Dev: `extension/.output/chrome-mv3-dev/`
   - Prod: `extension/.output/chrome-mv3/`
5. The extension "Better Schoology" should appear in the list

## 4. Pages to Test

Navigate to each of these pages while logged into `fuhsd.schoology.com`:

| Page | URL pattern |
|------|-------------|
| **Home** | `https://fuhsd.schoology.com/home` |
| **Grades** | `https://fuhsd.schoology.com/grades/grades` |
| **Course page** | `https://fuhsd.schoology.com/course/...` |
| **Materials** | `https://fuhsd.schoology.com/course/.../materials` |

### What to check on each page

- [ ] The **debug panel** appears in the bottom-right corner
- [ ] Debug panel shows:
  - Extension Loaded: ✅ Yes
  - Current Path: matches the page URL
  - Mount Count: `1` (not 2+)
  - DOM Readable: ✅ Yes
  - Storage R/W: ✅ Pass
  - Native UI: `hidden`
  - Candidate Containers: shows which selectors matched
- [ ] Some Schoology content is hidden (the overlay is replacing it)
- [ ] The **"👁 Show Original Schoology"** button appears in the top-right

## 5. Test the Escape Hatch

1. On any Schoology page, click **"👁 Show Original Schoology"**
2. **Expected:** Native Schoology UI is fully restored (exactly as it looked before the extension)
3. Button text changes to **"✨ Show Better Schoology"**
4. Click again to switch back to the overlay
5. **Expected:** Overlay re-appears, native containers are hidden again

### What to verify
- [ ] Toggle works both directions
- [ ] No elements remain hidden after "Show Original"
- [ ] Schoology is fully usable in "original" mode
- [ ] Toggling back to overlay doesn't create duplicate elements

## 6. Test Reload / Back-Forward Navigation

1. On a Schoology page with the overlay active, press **Cmd+R** (reload)
   - [ ] Overlay loads cleanly again, mount count = 1
   - [ ] No duplicate overlays
2. Navigate between Schoology pages using links
   - [ ] Overlay persists or re-mounts cleanly
   - [ ] Mount count stays at 1
3. Use browser Back/Forward buttons
   - [ ] Overlay still works, no duplicates

## 7. Confirm No Duplicate Overlay

- The **mount count** in the debug panel should always be `1`
- If mount count > 1, something is wrong — take a screenshot and report it
- Open DevTools Console, search for `[BS]` logs:
  ```
  [BS] Content script executing on ...
  [BS] Mount count: 1
  [BS] Hidden N native container(s)
  ```

## 8. What Your Friend Should Test

Ask them to:

1. Install the extension (steps above)
2. Log into their own Schoology account at `fuhsd.schoology.com`
3. Visit each page listed in section 4
4. Test the escape hatch (section 5)
5. Test reload/navigation (section 6)
6. Check mount count stays at 1 (section 7)

### Have them report
- Do they see the debug panel?
- Does the escape hatch work?
- Any errors in DevTools console? (Filter for `[BS]`)
- Any pages where the overlay doesn't load?

## 9. Screenshots & Logs to Send Back

> ⚠️ **IMPORTANT: Redact any grades, names, or personal info before sharing screenshots!**

Please send:

1. **Screenshot of debug panel** on at least 2 different pages
   - Blur/black out any grades visible in the background
2. **Screenshot of escape hatch** — both "Show Original" and "Show Better" states
3. **DevTools Console output** filtered for `[BS]`
   - Open DevTools → Console → type `[BS]` in filter box → screenshot
4. **Any error messages** from the console
5. **Confirmation:**
   - "Escape hatch works: yes/no"
   - "Mount count stayed at 1: yes/no"
   - "Pages tested: home, grades, course, materials"
   - "Schoology still usable after disable: yes/no"

## 10. Uninstalling

1. Go to `chrome://extensions`
2. Find "Better Schoology"
3. Click **Remove**
4. Reload Schoology — everything should be back to normal

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Extension doesn't appear | Make sure you loaded the correct output directory |
| Debug panel doesn't show | Check DevTools console for errors; ensure you're on `fuhsd.schoology.com` |
| Mount count > 1 | Reload the page; if it persists, report as a bug |
| Storage test fails | Extension may not have `storage` permission — check manifest |
| Nothing happens | Make sure `host_permissions` includes `fuhsd.schoology.com` |
