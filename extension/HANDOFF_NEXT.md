# HANDOFF — Next Session (updated 2026-06-10 after budget refresh)

STATUS UPDATE — done this session, builds green:
- ✅ Task 1 UI: Canva-style whole-surface drag-drop zone in SubmissionsPanel (MaterialsPage.tsx) — drag anywhere on box, click/Enter to browse, multi-file append+dedupe, per-file remove, comment field, spinner while sending. Backend `submitDropboxText`/`submitDropboxFiles` already existed (verified-live two-step: JWT → /file/upload-service → form POST with file[files] JSON map).
- ✅ Task 2 root cause FOUND + FIXED: PowerSchool assessments (`/course/<id>/assessments/<id>`) were dropped by both `isMaterialsLink` and `isContentLink` regexes in `parseMaterialsDoc` — French folder showed 1 item instead of 3 ("Examen du chapitre 6" + "Examen des verbes" were invisible). Fixed: added `assessments?` to classify+allowlist regexes; assessment clicks open native tab (SPA, unrenderable in-overlay). Verified offline against `.debug/french-top.html`.
- ⏳ NOT yet live-tested: file upload end-to-end (user must test on Drama EX MACHINA rev 8) and assessments appearing in live French course.

Remaining: recording submission (mic flow), Resources-import tab, rich-text Create editor, in-overlay quiz taking (all phase 2) + doc cleanup (Task 3 below).

## Task 1 — In-app assignment submission ("do work inside the overlay")

Goal: student opens an assignment in the Materials page and submits work
(file upload / text) WITHOUT leaving Better Schoology.

Research already done — do not redo it, it's saved in `.debug/`:
- `raw-submit-form.html` — the dropbox submit form markup (POST target, hidden inputs, form token)
- `upload-1-dialog.png`, `upload-2-after-file.png`, `upload-3-after-submit.png` — the native upload flow, step by step
- `test-submission.mjs`, `test-submission2.mjs` — prior fetch experiments against the submit endpoint
- `quiz-attempt.html`, `quiz-page.html`, `quiz-raw-*.html` — quiz flow (harder, do AFTER file submit works)

Existing plumbing to reuse (`lib/fetch-materials.ts`, 1158 lines):
- `sgyFetch(url)` — authenticated same-origin fetch (cookies ride along)
- `SGY_ORIGIN` — NEVER hardcode fuhsd; extension must stay school-agnostic (`*.schoology.com`)
- `SubmissionInfo` / `SubmissionRevision` types already exist — submission READ already parses
- WAF guard: `isWafChallenge(html)` — check every response

Approach that matches the codebase:
1. Parse the dropbox form from the assignment page (action URL + hidden inputs incl. form_build_id/form_token)
2. POST multipart via `sgyFetch` with `FormData` (file from `<input type=file>` in overlay UI)
3. Re-fetch submission info to confirm; show revision in UI
4. UI: add a "Submit" panel to the assignment view in `MaterialsPage.tsx` (it already renders SubmissionInfo)
Keep ALL of it behind the existing materials fetch layer. No new scraping of grades.

### Capability spec — what native Schoology submission does (user screenshots, 2026-06-10)

**Assignment submit dialog** (e.g. `fuhsd.schoology.com/assignment/8339829444/info`, Drama "ROUGH DRAFT- EX MACHINA") has 3 tabs + revision tracking:

1. **Upload tab** (MVP — build this first):
   - Drag-and-drop box: file can be dropped ANYWHERE on the box (Canva-style whole-surface drop target), plus a click-to-browse picker
   - A mic icon opens "Choose a Recording Type" → **Audio Only** / **Audio & Video** (in-browser recording submission — LATER, not MVP)
   - Optional comment textarea
   - Submit / Cancel; header shows "Revision N" (auto-increments per submission)
