# Better Schoology Extension — Phase 3 Handoff

**Last updated:** 2026-06-09  
**Build status:** ✅ Clean (313.57 kB, WXT MV3)  
**Branch:** main

---

## What This Project Is

A Chrome MV3 extension that overlays a completely new UI on top of Schoology (fuhsd.schoology.com). When the extension is active, it renders a full-screen dark-themed dashboard over the Schoology page using a Shadow DOM. The user never sees the real Schoology UI while the extension is open.

Escape hatch: pressing `Escape` hides the overlay (defined in `entrypoints/content.ts`, NOT in React — do not move this).

---

## Hard Constraints (Never Break These)

- **Do not edit root `package.json`** (the one above `extension/`)
- **Do not delete or modify `app/api/**`**
- **Do not delete or modify `lib/scraper/**`**
- **Do not delete or modify `data/**`**
- **Do not use `chrome.storage.sync`** — only `chrome.storage.local`
- **Do not hide `document.body`**
- **Do not move the escape hatch into React**
- **Do not add telemetry or analytics**
- **No Gmail integration** (scrapped)
- **Inline styles only** inside Shadow DOM (no Tailwind, no CSS classes)
- **No iframes** for displaying Schoology content

---

## Tech Stack

| Thing | Detail |
|-------|--------|
| Framework | WXT 0.20.26 + React 18 |
| Build | `npm run build` in `extension/` |
| Output | `extension/.output/chrome-mv3/` |
| Manifest | MV3, content script on `fuhsd.schoology.com/**` |
| Shadow DOM | `position: fixed; inset: 0; z-index: 1` overlay |
| State | `useState` + `chrome.storage.local` via `useExtensionGrades` hook |
| Storage events | `browser.storage.onChanged` for live auto-refresh |
| Routing | `useState<Page>` — no Next.js router, no React Router |

---

## File Map — Everything That Matters

### Entry Points
- `entrypoints/content.ts` — injects shadow root, mounts React, holds escape hatch (`keydown Escape`)
- `entrypoints/background.ts` — service worker (minimal)

### Root Component
- `components/App.tsx` — mounts `<ExtRouter>` (replaced old `<MiniDashboard>`)

### Shell
- `components/ExtRouter.tsx` — full-screen layout shell: sidebar + main area. Holds `page` state + `selectedCourseName`. Pages: overview / grades / assignments / materials
- `components/ExtSidebar.tsx` — 240px sidebar: BS logo, nav items, missing-count badge on Assignments, status dot + last-scraped time footer

### Pages (`components/pages/`)
- `OverviewPage.tsx` — 4-stat strip + course card grid + To Do / Upcoming right panel
- `GradesPage.tsx` — left course list + right `CourseGradebook` panel, fills viewport with `position: absolute; inset: 0`
- `AssignmentsPage.tsx` — Missing/Issues → Upcoming → Recently Graded groups
- `MaterialsPage.tsx` — **tree view** expand/collapse materials browser (see detail below)

### Shared Components
- `components/ExtCourseCard.tsx` — course card used on Overview. Key: `display: flex; flexDirection: column; height: 100%` for uniform grid height
- `components/CourseGradebook.tsx` — category/assignment breakdown for one course

### Library (`lib/`)
- `course-colors.ts` — deterministic color + abbreviation from course name (djb2 hash)
- `fetch-materials.ts` — **Phase 3C** materials fetching (see detail below)
- `grade-utils.ts` — `parseGradeString`, `gradeColor`, `isMissing`
- `scrape-dom.ts` — scrapes live `/grades/grades` DOM into `SchoologyData`; section ID extracted from `div.id = "s-js-gradebook-course-{sectionId}"`
- `scrape-status.ts` — `ScrapeResult` type + status helpers
- `schemas.ts` — `ScrapedCourse`, `ScrapedCategory`, `ScrapedAssignment`, `SchoologyData` types
- `storage.ts` — `chrome.storage.local` read/write helpers
- `use-extension-grades.ts` — React hook, reads grades from storage, listens for changes
- `transform.ts` — `parseCourseTitle`, `cleanAssignmentName`, `SKIP_PATTERN`

---

## Materials Page — Full Detail

**File:** `components/pages/MaterialsPage.tsx`

### How it works
1. On mount, auto-loads first course
2. Calls `resolveMaterialsUrl(courseName, storedHref)` — tries stored href → live DOM section ID → background fetch fallback
3. Calls `fetchMaterials(url)` — fetches the Schoology materials page via `fetch({ credentials: 'include' })`, parses with `DOMParser`
4. Renders items as a **collapsible tree** (not drill-in navigation)
   - Click a folder → expands inline, loads sub-items on demand
   - Click again → collapses
   - Sub-folders nest recursively with `depth * 20px` indent
5. Click a non-folder item (assignment, page, document):
   - If `type === 'link'` or external URL or PDF extension → `window.open(..., '_blank')`
   - Otherwise → calls `fetchItemContent(url)`, renders result natively in `ContentViewer`
6. `ContentViewer` shows: title, due date chip, paragraphs (h2/h3/bullet/text), attachments list
7. Back button returns to tree (tree state is preserved in React state, not re-fetched)

### Key state
```ts
const [selected, setSelected]     // current course
const [items, setItems]           // top-level MaterialItem[]
const [folders, setFolders]       // Map<href, FolderEntry> — loaded folder children
const [status, setStatus]         // 'idle' | 'loading' | 'error'
const [contentView, setContentView] // null or { data, url, title }
```

### `FolderEntry`
```ts
interface FolderEntry { status: 'loading' | 'done' | 'error'; items: MaterialItem[]; }
```

---

## `fetch-materials.ts` — Full Detail

