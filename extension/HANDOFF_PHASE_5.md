# Better Schoology Extension — Phase 5 Handoff

**Last updated:** 2026-06-09
**Status:** Mid-session pivot — quiz feature paused (not started), Assignments tab redesign in progress
**Read first:** HANDOFF_PHASE_4.md (general architecture — Materials viewer, `RichBody`, `sgyFetch`, etc.)

---

## ⏸️ PAUSED — Quiz launcher + free-response sync

User asked (typo-laden): *"i think keep the launder but add another plug to convert the writing into our format and it syncs with the other format"* — clarified via AskUserQuestion to mean two things, both confirmed but **not yet implemented**:

1. **Part 1 — "Start Attempt →" launcher.** Quiz items in Materials (`/course/<id>/assessments/<id>` URLs) get a button that opens the assessment landing page in a new tab. Skips Schoology's clunky nav.
2. **Part 2 — Free-response sync.** For short-answer/essay questions inside a Learnosity quiz, show the question text + an answer box in our UI; typed answers sync to Schoology's `questionresponses` API so the quiz still grades normally there.

Then the user redirected to the Assignments-tab work below before any code was written. **Nothing in this section has been implemented** — only recon.

### ⚠️ Live-account caveat — read before touching this again

While investigating, I clicked "Start Attempt" on **"grammaire 6.1 practice"** (French 1, course `8141836912`, assessment `8389977830`), which **consumed the user's 3rd/last attempt** (submission id `1924986606`, grade was 9.66/10 going in). User explicitly said: *"use 6.1 but im pretty sure it takes the highest score attempt jsut dont fill out anything yet"* — i.e. **do not answer or submit that in-progress attempt** without a fresh, explicit go-ahead. It's just sitting open/unanswered on Learnosity right now.

### Architecture findings (from recon)

- Schoology delegates ALL quiz rendering/grading/autosave to **Learnosity** (`*.learnosity.schoology.com`) via signed sessions (`consumer_key`, `session_id`, `user_id`, HMAC `signature`). Re-implementing the question UI is not realistic.
- BUT the **assessment landing page** (`/course/<id>/assessments/<id>`) is server-rendered HTML containing `window.initSgyUiApp(bundleUrl, appName, locale, labelBundle, true, dataObject)`. `dataObject.initialization` is real, scrapable JSON (no Learnosity auth needed) with: `title`, `instructions` (HTML string), `numAttemptsTaken`/`numAttemptsAllowed`, `score`/`scoreRoundedForDisplay`, `pointsTotal`/`gradebookPointsTotal`, and `submissions[]` (each with `id`, `completed`, `status`, `last_modified_date/time`, `minutes_elapsed`, `resumable`, `can_student_resume`).
- A raw `fetch()` (same as `sgyFetch`) to `/common-assessment-delivery/start/<id>?action=onresume&submissionId=...` returned **429** — direct Learnosity API calls (`questionresponses?a=set/update`) from the extension are NOT confirmed feasible. This is the open risk for Part 2.

### Part 1 plan (low-risk, ready to implement)

1. `extension/lib/fetch-materials.ts` → `classifyFromHref`: add `if (/\/assessments\/\d+/.test(href)) return 'quiz';`
2. New `extension/lib/quiz.ts`:
   - `extractBalancedObject(text, key)` — brace-counting extractor for `"key":{...}` inside the `initSgyUiApp(...)` script (not standalone JSON).
   - `fetchQuizInfo(href)` — `sgyFetch` the landing page, extract `initialization`, map to a small `QuizInfo` (title, `instructions` parsed via `DOMParser` + the existing `extractRichBody` so it renders through `RichBody` like assignment bodies do, attempts, score, submission history, in-progress submission id).
3. `MaterialsPage.tsx`:
   - Add `{ kind: 'quiz'; href: string; title: string; status: 'loading'|'done'|'error'; info: QuizInfo | null; errorMsg?: string }` to `Viewer`.
   - `openHref`: new branch for `type === 'quiz'` (mirror `openContent`'s loading→done pattern).
   - New `QuizViewer` component: title, attempt/score chips, instructions via `RichBody`, attempt history list, single CTA `<a href={href} target="_blank">Start/Resume Attempt ↗</a>` (label depends on `inProgressSubmissionId` / attempts-remaining).
4. Verify with `npx tsc --noEmit && npm run build`.

A real captured `initialization` payload for grounding is saved at `extension/.debug/quiz-raw-assess.html` (gitignored).

### Part 2 — UNRESOLVED, needs a decision before starting

Two candidate architectures, not yet decided:

- **(a) Direct Learnosity API calls** (`questionresponses?a=set/update&...&st=save`) — needs a valid signed session that raw-fetching the start URL did NOT yield (429, no embedded `consumer_key`/`signature` found). High risk / uncertain feasibility.
- **(b) DOM-sync overlay** — extension renders its own question text + textarea; a content script on `/common-assessment-delivery/*` two-way-binds that to Learnosity's real rendered input via dispatched DOM events, so Learnosity's own already-authenticated autosave persists it. More robust, but needs a new content-script match pattern and the actual DOM structure of a Learnosity free-response question (the only question seen so far, Q1/4 of "grammaire 6.1 practice", was a cloze/fill-in-blank, not free-response — need a real free-response question to inspect).

Recon scripts (gitignored, follow `scripts/dump-*.mjs` conventions) live in `/Users/saptarshighosh/better-schoology/scripts/`: `find-quiz.mjs`, `dump-quiz-page.mjs`, `dump-quiz-attempt.mjs`, `dump-quiz-rawfetch.mjs`.

---

## 🔧 IN PROGRESS — Assignments tab not populating correctly

User: *"the assignments tab aren't populating correctly"* → redirected to porting the dashboard's Assignments design (`components/assignments/{assignments-client,assignment-row}.tsx`) into `extension/components/pages/AssignmentsPage.tsx`, since debugging the old grouping logic from scratch + the quiz feature was "too long to do rn".

### Root cause (for the record, even though the redesign fixes it)

`ScrapedAssignment.status` is one of only **`'graded' | 'submitted' | 'unsubmitted'`** (`extension/lib/schemas.ts`). The old `AssignmentsPage.tsx` only had three buckets:

- `missing` = `isMissing(a)` → `status === 'unsubmitted' && dueDate is past`
- `upcoming` = `isUpcoming(a)` → `status === 'unsubmitted' && dueDate is future`
- `recent` = `status === 'graded'`

**Anything with `status === 'submitted'`** (turned in, awaiting grade) **or an `unsubmitted` item with an empty `dueDate`** matches none of the three and silently disappears. For a student with a lot of turned-in-but-ungraded work, that's most of the list.

### Fix applied this session

Ported the dashboard's design: course-filter pills + status-filter pills (All/To Do/Submitted/Graded/Missing) + This Week/Next Week/Later/Past grouping, adapted to the 3-value status enum so every assignment has a home group regardless of status or missing due date. See git history / diff on `extension/components/pages/AssignmentsPage.tsx` for the result.