2. **Create tab**: rich-text editor submission (bold/italic/underline, lists, color, tables, font size) with **Submit / Save Draft / Cancel** — text-based hand-in, no file. Build as MVP-2 (plain textarea → HTML is acceptable v1).
3. **Resources tab**: import a file from Schoology Resources (Personal / Group / Apps collections) → Import. LOW priority.

**Submission sidebar** (already partially parsed by `SubmissionInfo`): "Revision 1..N submitted · 1 item · On time/Late" rows + **Re-submit Assignment** button — resubmission is always a new revision, never overwrites.

Overlay UI requirements: drop-zone accepts dragover/drop on the full box, shows picked filename, comment field, submit button with progress state, then refreshes revision list. Match the extension's theme system (T tokens, bs-focusable, bs-spinner while uploading).

### ⚠️ DEFINITIVE: quizzes run on LEARNOSITY — native re-render is NOT possible

Investigated 2026-06-10 against `.debug/quiz-attempt.html` (2MB rendered SPA). The engine is **Learnosity** (244 `lrn_*` classes: `lrn_cloze_response`, `lrn-cloze-select`, `lrn_combobox`, `lrn_btn_blue`, `lrn-assess-item`, `lrn-assess-modal-*`). The grammaire quiz = cloze/fill-blank with dropdown selects.

Why full native re-render is impossible (cryptographic, not effort):
1. Questions/images load from `*.learnosity.com` via a **signed init request** (HMAC-SHA256 with Schoology's server-side consumer secret). Cannot forge it; Learnosity rejects unsigned requests by design.
2. Answers save through Learnosity's live in-page SDK session (`save()`/`submit()`), tied to a signed, expiring session token — not a replayable POST.
3. Images are CDN-served by Learnosity with the same signed session.
→ The "they update / I update" model does NOT apply: there's no contract to track, there's a signature gate that can't be passed without stealing the secret. Do not attempt to forge Learnosity signatures.

What we DID instead (correct + shipped): the in-overlay iframe (`NativeTaskViewer`) runs the REAL Learnosity engine same-origin, and `blendFrame()` injects CSS to re-skin it as Better Schoology — hide Schoology chrome, themed surfaces, themed question card, accent buttons, responsive images, font match, live theme/accent re-skin (`onThemeChange`), removed the redundant `.lrn-right-region` accessibility toolbar. Answers + images work because it IS the real engine. This is the ceiling for quizzes; don't revisit native re-render.

#### KNOWN ISSUE (deferred by user 2026-06-10): accent-aware page counter
The Learnosity page counter (`.lrn-pager` → `.lrn-assess-li` pills → `.pagination-item-number`, active = `.pagination-active`) is currently locked to a FIXED neutral (mono-dark `#242424` pill + `#faf9f6` white text) in `blendCss()` so it's readable on every theme/accent. We TRIED making the active page render in the user's chosen accent but it kept coming out white-on-white / unreadable on some theme+accent combos, and there appear to be TWO pager variants (the bottom nav pager vs the Review-modal grid) with different/!important Learnosity styles that fight the override. User said: leave it fixed-neutral for now, revisit later. Goal when revisited: active page pill in `T.primary` with `inkOnAccent()` text, inactive pills neutral, working across all 3 themes × 7 accents. Don't break native prev/next navigation. Capture the live bottom-pager DOM (it's React-rendered, not fully in `.debug/quiz-attempt.html`) to get its real class names first.

### Classic quizzes/assessments landing pages — phase 2, do NOT bundle with file submit

- Landing: `/course/<courseId>/assessments/<assessmentId>` — shows grade (e.g. 9.66/10), "3 attempts max", PREVIOUS ATTEMPTS table (status In progress/Submitted, time spent, last modified, **Resume**/View links)
- Taking: `/common-assessment-delivery/start/<id>?action=onresume...` — PowerSchool SPA: paginated questions (1 of 4), inline `<select>` dropdowns inside sentences, per-question POSSIBLE POINTS, Prev/Next, side toolbar, final **Review** screen (Flagged/Unattempted/Partially Attempted filters + question grid) → **Finish** submits the attempt
- This is an SPA with its own API, NOT a simple form POST. Realistic v1: detect assessment items in Materials and deep-link "Resume in Schoology" (open native page); full in-overlay quiz-taking only after the dropbox submit works. Prior recon: `.debug/quiz-page.html`, `quiz-attempt.html`, `quiz-raw-start.html`, `quiz-raw-assess.html`, `quiz-search-result.json`.