### Types exported
```ts
MaterialType = 'folder' | 'document' | 'link' | 'assignment' | 'quiz' | 'media' | 'unknown'

MaterialItem {
  type: MaterialType
  title: string
  href: string | null
  id: string | null        // folder ID from ?f= param
  dueDate?: string | null  // extracted from list row
  description?: string | null // short preview text from list row
}

ContentParagraph { kind: 'h2'|'h3'|'text'|'bullet'|'duedate'; text: string }
ContentAttachment { title: string; href: string; fileSize?: string }
FetchedContent { success, title, paragraphs, attachments, error }
```

### Functions exported
- `materialsUrlFromCourseHref(href)` — converts `/course/{id}` or `/gradebook/{id}` or `/section/{id}` href to `/course/{id}/materials` URL
- `resolveMaterialsUrl(courseName, storedHref)` — tries 3 strategies: stored href → live DOM div ID → background fetch
- `fetchMaterials(url)` — fetches materials page, returns `MaterialsResult` with `MaterialItem[]`
- `fetchItemContent(url)` — fetches a content page (assignment/document), extracts paragraphs + attachments, returns `FetchedContent`
- `fetchCourseHrefs()` — cached background fetch of course-dashboard for href map
- `fetchFolderContents(url, title, id)` — thin wrapper around `fetchMaterials`

### URL resolution — critical detail
Schoology's `/grades/grades` page has `.gradebook-course` divs with IDs like `s-js-gradebook-course-8141837125`. The section ID is extracted from the div's own `id` attribute — NOT from the anchor href (which is just `#`).

`scrape-dom.ts` stores `href = "https://fuhsd.schoology.com/course/{sectionId}"` during scraping. This is what `resolveMaterialsUrl` uses as the stored href.

### Filtering — `NAV_LABELS` set
Schoology injects left-nav links into every page. These are filtered out:
```
'all materials', 'assignments', 'tests/quizzes', 'files', 'links',
'discussions', 'pages', 'albums', 'scorm', 'web content', 'external tools',
'assessments', 'export', 'notifications', 'switch to another course.',
'mastery', 'course profile', 'prev', 'next', 'up'
```

### Type detection
`classifyFromElement(el, href)` checks CSS classes first (e.g. `s-type-assignment`, `material-type-folder`), falls back to URL pattern matching.

---

## Scraping — How Grades Get Into the Extension

1. User visits `fuhsd.schoology.com/grades/grades`
2. Content script detects the page, calls `scrapeGradesFromDoc(document)`
3. Extracts courses, categories, assignments from `.gradebook-course` elements
4. Runs safety guards (refuses if 0 courses or >50% course drop)
5. Saves to `chrome.storage.local` as `SchoologyData`
6. `useExtensionGrades` hook in React reads storage and re-renders on change

**No background scraping.** User must visit the grades page once. The extension reads from live DOM passively — no Schoology API calls, no background tab opening.

---

## Course Color System

`lib/course-colors.ts`:
- `courseColor(name)` — djb2 hash of course name → index into 10-color palette
- `courseAbbr(name)` — first letters of significant words (e.g. "Biology" → "BIO", "Algebra 2/Trig" → "A2T")
- `abbrFontSize(abbr)` — 64/50/40/32px based on character count (for watermark rendering)

---

## Known Issues / Pending Work

### Materials page
- **Parser accuracy**: `parseMaterialsDoc` uses two strategies. Strategy 1 (`.item-row` / `.material-row`) works if Schoology renders those classes. Strategy 2 (link scan) is a fallback. Some courses may show incomplete lists depending on their HTML structure — needs live testing per course.
- **Content viewer**: `fetchItemContent` extracts text blocks from Schoology content pages. Quality depends on how structured the page HTML is. Pages with mainly images or iframe-embedded content will show "No text content found" with an "Open in Schoology" link.
- **Folder items vs files not separated**: The old version had "Folders" / "Files & Links" sections. The tree view now shows everything together in document order (matching Schoology's layout). This is intentional.

### General
- `fetchCourseHrefs()` (background fetch of `/home/course-dashboard`) often returns 0 results because that page is JavaScript-rendered. It's the last fallback — the live DOM section ID extraction handles most cases.

---

## Design System (inline styles)

All colors live in a `const T = { ... }` at the top of each component file:
```
background:  #0b0e17 (app), #0d1019 (sidebar/panels), #111827 (cards)
border:      #1e2535
text:        #e8eaf0 (primary), #7a8ea3 (muted), #2a3a52 (faint)
primary:     #3b82f6
failed/red:  #ef4444
assign:      #10b981
folder:      #f59e0b
link:        #06b6d4
doc/purple:  #8b5cf6
```

Font: `'Inter', system-ui, -apple-system, sans-serif`

---

## How to Build & Load

```bash
cd ~/better-schoology/extension
npm run build
# Load unpacked from: extension/.output/chrome-mv3/
# After any code change: npm run build, then reload extension in chrome://extensions
```

---

## What Was Done This Session (Phase 3)

- **Phase 3A**: Full shell — sidebar nav, Overview page (stats + course cards + todo), Grades page (course list + gradebook), Assignments page (grouped)
- **Phase 3B fixes**: Course card uniform height (flex column), GradesPage viewport fill (absolute positioning)
- **Phase 3C**: Materials page — built from scratch
  - URL resolver using live DOM section IDs (not link hrefs)
  - `fetch + DOMParser` for same-origin Schoology pages
  - Nav label filtering (Prev/Next/Up etc.)
  - **Rewrote twice**: first as drill-in navigation, then as tree (correct behavior)
  - Tree: inline expand/collapse, recursive nesting, on-demand folder loading
  - Native content viewer (no iframe): paragraphs, due date, attachments list
  - PDFs/external links open in new tab
