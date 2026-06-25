# Scraper Notes — AI handoff log

---

## 2026-06-08 (FIXED — types clean) — Browser lifecycle: `disconnect()` → `close()` + universal `try/finally` + state machine expansion

**User report:** Refresh/scrape opens a separate browser/session instead of the one already signed in; tabs/windows stay open after failure; scrape often fails then shows stale data with no clear reason.

**Root causes found (in order of impact):**

1. **`browser.disconnect()` in Connect flows** — `connectAndScrapeSchoology` and `connectAndScrapeGmail` both ended with `browser.disconnect()`, which detaches Puppeteer but leaves Chrome running with `.school-browser-profile/` locked. The very next headless refresh calls `puppeteer.launch({ userDataDir: same profile })`. Chrome detects the directory is in use by the running headed instance and falls back to a temporary anonymous session — no Schoology/Gmail login → "No courses found" / 0 emails. This was the primary "opens a separate unsigned-in browser" complaint.

2. **No `try/finally` in headless scrapes** — `headlessScrapeSchoology` and `headlessScrapeGmail` both had `browser.close()` only at the very end (success path). Any throw from `runScrape` (e.g. "No courses found", "Got 0 emails") skipped `browser.close()` entirely. Zombie Chrome processes held the profile lock on the next refresh attempt → same unsigned-in session. `DevToolsActivePort` present in `.school-browser-profile/` confirmed a previous orphaned Chrome process.

3. **Overly aggressive `clearSession()`** — the headless login error handler called `clearSession()` for ANY exception (including transient Google 500s, network timeouts), forcing full re-login. Fixed to only clear session when the error message confirms we're stuck on an auth/sign-in page.

4. **Dead code** — `runScrape` had an unreachable second `courses.length === 0` check (the first already threw). Removed.

5. **State machine gaps** — `ScrapeStatus` only had `idle|opening_browser|waiting_login|scraping|done|error`. Added `checkingSession|parsing|saving`. `TargetState` was missing `lastSuccess`/`lastFailed` timestamps. Added both.

6. **Activity debug HTML always written** — `scrapeActivity` wrote `activity-debug.html` on every run regardless of result. Fixed to only write on empty-result failures.

7. **Gmail zero-email guard incomplete** — old check `prevCount > 5` let 0-email results overwrite small caches. Added an explicit `emails.length === 0 && prevCount > 0` guard that throws and saves debug HTML before refusing to overwrite.