### Live test slots (per user — confirm with user BEFORE any real submit)

- **Quiz**: French 1 — "grammaire 6.1 practice" (course `8141836912`, assessment `8389977830`). Attempt 3 of 3 is currently IN PROGRESS — this is the LAST remaining attempt and the only quiz test spot. Resume is safe to look at; pressing Finish consumes it. Ask the user first.
- **File upload**: Drama "ROUGH DRAFT- EX MACHINA" (assignment `8339829444`) — already at Revision 7, re-submit allowed, user has used it for testing. Still confirm before posting a real revision.

## Task 2 — Folder scraping broken (user report: "folder thing does not correctly scrape")

Where: `lib/fetch-materials.ts` (folder fetch/parse) + `MaterialsPage.tsx` render.
Offline test fixtures already saved — test parser changes against these, no live Schoology needed:
- `.debug/alg2-folder-1000474287.html`, `bio-folder-968288532.html`, `drama-folder-994933129.html`,
  `french-folder-971081269.html`, `litwrit-folder-991355763.html`, `pe-folder-973810988.html`
- `.debug/test-parser*.mjs` — prior parser harnesses, run with `node`

First step: ask the user WHICH folder/course fails and how (empty? missing items? wrong nesting?),
then reproduce against the saved fixtures (or save a fresh fixture the same way) before touching the parser.
Known foot-guns in there: folder pages can link back to themselves (cycle guard exists around
MaterialsPage line ~513), link-wrapper URLs (`resolveLinkWrapper`), WAF challenge pages.

## Task 3 — Stale docs (cheap, do whenever)

- `README.md`: still says Phase 0 / "does not scrape grades" / lists deleted `DebugPanel.tsx` / hardcodes fuhsd. Rewrite to current state.
- `TESTING_UI.md` line ~50: theme revert instruction is dead — theme is RUNTIME now (nav half-circle button cycles Navy → Mono Black → Mono White, persisted in localStorage `__bs_theme__`).
- `HANDOFF_PHASE_0–5.md`, `TESTING_PHASE_0–2.md`: prepend one line "ARCHIVED — historical phase doc".

## Current state (what the prior session shipped — don't re-litigate)

- Theme system: 3 runtime themes in `lib/theme.ts` (`original`/Navy, `mono-dark`, `mono-light`), `T` is a live Proxy, switch via FloatingNav half-circle button. 7 accent presets; cream is no longer silently converted to blue.
- Nav: global ←/→ cycles pages in a full wrap-around loop (handler in `ExtRouter.tsx`; carousel on Overview captures arrows when focused — intentional). Page order ends with `nostalgia`.
- A11y: `.bs-focusable` focus rings everywhere, aria-current/pressed/expanded, Escape closes menus, labeled inputs.
- Motion: transform/opacity only, `.bs-lift`, `.bs-spinner` (folder loading), reduced-motion respected globally.
- Grade colors: calm ramp (A green, B blue, C amber, D orange, F red) in `grade-utils.ts`.
- GamePage canvas reads theme live via getter object `C`.

## Hard rules (unchanged)

- Never touch `~/better-schoology-videos`
- Never touch root `app/api/**`, `lib/scraper/**`, `data/**`, root `package.json`
- School-agnostic: `SGY_ORIGIN` + `sgyFetch`, never hardcode `fuhsd`
- Escape hatch stays outside React; never hide `document.body`
- `npx tsc --noEmit` after edits; `npm run build` (wxt) before handing back; reload at `chrome://extensions`