**Changes:**
- `lib/scraper/scrape-schoology.ts`: `disconnect()` → `close()` in `connectAndScrapeSchoology`; outer `try/finally { browser.close() }` in both headless and connect flows; page acquisition moved inside try; smarter session clearing; `onStatus` passed into `runScrape`; `parsing`/`saving` phase reporting; dead code removed.
- `lib/scraper/scrape-gmail.ts`: same structural fixes; zero-email guard hardened; `parsing`/`saving` phases added.
- `lib/scraper/scrape-activity.ts`: debug HTML only on empty results.
- `lib/scraper/state.ts`: expanded `ScrapeStatus` type; added `lastSuccess`/`lastFailed` to `TargetState`; `isBusy()` now includes all active phases.
- `app/api/scrape/route.ts`: `lastSuccess`/`lastFailed` written on success/failure; exposed in status payload; timestamped log lines.
- `lib/scraper/scheduler.ts`: same `lastSuccess`/`lastFailed` tracking.
- `components/layout/scrape-status-bar.tsx`, `components/layout/topbar.tsx`, `components/settings/settings-client.tsx`: BUSY phase sets updated; topbar keeps old `lastUpdated` on failure (doesn't pretend fresh data landed); settings shows granular phase labels (Checking session… / Parsing data… / Saving data…).

**Type check:** `npx tsc --noEmit` — no output (clean).

**Watch for:** If a future Connect or Refresh opens Chrome, completes scraping, and THEN `browser.close()` throws (e.g. Chrome was already killed externally), the error is caught and logged but the scrape result is still treated as successful — this is intentional since the data was already written to disk before `finally` ran.

---

Running log of changes/improvements to the Schoology + Gmail scrapers, written
so a future Claude session can pick up context without re-deriving it from
scratch. **Newest entries on top.** Each entry: what changed, why, current
status, what to verify/watch next.

---

## 2026-06-07 (DONE) — "Recently Updated" no longer duplicates overdue items that now also live in "To Do"

**User observation:** "they are stikk in the recenlty updated tab though as long
as the to do list" — direct follow-up to the merge fix just below: once
"Testing Lockdown Browser" (and "Interro de vocabulaire…") started correctly
appearing in "Needs Attention"/"To Do", the user noticed they were now showing
in **both** "Recently Updated" *and* "To Do" — duplicated.

**Why:** `RecentUpdates` (`components/overview/recent-updates.tsx`) renders
every item from `/api/activity` regardless of type, including `type: 'missing'`
/ `'late'` — the same OVERDUE-widget items that the previous fix now also feeds
into the "To Do" merge. So a 289-day-overdue item shows up as "recent activity"
*and* as something needing attention — confusing, and not really "recently
updated" in any meaningful sense (it hasn't changed in months).

**Fix:** filter `missing`/`late` items out of the `RecentUpdates` feed display
— added `feedItems = items.filter(item => item.type !== 'missing' && item.type
!== 'late')` and used it for both the empty-state check and the rendered list.
The underlying `/api/activity` data and `ActivityItem[]` are untouched (the
Overview merge logic still needs `type === 'missing'` items to populate "To
Do") — this is purely a display-layer dedup so each panel shows what it's
actually for: "Recently Updated" = genuinely recent activity (graded work,
upcoming events); "To Do" = the canonical, non-duplicated home for
missing/overdue work. Type-checks clean (`npx tsc --noEmit` — no output).

**Watch for:** if Schoology's "Recently Completed" widget is empty on a given
scrape (it was the only populated source besides OVERDUE in the last run — no
"Upcoming Events" came through), "Recently Updated" could end up looking sparse
or empty even though the activity feed technically has 12 items (10 graded + 2
missing, the missing ones now hidden here by design). That's expected, not a
bug — but worth knowing if a future session sees a "No recent activity" empty
state and assumes the scraper broke again.

---

## 2026-06-07 (DONE — live-verified) — "Hella overdue" items from courses outside the gradebook (e.g. orientation pseudo-courses) now show up in Overview's "Needs Attention"/"To Do" list too, not just buried in the activity feed

**User question:** "shouldnt the ones that are hella overdue be in the needs
attention place" — direct follow-up to the "Recently Updated" fix just below:
the user noticed "Testing Lockdown Browser — 289 days overdue" appearing in
Recently Updated but **not** in the "Needs Attention"/"To Do" panel, and
correctly flagged that as inconsistent.

**Why it was missing from "Needs Attention":** That panel's list
(`overview-client.tsx` → `MissingSection`) is built *only* from
`semester.courses` — i.e. the gradebook scrape. And `scrapeAllCourses`
deliberately `SKIP`s courses matching
`/hub|counseling|tutorial|advisees?|basics\s+for\s+students/i` (orientation/
admin pseudo-courses with no real grade — keeps the gradebook/grade-graph
clean). "Schoology Basics for Students" matches that filter, so its
assignments — including a 289-days-overdue "Testing Lockdown Browser" task —
never reach `schoology-data.json` at all, and therefore never reach
`missingItems`/`missingCount`. Meanwhile the *home-page* "OVERDUE" widget
(scraped independently for "Recently Updated", see entry below) is
unfiltered and surfaced it just fine — hence the inconsistency the user spotted.

**Fix — merge in the unfiltered source rather than widen the gradebook filter**
(keeping "Basics for Students" out of the gradebook/grade-graph is still
correct; it's the *missing-detection* that needed to be broader):
1. `lib/scraper/scrape-activity.ts` — added `dueTimestamp?: number` to
   `ActivityItem`, captured from Schoology's `data-start` attribute (a Unix
   timestamp in *seconds* on each `.upcoming-event` element — confirmed live:
   `data-start="1755928800"` ↔ tooltip "due on Friday, August 22, 2025 at
   11:00 pm"). The visible "N days overdue" string can't be sorted/compared
   against the gradebook's ISO due dates; this real timestamp can.
2. `components/overview/missing-section.tsx` — generalized `MissingItem` from
   a rigid `{ assignment: Assignment; course: Course }` pair to a flat
   `{ id, name, status, dueDate, courseName, courseColor }` shape, so items
   can come from *either* the gradebook scrape or the activity feed.
3. `components/overview/overview-client.tsx` — now also fetches `/api/activity`
   and merges in any `type: 'missing'` activity item whose `courseName`
   doesn't match an existing gradebook course (case-insensitive — prevents
   double-counting things like "Interro de vocabulaire et exprimons-nous 6.1",
   which both scrapes independently catch for French 1). Extra items get a
   neutral `var(--color-muted)` dot (visually marking "not a graded class").
   The merged list is now **sorted by due date ascending — most overdue
   first** (it wasn't sorted at all before). `missingCount`/`lateCount` and
   the `AnalyticsStrip` "Alerts" stat are derived from this same merged list
   now too, so the whole Overview page agrees on one number instead of two
   silently-different ones.

**Live-verified:** `/api/activity` confirms `dueTimestamp: 1755928800000` for
"Testing Lockdown Browser" (= 2025-08-23, matching the "289 days overdue"
tooltip exactly) and `1779218100000` for the French 1 item (correctly
excluded from the merge since "french 1" *is* a known gradebook course name —
no double-count). Merge simulation against live data produces exactly the
expected 7-item, oldest-first "Needs Attention" list: 6 French
1/Biology items from the gradebook (2026-04-01 → 2026-05-29) plus
"Testing Lockdown Browser" — except that one is so overdue (Aug 2025) it'll
actually sort to the *top*. Type-checks clean.

---

## 2026-06-07 (FIXED — live-verified) — Overview's "Recently Updated" section always showed "No recent activity": `extractActivity` was matching against generic activity-feed CSS classes that don't exist anywhere in the current Schoology theme — rewrote it against the home page's *real* widgets

**User question:** "what about recently updated" (follow-up to the missing-
assignment fix below — same instinct: "is this section actually working?").
Checked `data/activity-data.json`: `{ scrapedAt: …, items: [] }`. Confirmed
`/api/activity` → 0 items → `RecentUpdates` permanently rendering its empty
state ("No recent activity… Run a Schoology refresh in Settings…").

**Root cause:** `extractActivity` (`lib/scraper/scrape-activity.ts`) was
written against guessed-at generic selectors — `.s-activity-feed li`,
`.sgy-activity-item`, `.s-updates-list li`, generic `tr`/`.row` table-row
heuristics, etc. — **none of which exist in the actual rendered home page**.
Dumped+inspected the real DOM (`data/activity-debug.html` + a live headless
probe) and found Schoology's home page instead has three concrete, well-
structured widgets:
1. **"Recently Completed"** (`.recently-completed-list .recently-completed-event`,
   each with `.recently-completed-title a` + `.recently-completed-grade` +
   a tooltip `aria-label` like `"Biology - 3110 : GeeA p1 T2"` for the course)
   — **collapsed by default**, requires clicking
   `.recently-completed-list .refresh-button` to even exist in the DOM.
2. **"To Do" → "OVERDUE"** (`#overdue-submissions .upcoming-event.course-event`,
   each with `.event-title > a` + two `.event-subtitle` spans — one like
   `"19 days overdue"`, the other the course name e.g. `"French 1 - 4110"`)
3. **"Upcoming Events"** (`#upcoming-events .upcoming-list .upcoming-event`,
   same `.event-title`/`.event-subtitle` shape).

**Fix:** Replaced all three guess-based extraction strategies in
`extractActivity` with direct selectors against these three real widgets —
clicking the "Recently Completed" expand button first, then mapping:
Recently Completed → `type: 'graded'` (with score), OVERDUE →
`type: 'missing'` (with the "N days overdue" string as `dueDate`), Upcoming
Events → `type: 'upcoming'`. Added a `courseFromLabel()` helper to strip
Schoology's `"Course Name - 1234 : TeacherX p1 T2"` section-code suffix down
to a clean course name.

**Live-verified** (triggered a real Schoology refresh end-to-end —
`scrapeActivity` runs as part of `connectAndScrapeSchoology`/
`headlessScrapeSchoology`): went from **0 → 12 items** —
10 `graded` (e.g. "Spring Final Exam" — Biology — 99, "2nd Semester Final" —
Algebra 2/Trig — 44) and 2 `missing` ("Testing Lockdown Browser" — 289 days
overdue, "Interro de vocabulaire et exprimons-nous 6.1" — 19 days overdue —
this second one is the same French 1 assignment the grades-page fix above
also caught, from a completely independent data source — good cross-check).
`/api/activity` now returns these 12 items; Overview's "Recently Updated"
section will render them instead of the empty state. Type-checks clean.

**Watch for:** "Upcoming Events" was empty at scrape time (no items currently
due soon), so that path is implemented but untested against real data — if it
ever renders 0 items going forward despite Schoology showing upcoming work,
re-probe `#upcoming-events .upcoming-list` for a possible markup difference
from the OVERDUE widget (they're visually similar but may not be identical).

---

## 2026-06-07 (FIXED — live-verified) — "Missing"/incomplete-assignment detection was silently broken: `mapStatus` in `app/api/grades/route.ts` always classified unsubmitted-but-overdue work as "normal", so Overview's Missing badge, the To-Do/Missing section, and the Assignments "Missing" filter all showed **zero** even though the user had real overdue work

**User report:** "its not really checking for incomplete assignments and stuff
like that" — the Overview chip said "Nothing overdue" / 0 missing, which
didn't match reality.

**Root cause — two heuristics stacked wrong:** `lib/scraper/scrape-schoology.ts`
*does* correctly tag each assignment's scraped `status` as
`'graded' | 'submitted' | 'unsubmitted'` (based on `.rounded-grade` /
`.grade-pending-icon` / `.has-dropbox-icon`). But the frontend transform
(`mapStatus` in `app/api/grades/route.ts`) re-derives its own `'missing'`
verdict, and it had an early-return guard:
```js
// Items with no max points can't meaningfully be "missing" (extra credit, participation, etc.)
if (!hasScore && (maxStr === '' || isNaN(maxVal) || maxVal === 0)) return 'normal'
```
…which ran **before** the `if (sa.status === 'unsubmitted') {…}` branch that
would otherwise mark overdue work as `'missing'`. I confirmed live (dumped
real row HTML via a one-off puppeteer script against the grades page) that
**Schoology never renders a `.max-grade` element for ungraded work at all** —
the grade cell is just `<span class="no-grade">—</span>` with no sibling
max-grade span. So `maxGrade` scrapes as `''` for *every single* unsubmitted
assignment, the "no max points → can't be missing" guard fired first for all
of them, and the `unsubmitted` branch — and therefore all "missing" detection
— was unreachable dead code in practice. Confirmed: `data/schoology-data.json`
had 7 `status: 'unsubmitted'` assignments (several clearly overdue, e.g.
"Projet Final: Au cafe" due 5/27/26, "let LERN vocabulaire 5.1" due 4/01/26),
but `analytics.missingCount` computed to **0**.

**Fix** (`app/api/grades/route.ts`, `mapStatus`): moved the
`sa.status === 'unsubmitted'` check to run *first* (right after the definitive
`submitted`/`graded` checks) so it's evaluated on its own terms — trusting the
scraper's classification + due-date comparison directly, with no dependency on
`maxGrade` (which structurally cannot be present for these). The maxGrade-based
"extra credit / can't be missing" heuristic now only applies as a fallback for
assignments with *no* definitive scraped status.

**Live-verified via `GET /api/grades`:** `analytics.missingCount` went from
**0 → 6** (the 7th unsubmitted item, "Travail en class du lundi: GC 2022", has
no scraped due date at all, so it correctly stays `'normal'` — there's no way
to know if it's overdue). The 6 now correctly flagged:
- Biology — "CHS Tutoring Center extra credit" (due 2026-05-29)
- French 1 — "Projet Final: Au cafe" (2026-05-27), "let LERN vocabulaire 5.1"
  (2026-04-01), "let LEARN" (2026-05-11), "Interro de vocabulaire et
  exprimons-nous 6.1" (2026-05-19), "let LEARN 6.2" (2026-05-20)

This will now correctly populate the Overview "Missing" badge/chip-zone alert,
the `MissingSection`/To-Do panel, and the Assignments page "Missing" filter.
Type-checks clean (`npx tsc --noEmit -p tsconfig.json`).

**Watch for:** "CHS Tutoring Center extra credit" is now flagged missing —
it genuinely is unsubmitted past its listed due date per Schoology's own data,
so this is *more* correct than silently hiding it, but if the user says it
shouldn't count (e.g. truly-optional extra credit that Schoology itself
doesn't chase), a name-based exclusion (`/extra credit/i`) would be a
reasonable follow-up filter — there's no structural signal in the scraped data
to distinguish "optional" from "required" unsubmitted work.

---

## 2026-06-07 (DONE — live-verified, no user action needed) — Migrated the in-app scraper off cookie-replay onto the same persistent-profile + SSO system the CLI scrapers use; also hardened Gmail pagination (user reported "only 45 emails, I had ~93")

**This supersedes the entry directly below.** Patching the substring-match bugs
there fixed the symptom, but the *architecture* — snapshot cookies once,
replay them into a brand-new headless Chrome every run — is exactly what
Google now silently rejects. Rather than wait for it to break a third time,
the whole in-app system (`lib/scraper/sessions.ts`,
`scrape-{schoology,gmail,activity}.ts`) was ported onto the **same durable
persistent-Chrome-profile + Keychain + `loginViaSSO`** approach that
`scripts/scrape-*.mjs` (the CLI tools) already proved out:

- **`lib/scraper/sessions.ts`** — completely rewritten from a per-target
  cookie-jar into a thin shim over `scripts/lib/browser-profile.mjs`:
  `hasSession`/`markSession`/`clearSession`/`launchBrowser` now all delegate to
  `hasSavedSession`/`markSessionOk`/unlinking `SESSION_MARKER`/
  `launchSchoolBrowser`. Schoology and Gmail run through Google SSO on the
  *same* Google account, so they share **one** underlying session — `target`
  is accepted but ignored, kept only so call sites didn't need reshaping.
- **`scrape-schoology.ts` / `scrape-gmail.ts` / `scrape-activity.ts`** —
  `connectAndScrape*`/`headlessScrape*` now call `loginViaSSO(page, …)`
  instead of doing manual cookie load/save. `loginViaSSO` short-circuits
  almost instantly when the persistent profile already has a valid session
  (the normal steady state), and falls back to full SSO automation
  (school search → account chooser → Keychain password) on a cold profile.
- **Gmail pagination hardened** — old code grabbed at most 2 pages (~100 raw,
  capped well under a real inbox). New loop in `runScrape` clicks "Older" up
  to 6 times, stopping as soon as a page brings back zero emails not already
  seen (true end-of-inbox / list wraparound), so it now captures the *whole*
  inbox rather than an arbitrary prefix of it.

**Live verification (triggered for real — scheduler's 10s-after-startup
auto-scrape for Gmail, and a manual `POST /api/scrape {action:'refresh',
target:'schoology'}` for Schoology — both ran through the brand-new code path
with zero errors and *no* "Connect" click from the user):**
```
[scheduler] auto-scraping gmail...
[gmail] schoology context: 6 teachers, 6 courses
[gmail] page 1: 50 emails
[gmail] page 2: 100 rows, 50 new
[gmail] deduped: 100 → 93 emails
...
[schoology] parsing grades page…
[schoology] found 6 courses, period="25-26 T2Grading Period"
[schoology] saved 6 courses
```
`data/emails-cache.json` confirms 93 emails written with a fresh `fetchedAt`;
`data/schoology-data.json` confirms 6 courses with a fresh `scrapedAt`.

**Resolves the user's "only got 45, I had 93" concern:** with the hardened
pagination, the scrape consistently lands on **93** — matching the user's own
count exactly. There's no remaining code path that would cap it lower; "45"
was most likely a rough/half-remembered number from a stale or partial run
under the old (max-2-pages) code, not a reproducible bug in the new one.

**Why it "just worked" with no Connect click:** the persistent profile
(`.school-browser-profile/`) already had a valid, working Google session —
seeded earlier the same day by `npm run scrape:schoology` runs (its session
marker `.school-browser-profile/.last-login-ok` was already present, dated
`2026-06-07T18:18:57Z`). `loginViaSSO` detected the existing session and
reused it instantly. **The "Needs user action: click Connect" guidance in the
entry below is now stale/obsolete** — that requirement only existed because
the *old* cookie-replay system had no way to recover from a stale session
except a fresh manual login; the new persistent-profile system shares its
session with the CLI scrapers and self-heals the same way they do.

**Status:** Done, verified live end-to-end for both Schoology and Gmail, no
user action required. Type-checks clean (`npx tsc --noEmit -p tsconfig.json`).

**Watch for:** Since Schoology and Gmail now share one session, if that
session ever needs a fresh login (e.g. Google forces a re-auth), *both* will
need it — Settings should surface "Connect" for both at once in that case,
not just one. If the eventual fresh-login flow fails headless/automated (bot
detection), the same fallback as the CLI scripts applies: fall back to a
visible window for one manual human login, which then seeds the shared
profile for everything (in-app *and* CLI) going forward.

---

## 2026-06-07 (FIXED — needs user action) — In-app "Refresh"/"Sync now" was failing for both Schoology and Gmail with misleading errors; both now need a fresh manual Connect

**Context — there are TWO completely separate scraper systems in this repo:**
1. `scripts/scrape-*.mjs` (CLI, `npm run scrape:schoology` / `scrape:gmail`) —
   uses a **persistent Chrome profile** (`.school-browser-profile/`) + Keychain
   credentials + full SSO automation. This is the one fixed/proven earlier
   today (see entries below) — it works great via session reuse.
2. **The in-app Settings "Connect" / "Sync now" buttons** (→ `POST /api/scrape`
   → `lib/scraper/scrape-{schoology,gmail}.ts`) — a totally different,
   independent system: it snapshots cookies into `data/{target}-session.json`
   after a one-time *manual* headed-browser login, then replays those cookies
   into a fresh headless Chrome on every "Sync now"/refresh. **No SSO
   automation, no shared profile** — `lib/scraper/sessions.ts` is its own
   small cookie-jar implementation.

**What happened:** The user asked to wire the Overview topbar's "Refresh"
button (previously a pure cosmetic demo toggle — see `DEMO_TIMESTAMPS` /
"Demo Refresh States" dropdown in `topbar.tsx`) up to actually trigger real
syncs for **both** Schoology and Gmail at once. While testing, the user hit
"error — nothing found" from Settings' Schoology "Sync now" with no visible
browser window opening.

**What I found, in order:**

1. **Wired up the real combined refresh** — `topbar.tsx`'s `handleRefresh` now
   `POST`s `{action:'refresh'}` to `/api/scrape` for *both* `schoology` and
   `gmail` in parallel, polls `GET /api/scrape` until both leave
   `opening_browser`/`waiting_login`/`scraping`, then sets the real
   `refreshState` (`fresh`/`failed`)+`lastUpdated`, and calls
   `refreshGradesCache()` on success. Button shows a spinning icon + "Syncing…"
   while in flight. (The "Demo Refresh States" dropdown is left in place — it's
   clearly labeled as a demo and harmless.)

2. **Schoology session was stale, but the error said "No courses found on
   grades page"** — actively misleading. Root cause:
   `headlessScrapeSchoology`'s expiry check only matched URLs containing
   `/login`, `/oauth`, or `/saml`. A *rejected* session cookie actually sends
   the page through Schoology's SSO chain to a fresh
   **`accounts.google.com/v3/signin/...`** page — which matches none of those
   substrings — so the stale-session branch never fired, the scraper happily
   tried to parse a Google sign-in page as a grades page, found 0 courses, and
   threw the generic "No courses found" error instead.
   **Fix** (`lib/scraper/scrape-schoology.ts`, `headlessScrapeSchoology`):
   check the actual `hostname` (must end in `schoology.com`) instead of
   substring-matching the URL, and on mismatch `clearSession('schoology')` +
   throw `'Session expired — click Connect to sign in again'`.

3. **Gmail had the exact same class of bug, just better hidden** — its check
   was `!page.url().includes('mail.google.com')`. A rejected Gmail session
   cookie redirects to **`accounts.google.com/v3/signin/...?continue=https://mail.google.com/...`**
   — and that `continue=` query param contains the substring `mail.google.com`,
   so the check passed even though the page was a Google sign-in form (visually
   confirmed via `data/gmail-debug.png` — title says "Gmail" because Google
   shows the destination app name on its sign-in interstitial, but
   `<base href="https://accounts.google.com/v3/signin/">`). Result: tried to
   scrape 0 rows from a login page, threw "Only got 0 emails (had 93) — keeping
   old data" — also misleading.
   **Fix** (`lib/scraper/scrape-gmail.ts`, `headlessScrapeGmail`): same
   pattern — check `new URL(page.url()).hostname !== 'mail.google.com'`,
   `clearSession('gmail')`, throw `'Session expired — click Connect to sign in
   again'`. Also added a `page.waitForSelector('tr.zA, tr[role="row"]')` before
   scraping (Gmail's a heavy SPA — `networkidle2` can fire before any inbox
   rows render) and a debug HTML+screenshot dump to `data/gmail-debug.{html,png}`
   on a 0-email result, mirroring the existing Schoology debug-dump pattern.

**Why both went stale at once / why "didn't open up everything":** This
in-app system replays a frozen cookie snapshot from a one-time manual login
into a *fresh* headless Chrome instance every run — no persistent profile, no
fingerprint continuity. Google evidently now rejects that and forces a fresh
sign-in. Because `headlessScrapeSchoology`/`headlessScrapeGmail` always launch
**headless** (`launchBrowser(true)`), the user never sees a window — it just
silently fails in the background. The only way to get a visible login window
is the **"Connect"** button (`connectAndScrapeSchoology`/`connectAndScrapeGmail`,
`launchBrowser(false)`) — but that button only appears once `connected` is
`false`, and `connected` was derived from `hasSession()` (file-existence,
not validity), so the stale-but-present session files kept the UI stuck
showing "Connected"+"Sync now" with no way back to "Connect" short of manually
clicking "Disconnect" first.

**Status:** Both fixes ship correct, actionable error messages now AND
self-heal the stuck-UI problem — `clearSession()` on detected staleness means
`hasSession()` now returns `false`, so Settings will show **"Connect"** (which
opens a real, visible browser window) for both Schoology and Gmail. Verified
live: `GET /api/scrape` now reports
`schoology.connected: false, error: "Session expired — click Connect to sign
in again"` and the same for `gmail`.

**Needs user action:** Go to Settings → click **"Connect"** for Schoology,
then for Gmail — each opens a visible Chrome window; log in normally in each,
and a fresh session gets snapshotted. After that, "Sync now"/the topbar
"Refresh" should work headlessly again (until Google invalidates the cookies
again — if this recurs often, it may be worth porting this system onto the
same persistent-profile approach the CLI scrapers use, since that one has
proven far more durable against Google's session/bot-detection behavior).

**Watch for:** If "Connect" *also* fails to reach the inbox/grades page (e.g.
Google bot-detection blocks the fresh headless-adjacent login flow the same
way it blocked the CLI script's first automated attempts — see the
"bot-detection" entries below), the fix there was the same: a real human
manually completing one login in a real window seeds the session past Google's
fingerprint checks.

---

## 2026-06-07 (FIXED) — Duplicate-category bug: every course had each category listed twice (one empty)

**What:** Every course in `data/schoology-data.json` had each grading category
appear *twice* — once populated, once with 0 assignments (e.g. Biology showed
"Classwork/Homework", "Tests/Quizzes", "Participation", "Semester Final" each
listed twice). Confirmed across all 6 courses.

**Root cause:** Schoology's grades page renders each course's grade tree as a
flat list of `.report-row` elements, but it actually contains *two*
`period-row` sections: the real "25-26 T2" period (visible, populated) **and**
a "(no grading period)" placeholder section that re-lists the exact same
category names with zero assignments — marked with the `hidden` CSS class.
`scrapeAllCourses`'s row-walking loop (`courseDiv.querySelectorAll('.report-row')`)
matched both sections indiscriminately, so every category got pushed twice:
once from the real period, once empty from the hidden placeholder.

**This was not a new bug** — it lives in the original "proven" parser
(`lib/scraper/scrape-schoology.ts::scrapeAllCourses`), which the new autonomous
script's loop was ported from verbatim. It's been present since before this
session; the dashboard has likely been silently rendering duplicate empty
category cards/headers all along (no dedup logic exists anywhere downstream —
checked `gradebook.tsx`, `course-detail.tsx`, `grade-calculator.tsx`).

**Fix:** Added a guard at the top of the row-walking `forEach` in *both*
`scrapeAllCourses` implementations — skip any `.report-row` carrying the
`hidden` class:
```js
if (cl.contains('hidden')) return  // skip the "(no grading period)" placeholder section
```
Files: `scripts/scrape-schoology.mjs` and `lib/scraper/scrape-schoology.ts`.

Also one-time-cleaned the already-saved `data/schoology-data.json` (and its
embedded `_previousCourses` backup) by deduping in place — for each
`name+weight` pair, kept whichever copy actually had assignments. New counts:
Algebra 2/Trig 2, Biology 4, Drama 3, French 1 5, Lit/Writ 5, PE 9 3 categories
(previously double each of those).

**Status:** Fixed in both scrapers' source and in the live data file. Future
scrapes will come out clean without needing this manual cleanup step.

**Watch for:** If Schoology ever marks the *real* (non-placeholder) period or
category rows with a `hidden` class for some other reason (e.g. a collapsed
section in the live UI), this guard would wrongly drop them too. So far the
only observed `hidden` usage on `.report-row` is this placeholder section —
but if a future scrape comes back with *fewer* categories than expected,
check `data/_debug/grades-list.html` for `hidden` on rows that should count.

---

## 2026-06-07 (FIXED — verified end-to-end) — Ported the real selectors + fixed a session-shortcut bug; clean run confirmed

Acted on the "next steps" from the entry below. Three changes to
`scripts/scrape-schoology.mjs` / `scripts/lib/schoology-login.mjs`, then
**ran it live and it came out perfect**:

1. **Replaced `scrapeCourseList`/`scrapeCourseDetail` (generic guesswork) with
   a single `scrapeAllCourses`**, ported directly from the proven
   `lib/scraper/scrape-schoology.ts::scrapeAllCourses` — same selectors
   (`.gradebook-course`, `.gradebook-course-title`, `.report-row` with
   `period-row`/`category-row`/`item-row`, `.alpha-grade`, `.rounded-grade`,
   `.max-grade`, `.due-date`, `.percentage-contrib`), same name-cleaning
   regexes, same single-page-load approach (parses everything from
   `/grades/grades` directly — no more visiting each course's detail page in a
   loop, which is also just faster). Verified every one of those class names
   exists in the actual fetched HTML before porting (`grep`'d
   `data/_debug/grades-list.html`)
2. **Rewrote `scrapeOverdue`** with precise selectors instead of "any link near
   the word overdue": each item is `#overdue-submissions .upcoming-event`,
   containing `.event-title a` (name + link), two `.event-subtitle` spans
   ("N days overdue" / course name), and `.submission-infotip .infotip-content`
   ("This was due on ..."). Confirmed structure by inspecting
   `data/_debug/home-todo.html` from the actual failed run
3. **Fixed a session-detection bug in `schoology-login.mjs`**: when the
   persistent profile already has a valid Schoology session, clicking through
   "SSO Login → school → Log in" doesn't go to Google at all — Schoology
   recognizes the cookie and bounces straight back to its own dashboard. The
   old code only waited for `hostname.includes("google.com")`, so it just sat
   there for the full 20s timeout on an already-logged-in `Home | Schoology`
   page (confirmed via `data/_debug/login-failure.html`'s `<title>`). Now it
   waits for *either* Google or "back on schoology.com, not /login", and short-
   circuits with `"Already had a valid Schoology session — skipped the Google
   handshake entirely"` when it's the latter
4. Also added a **quality guard** in `main()`: if any parsed course name still
   ends in `assignment`/`discussion`/`test-quiz`/`quiz` (the tell that
   selectors matched the wrong DOM level, exactly like the garbage from the
   prior run), it refuses to save and keeps the old data — quantity checks
   alone can't catch "more rows, but they're nonsense"

**Live verification** (`npm run scrape:schoology`, headless, fully unattended):
```
→ Already had a valid Schoology session — skipped the Google handshake entirely.
Found 6 course(s), grading period "25-26 T2Grading Period".
  - Algebra 2/Trig  A (97.44%)  (4 categories — StubbsA)
  - Biology  A (96.74%)  (8 categories — GeeA)
  - Drama  A (94.00%)  (6 categories — ConradA)
  - French 1  A+ (97.96%)  (10 categories — AggounI)
  - Lit/Writ  A (95.28%)  (10 categories — MorganK)
  - PE 9  A (94.42%)  (6 categories — BorgesJ)
Found 2 overdue item(s).
✓ Saved to data/schoology-data.json
```
Overdue items came out clean and structured (name, courseName, overdueBy,
dueDate, href) — no more giant text blobs. Restarted the dev server; `/api/grades`
serving real data at http://localhost:3000.

**Status: this scraper is now fully working, end to end, unattended.** Login
reuses the saved session (no Google interaction in the steady state — so no
bot-detection exposure either), parsing matches the proven selectors, overdue
items are clean, and bad data can't silently overwrite good data anymore.
Nothing known to be broken as of this writing.

---

## 2026-06-07 (live run #2) — Login succeeded this time, but parsing wrecked the saved data — restored from the built-in backup

User ran `npm run scrape:schoology` from a real terminal per the plan above —
**and login worked**: no manual intervention needed, it logged in cleanly on
its own (so either the bot-detection was a one-off, or the freshly-seeded
session from the `firstRun` flow carried it through; either way, login is no
longer the open question).

But the **parsing half is exactly as broken as the "known gap" note predicted**,
and it actively damaged the data on disk:

- `courses` came back with 8 entries, and they're not courses at all — they're
  **assignment names** misidentified as courses: `"Test Ch 10assignment"`,
  `"1.1 2nd Semester Goalsassignment"`, `"My Four-Year Planassignment"`,
  `"A Midsummer Night's Dream Reflectiondiscussion"`, etc. (`scrapeCourseList`'s
  generic fallback strategies are matching the wrong DOM level)
- `overdue` came back with garbage too — one entry has `name: "Skip to Content"`
  and a `context` field containing **the entire page's text concatenated into
  one string** (nav menu, full course list, the To-Do panel, footer links, even
  a raw JSON i18n config blob). `scrapeOverdue`'s `a.closest('li, div')`
  heuristic matched some huge ancestor container instead of a list-item-sized
  block
- Because `detailed.length` (8) was *greater* than the previous course count
  (6), the "only save if we got at least as much as before" guard
  (`scrape-schoology.mjs` ~line 289) didn't catch it — it happily overwrote the
  good `data/schoology-data.json` with this garbage. **That guard checks
  quantity, not quality — it can't detect "more rows, but they're nonsense."**

**Saved by the existing `_previousCourses` backup field**: the script stashes
`existing?.courses` into the new file before overwriting, so the real 6-course
data (with full categories/scores/due-dates) was recoverable. Restored it by
hand: rebuilt `data/schoology-data.json` from `_previousCourses` plus the
original `gradingPeriod` (`"25-26 T2Grading Period"`) and `scrapedAt`
(`1780743263927`, i.e. 2026-06-06 03:54 — still the last *good* scrape).
Dashboard should be back to normal; refresh to confirm.

**Bottom line / next steps for whoever picks this up**:
1. **Login is solved** — don't spend more time on `schoology-login.mjs`: it works
2. **Parsing is the real remaining problem.** `scrapeCourseList`/
   `scrapeCourseDetail`/`scrapeOverdue` in `scrape-schoology.mjs` need to be
   replaced with the *actual* tuned selectors from
   `lib/scraper/scrape-schoology.ts` (`.gradebook-course`,
   `.gradebook-course-title`, `.report-row`, `.category-row`, `.period-row`,
   `.alpha-grade`, `.rounded-grade` — see that file's `scrapeAllCourses`,
   ~line 40+) rather than the generic best-effort fallbacks currently there.
   Debug HTML from this exact run is sitting in `data/_debug/grades-list.html`
   and `data/_debug/course-*.html` — perfect raw material for verifying the
   ported selectors actually match
3. **Tighten the save-guard** (~line 289): "don't overwrite if we got fewer
   courses than before" isn't enough — also sanity-check that course names
   don't look like assignment titles (e.g. reject names ending in
   `assignment`/`discussion`/`test-quiz`, the same suffix-stripping `cleanName`
   already does in `app/api/grades/route.ts`), and that `overdue[].context`
   isn't suspiciously long (a multi-KB string is obviously not a "due Friday"
   blurb)


Fixed the bug flagged twice below: `scrape-schoology.mjs` was calling
`markSessionOk()` unconditionally right after the login try/catch, even when
the catch's manual fallback was skipped (no TTY) and the page was still sitting
on a login wall. Now it checks `page.url()` — only marks the session OK (and
only proceeds to scrape) if the page is actually on `*.schoology.com` and not
on `/login`; otherwise it logs where it's stuck, closes the browser, and exits
cleanly without touching `data/schoology-data.json`.

Also deleted the stale `.school-browser-profile/.last-login-ok` marker that an
earlier failed run had wrongly written — it was lying about having a working
session, which would've made the *next* run wrongly skip straight to headless
mode (and immediately fail again, since the profile was never actually
authenticated). Removing it resets `hasSavedSession()` to `false`, so the next
run takes the `firstRun` path and opens a **visible** window from the start —
exactly what's needed for a human to do the one-time manual login described in
the entry above ("Confirmed: it's bot detection... and there's an easy way
around it").

**Important — this manual login must be run by the user directly, not via a
tool/agent shell**: `ask()` checks `process.stdin.isTTY` and skips the prompt
immediately when there's no real terminal attached (by design, so it doesn't
hang forever in headless/LaunchAgent contexts). Run through a tool-mediated
shell, the visible browser would pop up and then get yanked away before there's
time to click through it. Run `npm run scrape:schoology` from an actual
terminal — then the prompt will really wait for Enter, the visible window stays
open long enough to log in, and the resulting session gets saved into
`.school-browser-profile/` for all future headless runs to reuse.

There are two parallel scraper code paths — keep both in mind:
- `lib/scraper/scrape-schoology.ts` — original module, used by `app/api/grades/route.ts`
  (what the app actually reads). Has precise, tuned DOM selectors.
- `scripts/scrape-schoology.mjs` + `scripts/lib/*` — standalone "autonomous edition"
  CLI script with full Google-SSO login automation, run via `npm run scrape:schoology`.

---

## 2026-06-07 (resolved) — Confirmed: it's bot detection, not a Google outage — and there's an easy way around it

User tried a normal manual sign-in (regular Chrome, same account, right after the
live-test failure below) — **sailed through, no errors at all**. That settles
the open question from the entry below: the Google 500s are **Google's
bot-detection responding to the Puppeteer-driven browser**, not a backend
outage. Two failures at two different OAuth steps, only during automated runs,
zero issues manually — that's a fingerprint-based block, and Google returns
generic errors on purpose so automated clients can't tell they've been flagged.

**The good news — this barely matters in practice.** Re-read `runSsoFlow`
(`schoology-login.mjs`, top of the function, ~line 165-174): the *very first*
thing it does is check whether Schoology already redirected away from `/login`
— i.e. whether the persistent profile (`.school-browser-profile/`) already
holds a valid session cookie-wise — and if so it returns **immediately**,
logging `"Already signed in (session reused)"`, without going anywhere near
Google's sign-in. The whole bot-detection-prone SSO dance only fires on a cold
profile or after the saved session expires. It is not something that needs to
work on every run — only occasionally, as a recovery path.

**Recommended path forward (don't keep re-running automated SSO — it'll keep
tripping the same detection):**
1. Do **one** manual login through the persistent profile to seed it with a
   real, cookie-backed session — run with `headed: true` (the natural
   `firstRun` path) or use `scripts/debug-sso-login.mjs`, and just click
   through by hand once
2. After that, headless runs should hit the early "already signed in" branch
   and skip Google's sign-in entirely in steady state — no bot detection in
   the loop at all
3. **Fix `markSessionOk()` first** (still unconditional as of this writing —
   see the bug noted in the entry below) so it only stamps the session as OK
   after a *verified* successful login, not after a failed attempt that leaves
   the profile sessionless. As-is it'll keep lying to `hasSavedSession()` and
   the script will keep assuming it's good when it isn't
4. If/when the saved session does expire and automated SSO has to run again,
   expect an occasional flag — that's an inherent cost of automating Google
   sign-in, not a defect in this script. `puppeteer-extra-plugin-stealth` could
   reduce the hit rate if cold-starts become frequent enough to matter, but
   it's extra complexity that probably isn't worth it for something that should
   run rarely

---

## 2026-06-07 (live test) — Ran it: SSO logic looks right, Google's backend is what's failing

Actually ran `npm run scrape:schoology` live (rather than just reading old debug
dumps) to validate the autonomous login end to end. Findings:

- The flow got **further** than the static evidence below suggested: it
  correctly detected "no saved-account chooser," typed the email, pulled the
  password from Keychain, typed it, and submitted — the email/password
  automation path is exercised and works as written
- It then hung the full 30s waiting to land back on Schoology, "stuck at"
  `accounts.google.com/v3/signin/challenge/pwd?...`
- The captured failure screenshot (`data/_debug/login-failure.png`) shows
  **Google's own `Error 500 — That's an error` page** — Google's sign-in
  backend itself 500'd mid-handshake, right after the password was submitted.
  Not a stale selector, not a wrong password, not a script bug
- This is the **second distinct 500** seen today at two *different* points in
  the flow (10:21 run: errored before/around picking the account; this run:
  errored right after the password submit) — strong signal of transient
  flakiness on Google's end, not something wrong with `schoology-login.mjs`
- Confirmed live: `markSessionOk()` is still called unconditionally after this
  failure (the bug noted below stands — it just wrote a fresh "session ok"
  timestamp despite never reaching Schoology)
- Confirmed live: `ask()` correctly detected no TTY
  (`process.stdin.isTTY` false when run through a tool/non-interactive shell)
  and skipped the manual fallback rather than hanging — working as designed,
  just means nobody was there to click through manually

**Verdict**: don't spend more time second-guessing the SSO selectors/flow logic
— what's been exercised (school search → account-chooser detection → email
entry → Keychain password entry → submit) all worked correctly. The blocker is
Google intermittently 500ing mid-OAuth-handshake, which the script can't do
anything about. **Next step is simply to retry** — rerun
`npm run scrape:schoology` again later (ideally with a real TTY attached, in
case the manual fallback is ever needed) and see if it clears the handshake
once Google stops erroring.

---

## 2026-06-07 — Autonomous Google SSO login for the standalone scraper

Built fully-automated login for `scripts/scrape-schoology.mjs` (previously needed a
human to log in by hand each run):

- `scripts/lib/keychain.mjs` — Google account password stored in macOS Keychain
  (service `better-schoology-sso`), never written to disk in plaintext
- `scripts/lib/browser-profile.mjs` — persistent Chrome profile at
  `.school-browser-profile/`, shared between the Schoology and Gmail scrapers so
  one login authenticates both. Launch flags suppress Chrome's native
  "restore pages?" / sign-in-intercept dialogs that would otherwise block automation
- `scripts/lib/schoology-login.mjs` — drives the full SSO handshake: Schoology
  login → "SSO Login" → search "Cupertino High School" → pick the FUHSD entry
  (school ID 2296357277) → Google account chooser → pick
  `sghosh265@student.fuhsd.org` → land back on `fuhsd.schoology.com`.
  Handles both the "saved session" path (click account, no password) and the
  "fresh profile" path (type email + Keychain password). Works around several
  Google quirks: synthetic clicks on "Next" are silently ignored (uses real
  `Enter` keypresses instead), execution contexts go stale mid-transition
  (retries with fresh element handles), account-chooser rows fail Puppeteer's
  bounding-box click check (dispatches raw mouse events instead).
  On failure, snapshots screenshot + HTML to `data/_debug/login-{label}.{png,html}`
- `scripts/debug-sso-login.mjs` — standalone diagnostic that screenshots every
  step of the login flow to `data/_debug/sso-steps/`

**Status — CORRECTED, was too optimistic above**: checked the actual debug
artifacts from the most recent runs (all today, 2026-06-07) and the automated
login is *not* completing yet:
- `data/schoology-debug.html`/`.png` (10:21, dumped by the **other**, TS-module
  scraper's failure path) — `<title>Sign in - Google Accounts</title>`: stuck on
  Google's sign-in form, never reached Schoology
- `data/_debug/login-failure.html`/`.png` (10:29, this script) — Google's own
  `Error 500` page mid-OAuth-handshake (transient, not a selector bug)
- `data/_debug/grades-list.html` (10:30, one minute later) —
  `<title>Log in to Schoology</title>`: the script proceeded to `/grades/grades`
  *without* being authenticated and landed on Schoology's own login wall

So the catch-and-retry path ran, but the manual fallback (`ask()`) detected no
TTY (background/non-interactive run — see "no terminal attached — skipping
manual fallback" in `ask()`), returned immediately, and the script barreled on
to scrape an unauthenticated session. **Bug**: `markSessionOk()` is called
unconditionally right after the catch block (`scrape-schoology.mjs` ~line 246),
even when the fallback was skipped and login never actually succeeded — this
will make `hasSavedSession()` lie to the next run, which then skips the
"first run, headed" path it actually needs.

The one fully-successful scrape on disk (`data/schoology-data.json`, 6 courses
with real grades) is from **yesterday**, 2026-06-06 03:54 — produced by the
*other* (TS-module/API-route) scraper, not by this autonomous script. So: the
SSO flow code is built and the happy-path logic looks right, but it has not yet
been observed completing end-to-end in an actual run. Next session should run
it interactively (TTY attached) to see whether it gets further than the Google
500, and fix the `markSessionOk()` ordering regardless.

**Known gap / next improvement**: the new script's *parsing* half
(`scrapeCourseList`/`scrapeCourseDetail` in `scrape-schoology.mjs`) is still
generic "best-effort guess" selectors with fallback strategies — by the file's
own comments, unproven. The live `data/schoology-data.json` (6 courses, full
grade breakdowns, `gradingPeriod: "25-26 T2"`) was actually produced by the
**old** `lib/scraper/scrape-schoology.ts` module, which has precise selectors
tuned against real Schoology HTML (`.gradebook-course`, `.report-row`,
`.alpha-grade`, `.rounded-grade`, `.period-row`, etc.). Porting those tuned
selectors into the new autonomous script (or having it reuse that module's
parsing logic) would pair the new login automation with proven scraping —
that's the natural next step, rather than re-deriving selectors from scratch.

**Watch for**: if Google changes its sign-in DOM/flow, the selector candidate
lists in `clickByText`/`waitForVisibleInput` calls inside `schoology-login.mjs`
are the first place to update.

---

## 2026-06-06 — Replaced "always-on" browser session with on-demand polling

The original design kept a Chrome session running continuously to watch for new
activity (grades/assignments appearing) — that constantly-open browser was
eating RAM on the user's machine the whole time the dev server ran, whether or
not anything had actually changed on Schoology.

Changed it to launch a browser **only when there's something to check**, then
close it immediately:

- `lib/scraper/state.ts` — module-level singleton tracking per-target
  (`schoology`/`gmail`) scrape status (`idle`/`opening_browser`/`scraping`/etc.),
  `lastRun`, and `isBusy()` — so the scheduler never launches a second browser
  on top of one that's already running
- `lib/scraper/activity-watch.ts` — tiny shared module so the scheduler (which
  scrapes) and the status route (which reports) can both see "did the last
  activity check find anything new" without importing each other
- `lib/scraper/scrape-activity.ts` (`headlessScrapeActivity`) — lightweight
  activity-feed check: launches a headless browser, loads `/home`, parses the
  feed, **closes the browser immediately** (`browser.close()` at the end of the
  function — no lingering process). One page load, not a full grade walk
- `lib/scraper/scheduler.ts` (`initScheduler`, registered from
  `instrumentation.ts`) — drives the whole on-demand cadence:
  - Full scrape check every 30 min, but `maybeScrape()` bails early unless data
    is actually stale (>15h old) or it's just past midnight — so most ticks do
    nothing and never touch a browser at all
  - Lightweight activity poll every 15 min via `checkActivityForChanges()` —
    cheap enough to run often; if it finds new items, it cascades into a forced
    full Schoology scrape immediately rather than waiting for the staleness
    window
  - `isBusy(target)` guard on every path prevents overlapping browser launches

**Net effect**: no browser process sits open consuming RAM in the steady state —
one spins up for seconds at a time, only when polling or actually scraping, then
exits. The "is something new?" signal comes from the cheap 15-minute activity
poll rather than keeping a full session alive to watch for it.

**Watch for**: if RAM use creeps back up, check for orphaned Chrome processes
first (`ps aux | grep -i chrome`) — a crash between `launchBrowser()` and
`browser.close()`/`disconnect()` could leak one. `isBusy()` should prevent
overlap, but a stuck `'scraping'` status (e.g. from a hard crash that skipped
the `finally`/catch path) would block all future runs for that target until the
server restarts and resets `state.ts`'s in-memory singleton.
