# Better Schoology Extension — Phase 4 Handoff

**Last updated:** 2026-06-09
**Build status:** ✅ Clean (325.73 kB content script, WXT MV3, `npx tsc --noEmit` clean)
**Supersedes:** HANDOFF_PHASE_3.md (read that first for the full architecture — this doc only covers what Phase 4 added)

---

## Goal of Phase 4

Full content parity with Schoology inside the extension: anything clickable on a course's Materials page should open *inside* the overlay — PDFs render inline, images render inline, discussions show their comment threads, pages/assignments render with their real formatting, links, and images. External links (Google Docs etc.) still open in a new tab — that is the desired behavior ("send me to that google doc").

---

## What Was Added

### `lib/fetch-materials.ts`

- **`'discussion'` added to `MaterialType`** — `/discussion/` hrefs and `s-type-discussion` classes now classify as `discussion` (previously lumped into `document`).
- **`RichNode` + `extractRichBody(container)`** — sanitized rich-content tree built by walking DOM nodes with a tag whitelist (`p, div, h1–h4, ul/ol/li, strong/em/u, br, a, img, blockquote, table, pre, code, span`). Drops `script/style/iframe/form/nav/svg/button/input/select` and elements whose class matches Schoology chrome (`breadcrumb|course-nav|sidebar|dropdown|infotip|comment-form` etc.). Unknown tags are unwrapped (children kept). No `dangerouslySetInnerHTML` anywhere.
- **Rich extraction only runs on known authored-content containers** (`RICH_CONTENT_SELECTORS`: `.s-page-content`, `.info-body`, `.assignment-body`, `.discussion-prompt`, `.course-info-wrapper .body`). If none found, `body` is `[]` and the UI falls back to the old paragraph extraction. This is deliberate — running it on `#center-col`/body pulls in page chrome.
- **`FetchedContent.body: RichNode[]`** — new field alongside the existing `paragraphs`.
- **`fetchDiscussion(url)`** — parses a discussion page into `{ title, prompt: RichNode[], posts: DiscussionPost[] }`. Post selectors are multi-strategy (`.s-comments-list .comment`, `ul.comment-list li.comment`, `.discussion-card`, fallback `.comment`), with author from `.comment-author`/`a[href*="/user/"]`, body from `.comment-body-wrapper`/`.comment-body`/`.comment-text`/`p`, dedup by author+body prefix. **These selectors were written from training knowledge of Schoology's DOM, not verified live — test on the Drama "Vote for Drama Awards!" discussion and fix selectors if posts come back empty.**
- **`fetchFileBlobUrl(url, mime)`** — fetches a same-origin file with credentials, re-wraps as a typed Blob, returns an object URL. This bypasses `Content-Disposition: attachment` so PDFs render in `<embed>` instead of downloading. Returns an error if the response is `text/html` (i.e. the href was a file *page*, not the raw file).
- **`detectFileKind(href, title)`** → `'pdf' | 'image' | 'office' | null` — extension sniffing across both the href and the visible title (titles often carry the extension when hrefs don't).

### `components/pages/MaterialsPage.tsx`

- **`contentView` replaced by a `viewer` union:**
  ```ts
  type Viewer =
    | { kind: 'content';    data: FetchedContent | null;    url; title }   // null = loading
    | { kind: 'discussion'; data: FetchedDiscussion | null; url; title }
    | { kind: 'file'; fileKind: 'pdf' | 'image'; url; title }
    | null;
  ```
- **`openHref(href, title, type?)` — single click router** used by tree rows, attachments, and links inside rich bodies:
  1. external or `type === 'link'` → new tab
  2. pdf/image → inline `FileViewer`
  3. office (doc/docx/ppt/xls) → new tab (browser can't render natively)
  4. discussion → `DiscussionViewer`
  5. everything else → `ContentViewer`
- **Auto-redirect for bare file pages:** if `fetchItemContent` returns no text and exactly one attachment that is a pdf/image, the viewer jumps straight to `FileViewer` for that attachment.
- **`FileViewer`** — PDFs: blob-fetched, rendered full-height in `<embed type="application/pdf">` (Chrome's built-in viewer). Images: direct same-origin `src` (no blob needed). Always shows an "Open in new tab ↗" escape link. Object URLs are revoked on unmount/url change.
- **`DiscussionViewer`** — prompt card (rich body) + post cards (author/time/body) + "Reply in Schoology ↗" link. Posting comments from the extension is NOT implemented (needs Schoology's form tokens — future work).
- **`ContentViewer`** — renders `data.body` via the new `RichBody` recursive renderer (inline-styled, link clicks intercepted into `openHref`, images shown inline); falls back to the old paragraph rendering when `body` is empty. Attachments are now buttons routed through `openHref` (pdf/image attachments open inline).
- **Discussion icon/color** added (`#ec4899` chat bubble).
- **Content area layout**: when `viewer.kind === 'file'`, the scroll container switches to `overflow: hidden; display: flex` so the PDF embed fills the viewport height.

---

## Phase 4.1 fixes (same day, after first live test)

User reported: (a) discussion posts all said "Unknown" author, (b) wanted to actually type/post comments, (c) clicking many items showed junk — course title + "Email Notification Settings" list + "Reminders / Upcoming / Calendar".

1. **"Unknown" authors** — root cause: `querySelector('.comment-author a, .comment-author, a[href*="/user/"]')` returns the first match in *document order*, which is the avatar `<a href="/user/..."><img/></a>` with no text. Fixed with `firstNonEmptyText(scope, selectors[])` — iterates selectors in priority order, returns the first non-empty trimmed text. Also used for post timestamps.
2. **Comment posting** — `postDiscussionComment(url, text)` in `fetch-materials.ts`: fetches the discussion page, finds the form containing a textarea, replays every hidden/checked input (form_token, form_build_id...), sets the textarea field, includes the submit button name/value (Drupal "op" routing), POSTs `application/x-www-form-urlencoded` with credentials. On success the thread is re-fetched. Composer UI (textarea + Post button + error w/ "reply in Schoology" fallback) lives in `DiscussionViewer`. **Untested live — if posts don't appear, dump the real reply form HTML and check field names.**
3. **Junk content screen** — root cause: `fetchItemContent`'s container fallback included `.content-wrapper`, which on Schoology wraps the ENTIRE page (notification-settings form, right-rail Reminders/Upcoming widgets, course header). Fixes: removed `.content-wrapper` from candidates; paragraph fallback now skips elements inside `form/header/footer/right-col/[class*="notification"]/.dropdown/.upcoming-*` etc.; `isNavText()` now also applied to extracted paragraphs; NAV_LABELS extended with the chrome strings ("email notification settings:", "reminders", "upcoming", "calendar", "post: *", "cupertino high school"...). Pages that are pure chrome now show "No text content found → Open in Schoology" instead of garbage.
4. **External tools** — `/external_tool/` and `/link/view/` hrefs classify as `link` → open in a new tab (LTI launches can't render natively).

---

## Phase 4.2 fixes (freeze + empty folders + grade chip)

User reported: clicking the "Online Graphing resources" folder froze the whole page; Alg2/PE/Lit-Writ/French folder expansions showed almost nothing; assignment pages (e.g. French "Examen des verbes", which is just a grade banner in Schoology) showed no content.

1. **Page freeze = infinite tree recursion.** Schoology folder pages link back to themselves (and inline-expanded subfolders re-list parents). The `folders` map is keyed by href, so a folder containing its own href rendered itself expanded → infinite `ItemTree` recursion. Fixed twice over: (a) parser now skips self-links (`?f=` equal to the folder being fetched) via `isSelfOrJunk`, (b) `ItemTree` carries an `ancestors: string[]` href chain and refuses to expand any href already open above it, plus `MAX_TREE_DEPTH = 12`.
2. **Empty folder expansions.** Strategy-2 link scan required `href.includes('/course/{id}')` — but Schoology assignment/discussion/page/quiz URLs are `/assignment/1234567` etc. with NO course id, so folders full of assignments parsed as empty. Added `isContentLink` pattern allowing those URL shapes through.
3. **Junk rows.** mailto: links (teacher email) and course-profile links (titles shaped like "Biology - 3110: GeeA p1 T2", matched by `COURSE_TITLE_SHAPE`) are filtered. Dedup is now by href, not title (two different items may share a title).
4. **Grade chip on assignment pages.** Schoology's new assignment page is JS-rendered (fetch+DOMParser sees nothing), so `ContentViewer` now shows a `GradeChip` looked up from the already-scraped gradebook in storage (`findGrade` in MaterialsPage — normalized name prefix match against `selected.categories[].assignments[]`). Shows "Grade: 20 / 20", or "Submitted — not graded yet" / "Not submitted" / "Not graded yet" + due date.

---

## Phase 4.3 fixes (validated against REAL Schoology HTML)

Stopped guessing: dumped 20 real pages (every course's materials page + folder pages + file-viewer pages) via the scraper's authenticated profile into `extension/.debug/` using `scripts/dump-materials.mjs` (rendered DOM) and `scripts/dump-materials-raw.mjs` (raw `fetch()` HTML — exactly what the extension sees). Parser logic was validated against all of them with `extension/.debug/test-parser*.mjs` (linkedom sims). **Keep these dumps + scripts — they are the ground truth for any future selector work.**

Key discoveries about Schoology's real markup:

1. **Two IDs per course.** Folder links use the SECTION id (`/course/8141837521/materials?f=…`) but file/discussion/link items use the parent COURSE id (`/course/8141837520/materials/gp/…`). The old `href.includes('/course/{sectionId}')` filter therefore dropped *every file in every folder* — this was the "PE/Alg2 folders are empty" bug. Filter is now `/\/course\/\d+\/materials/` (any id) + content-URL patterns + external.
2. **File items render TWO anchors** — direct `/attachment/{id}/source/{hash}.ext` and a `/materials/gp/{id}` viewer page — sharing one title. Parser keeps the first (direct) and skips the twin (`fileTitles` set).
3. **Real filename lives in `aria-label`** (`"P5+6 2025-26 LW Course Syllabus (1).pdf"`); visible title has no extension. Captured as `MaterialItem.fileName`, fed into `detectFileKind`.
4. **Anchor text is polluted** by nested `.infotip-content` / `.visually-hidden` spans (duplicate-filename tooltips — caused titles like "…LEARN… 0 lesson plans"). `cleanText()` strips them before reading any title/author/attachment text.
5. **Web-link materials** use the redirect wrapper `/link?a=&path=https%3A…&nid=…` (NOT `/link/view/`). Added pattern → type `link` → new tab.
6. **Folder-switcher dropdown** (`#course-materials-dropdown`) embeds links to every top-level folder on every folder page — was leaking parent folders into children. Excluded structurally via `NAV_CONTAINERS`.
7. **Text-label nav filtering was killing real folders** — Lit/Writ has a folder literally named "Assignments". Materials rows now use structural exclusion (`NAV_CONTAINERS`) + a tiny `MATERIALS_NAV_LABELS` set (prev/next/up/all materials). The big `NAV_LABELS` set only applies to `fetchItemContent` paragraph extraction. **Do NOT add folder-name-like words to MATERIALS_NAV_LABELS.** Also: the folder table lives inside a `<form>` — never structurally exclude `form` in the materials scan.
8. **Bare materials roots** (`/course/{anyId}/materials`, no `?f=`) are never material items ("All Materials" nav) — excluded in `isSelfOrJunk` with an any-id regex (course-alias id ≠ section id).
9. **`/materials/gp/{id}` viewer pages** contain a `docviewer` iframe + a single direct attachment link. `openHref` routes gp pages through `openContent`, whose single-attachment auto-redirect (now tolerant of ≤2 stray paragraphs) lands on the raw file in `FileViewer`. Attachment extraction dedupes by attachment id and skips `/docviewer` hrefs.
10. **Assignment-page junk** ("RouterTab", "InfoTab - Selected", "Comments", "There are no comments", "N lesson plans" in the title) — hidden tab-UI/comment-section text; filtered via NAV_LABELS additions, comment-container exclusion, and a title regex strip.

Sim results after fixes (matches the real Schoology UI): PE docs folder → 3 .doc files + combination-lock link; Alg2 Period 2 → 5 JPEGs; Drama top → all 7 items incl. Grade Inquiry Form; Lit/Writ Unit 6 → Daily Agendas + Assignments folders; no "All Materials"/parent-folder leaks anywhere.

---

## Phase 4.4 — PDFs/images actually render now (CORS root cause) + viewer toolbar

User: "still have to open the pdfs… i want to be able to open download resize my pdfs".

**Root cause found by probing live:** `/attachment/{id}/source/{hash}.pdf` 302-redirects to **`https://files-cdn.schoology.com/...`** — a different origin. MV3 content scripts are subject to the page's CORS, so the in-page `fetch` always died ("Failed to fetch") and the inline viewer never got bytes. Also verified: Schoology's CSP is only `frame-ancestors` (no `object-src`), so a blob `<embed>` is NOT blocked — the fetch was the only problem.

**Fix — background-worker file relay:**
- `wxt.config.ts`: added `https://files-cdn.schoology.com/*` to `host_permissions` (background fetches are CORS-exempt only for permitted hosts). **After rebuild the extension MUST be reloaded in chrome://extensions for the new permission to take effect.**
- `entrypoints/background.ts`: new `{ type: 'fetch-file', url }` message → validates host (fuhsd/files-cdn only) → fetch with credentials → returns `{ ok, base64, contentType, size }` (runtime messaging is JSON-only; base64 built with chunked btoa to avoid stack overflow).
- `lib/fetch-materials.ts` `fetchFileBlobUrl`: now messages the background worker, decodes base64 → typed Blob → object URL. Typed blob also bypasses the CDN's `content-disposition: attachment`.

**FileViewer toolbar** (`MaterialsPage.tsx`): Back · filename · zoom −/+ (steps 50–300%) · Fit · **Download** (blob `<a download>` with a sane filename, extension inferred) · open-original ↗. PDF zoom uses Chrome's `#zoom=N` viewer fragment (embed remounts via `key`); image zoom scales width with scroll overflow. Images now also load via the background relay (uniform path + makes Download work).

**Watch for:** very large files (>20–30 MB) will be slow through base64 messaging; if that ever matters, switch the relay to `chrome.runtime.connect` port streaming or have the background return a data URL written to `chrome.storage.session`.

---

## Phase 4.5 — Google Slides / Drive / YouTube inline embed viewer

User: Lit/Writ agendas have Google Slides that don't display. Probed the real page HTML (`extension/.debug/raw-page-8307542574.html`): the Slides deck is NOT an iframe — it's an attachment web-link wrapped as `/link?a=…&path=https%3A%2F%2Fdocs.google.com%2Fpresentation%2F…&nid=…`. Because that wrapper URL is on schoology.com, the click router treated it as native content and fed it to the HTML parser → garbage.

Fixes (`lib/fetch-materials.ts` + `MaterialsPage.tsx`):
- **`resolveLinkWrapper(href)`** — unwraps `/link?path=<encoded>` to the real destination; `openHref` now does this FIRST for every click.
- **`googleEmbedUrl(href)`** — returns a frameable viewer URL for: Slides (`/presentation/d/{id}/embed`), Sheets (`/preview`), Forms (`viewform?embedded=true`), Drive files (`drive.google.com/file/d/{id}/preview`), YouTube (`/embed/{id}`, also matches watch?v= and youtu.be). Returns null for **Google Docs (documents) on purpose** — those open in a new tab so assignments can be EDITED (per user's earlier request). `/edit` URLs refuse framing anyway; `/embed`+`/preview` allow it.
- **New viewer kind `embed`** + `EmbedViewer` component: Back · title · "Open ↗" toolbar + full-height iframe. The "no iframes" rule is about Schoology content (parsed natively); Google/YouTube can't be parsed and their embed endpoints exist for exactly this.
- **Real iframes in page bodies** (some teachers embed Slides/YouTube directly): `nodeToRich` now converts embeddable iframes to a "▶ Open embedded content" link instead of dropping them.

**Watch for:** Slides shared with school-domain restriction render fine because the user's Chrome is signed into the school Google account; if a deck shows "You need access", the Open ↗ button is the escape hatch.

**Phase 4.5b — auto-embed in page view:** teachers link Slides decks with tiny labels like "28.1"/"30.3" at the bottom of agenda pages. `ContentViewer` now runs `collectEmbeds(data)` — walks rich-body links AND the attachments list, unwraps `/link?path=`, and renders every embeddable destination (Slides/Sheets/Forms/Drive/YouTube, deduped by embed URL) as a full-width 16:10 inline iframe below the page text, each with a "Slides / Doc — {label}" header and Open ↗ link. The user sees the deck immediately instead of hunting for the link.

---

## Phase 4.6 — Image pages fixed (Accept header!) + de-FUHSD'd for commercial use

User: math teacher's image posts say "can't find anything"; also wants to make the extension **commercial — generalize everything**.

**Image-page root cause (verified live):** `/materials/gp/{id}` pages for IMAGES return **HTTP 202 with an EMPTY body** when fetched with JS fetch's default `Accept: */*` — they only render HTML for browser-like Accept values (`text/html,…`). PDFs' gp pages didn't care; images' do. Fix: new `sgyFetch(url)` helper sends a real browser Accept header; ALL page fetches (`fetchMaterials`, `fetchItemContent`, `fetchDiscussion`, `postDiscussionComment` GET, `extractCourseLinksFromPage`) now go through it. **Any future fetch of a Schoology page MUST use `sgyFetch`, never bare `fetch` — this 202-empty behavior will bite again.**

**Generalization (school-agnostic):**
- `SGY_ORIGIN = location.origin` in `fetch-materials.ts` — the content script runs on the school's own subdomain, so this is always right. Every hardcoded `https://fuhsd.schoology.com` in lib/ now uses it (`materialsUrlFromCourseHref`, `fetchCourseHrefs`, `hrefFromLiveDOM`); `scrape-dom.ts` + `fetch-experiment.ts` likewise.
- Manifest (`wxt.config.ts`): `host_permissions: ['https://*.schoology.com/*']` (covers every district subdomain + files-cdn + asset-cdn); content script `matches: ['https://*.schoology.com/*']`. **Reload required in chrome://extensions after this build (permission change).**
- Background `fetch-file` host check: any `*.schoology.com`.
- UI hint text shows `{location.host}/grades/grades` instead of hardcoded fuhsd.
- Still FUHSD-specific (acceptable, cosmetic only): `'cupertino high school'` entry in NAV_LABELS (harmless elsewhere — other schools just see their school-name line as a paragraph).

---

## Phase 4.7 — page bodies + slides embeds + bare-img file pages (selector truths)

User: still "No text content found" on images, and no Slides embeds. Verified against real dumps (`.debug/raw-page-8307542574.html`, `.debug/raw-gp-image-accept.html`):

1. **Page bodies use class `s-page-content-full`** — ONE class token, so the `.s-page-content` selector never matched → `body=[]` → no rich render, no embeds collected. `RICH_CONTENT_SELECTORS` now leads with `[class*="s-page-content"]` + `.s-page-summary`.
2. **Web-link attachments (Slides decks) live in `.attachments-link`**, not `.attachments-file-name` — added `.attachments-link a[href]` to attachment extraction. Slides now appear both via rich-body link and the attachments list, so `collectEmbeds` renders the inline deck.
3. **Image file-viewer pages contain NO anchors at all** — just a bare `<img src="/attachment/{id}/source/{hash}.jpeg">` in `#content-wrapper`. `fetchItemContent` now falls back to `img[src*="/attachment/"]` → single attachment → auto-redirect → inline image viewer. (The h1 on these pages is "IMG_xxxx.jpeg 0 lesson plans" — the lesson-plans suffix strip handles it.)

All three confirmed with the linkedom sim `.debug/test-content.mjs` before shipping.

---

## Phase 4.8 — comment delete, WAF detection, slides scroll-jump fix

User reports: Slides embed scrolls the page up on every slide change; "No comment form found" when posting; wants comment delete; author names confirmed working.

1. **"No comment form found" root cause:** verified the post form (`#s-comments-post-comment-form`, textarea name="comment", form_token present) IS in the raw no-JS HTML — so the failure was **AWS WAF**: Schoology intermittently answers fetches with a ~2KB JS bot-challenge page (`window.gokuProps` / `awsWafCookieDomainList`) instead of content (hit it in probing too). Added `isWafChallenge(html)` checks to all four fetch paths with a clear error ("reload this Schoology tab once, then retry"). `postDiscussionComment` also now prefers the canonical form id before the generic textarea scan.
2. **Comment delete** (`deleteDiscussionComment` in fetch-materials.ts): Schoology's flow is Drupal two-step — GET `/comment/delete/{id}` returns a confirm form (form_build_id/form_token/submit=Delete, captured live in `.debug/delete-form.html`), POST it back to the same URL. `DiscussionPost.deleteHref` is scraped from each comment's action menu (only present on own comments). UI: small "Delete" appears on own posts → inline "Delete this comment? Yes / Cancel" confirm → re-fetch thread.
3. **Slides scroll jump:** two causes addressed — `overflow-anchor: none` on the materials scroll container (Chrome scroll-anchoring reacts to iframe-internal changes), and `maxHeight: 62vh` on inline embeds so the frame fits fully in view (when it overflowed, each slide change scrolled the frame top into view, pushing the page up).

---

## Phase 5 (started) — assignment submissions (dropbox)

Recon (all verified live, dumps in `.debug/raw-assignment.html` + `.debug/raw-submit-form.html`):
- Assignment pages server-render a "Submissions" right-rail (`.drop-item-display-own` / `#dropbox-revisions`): `li` per revision with `a[href*="/dropbox/view/{uid}?revision=N"]`, "On time"/"Late" status, timestamp. The submit popup link is `.submit-assignment a[href$="/dropbox/submit"]` ("Submit Assignment" / "Re-submit Assignment").
- `/assignment/{id}/dropbox/submit` is a Drupal form page with multiple forms (Upload / Create tabs). The TEXT submission ("Create") form has `textarea[name="submission"]` + form_build_id/form_token/op → POST urlencoded back to the same action. **File uploads use plupload (separate upload step → ids into `file[files]`) — NOT implemented; the UI links "Upload files in Schoology ↗" instead.**
- Anchor text quirk: revision link text glues on the subtitle ("Revision 1 submitted1 item · On time") and uses NBSPs — parser strips `(\d+ items?|·).*` and normalizes NBSP before status matching. Validated via `.debug/test-submission2.mjs`.

Implemented:
- `fetch-materials.ts`: `SubmissionInfo`/`SubmissionRevision` types, `FetchedContent.submission`, `parseSubmissionInfo(doc, baseUrl)` (runs inside `fetchItemContent`), `submitDropboxText(submitUrl, text)` (form replay, WAF + session checks).
- `MaterialsPage.tsx`: `SubmissionsPanel` in ContentViewer — revision list (status chip green/red, timestamp, view link → new tab) + Submit/Re-submit button → textarea composer → POST → re-fetch shows the new revision. The bare-file auto-redirect is suppressed when a dropbox exists so the panel can't be skipped.
- **Text submission VERIFIED live** (revision created end-to-end). Fix that mattered: the form has TWO submit buttons named `op` ("Submit" / "Save Draft") — replaying all inputs set both and the last (Save Draft) won, silently saving a draft. Now picks `op=Submit` explicitly.

### File uploads (Phase 5b — VERIFIED live, revision 6 created with a real file)

Decoded the full flow by capturing real uploads via CDP (`scripts/verify-full-upload.mjs` proves it end-to-end):
1. GET `/assignment/{id}/dropbox/submit` → the page embeds `"file_service_upload":{"enabled":true,"url":"/file/upload-service","token":"<JWT>"}`. The JWT is short-lived (~1h, `iss:schoology`) — **always re-fetch the submit page right before uploading; never cache the token.**
2. For each file: POST multipart to `/file/upload-service` with **header `Authorization: Bearer <token>`** and parts `name=<filename>`, `use_plain=1`, `file=<blob>` → `201 {"fileMetadataId":"<uuid>"}`. (Missing the Bearer header → 401; missing `name`/`use_plain` → 500. All three discovered via CDP `Network.getRequestPostData`.)
3. POST the Upload-tab form (the one with `input[name="file[files]"]`) as **FormData** with `file[files]` = JSON `{ "<uuid>": { "title": "<filename>", "encode": true } }`, `op=Submit`, plus hidden form fields. Optional `submission` textarea text can ride along.
All same-origin (fuhsd.schoology.com), so the content script does it directly — NO background worker (unlike file *downloads*, which cross to files-cdn).

`submitDropboxFiles(submitUrl, files, text?, onProgress?)` in fetch-materials.ts. UI: SubmissionsPanel now has "Upload files" / "Type text" tabs; file mode uses a hidden `<input type=file multiple>` → chosen-file list (remove/size) + optional comment → progress text during upload. `submitDropboxText` kept for text-only.

**Reusable probe scripts kept:** `scripts/dump-assignment*.mjs`, `dump-submit-form.mjs`, `verify-full-upload.mjs` (the canonical upload-flow reference). One-off capture scripts removed.

---

## NEXT SESSION — start here

**Done so far (all committed, all verified live):** materials tree, inline PDF/image viewer (zoom+download via bg-worker relay past files-cdn CORS), Google Slides/Drive/YouTube embeds (inline + auto-shown on pages), rich page rendering, discussions (read/post/delete), assignment submissions (text + file upload), grade chips, file sizes in tree, native Calendar (month grid + clickable day detail). De-FUHSD'd: works on any `*.schoology.com`.

**Build/verify loop:** `cd ~/better-schoology/extension && npx tsc --noEmit && npm run build`, reload at chrome://extensions. Real-HTML dumps for testing parsers live in `extension/.debug/` (gitignored); reusable dumpers in `scripts/dump-*.mjs` + `scripts/verify-full-upload.mjs`.

**Golden rules (learned the hard way):**
- Don't guess Schoology selectors — dump the real page first (`scripts/dump-*.mjs` use the authenticated `.school-browser-profile`; if login auto-fails at Google account chooser, the raw-click recovery in `dump-materials.mjs` handles it; kill orphan Chrome with `ps aux | grep school-browser-profile | grep -v Frameworks`).
- Always fetch Schoology pages via `sgyFetch` (browser Accept header — image pages 202-empty otherwise) and check `isWafChallenge`.
- Forms with multiple `op` submit buttons: pick "Submit" explicitly (else you save a Draft / wrong action).

**Remaining features, EASIEST → HARDEST:**
1. **Updates feed** (recommended next, highest value): teacher announcements/posts. Recon: dump `/course/{id}/feed` or the home `/home` updates widget + `/course/{id}/updates`. Likely a comment-style list like discussions — reuse `RichBody` + the comment-post replay. New page + nav item (copy CalendarPage/AssignmentsPage pattern; nav icon in ExtSidebar NAV_ITEMS).
2. **Messages** (`/messages`): inbox list + thread view + send. Send = form replay like comments. Moderate.
3. **Calendar polish**: pull events (not just gradebook due dates) from `/calendar/feed` if assignment due dates feel incomplete.
4. **Quizzes/tests** (HARDEST, maybe infeasible): Schoology renders these as a heavy JS SPA — taking them inline likely can't be replayed; may have to stay "open in Schoology". Recon before committing to it.

**Pattern to add a page:** new `components/pages/XPage.tsx` (take `{ grades }` or fetch its own data via `sgyFetch`), add to `Page` type + render switch in `ExtRouter.tsx`, add nav entry in `ExtSidebar.tsx` NAV_ITEMS. Inline styles only, `T` color map at top of file.

---

## Constraints Status

- "No iframes for displaying Schoology content" — still honored for HTML content (everything is parsed + natively rendered). PDFs use `<embed>` with a **blob URL** (raw file bytes, not a Schoology page) — that's the only way to render a PDF without shipping a JS PDF renderer.
- Inline styles only — honored (RichBody uses a `RICH_STYLES` map).
- No storage changes, no background scraping changes, no root-project file touched.

---

## Untested / Watch For (needs live verification in Chrome)

1. **PDF embed vs page CSP** — if fuhsd.schoology.com ever serves an `object-src`/`plugin` CSP that blocks `blob:`, the embed will silently render nothing. The "Open in new tab" link is the escape hatch; if this happens consistently, switch to rendering via `chrome.runtime.getURL` page or pdf.js.
2. **Discussion post selectors** — written best-effort (see above). Verify on Drama → "Vote for Drama Awards!" (17 posts expected).
3. **File-page hrefs** — Schoology file materials sometimes link to an HTML viewer page rather than the raw attachment. `detectFileKind` will classify by extension and `fetchFileBlobUrl` will fail with "Not a direct file link" → error + new-tab fallback shown. The auto-redirect path (content fetch → single attachment) handles the common case; if a course shows many failures, parse the file page for its real `/attachment/` link before giving up.
4. **Rich body coverage** — pages whose content lives outside the known containers fall back to plain paragraphs (same as Phase 3). If a page looks emptier than Schoology, add its container class to `RICH_CONTENT_SELECTORS`.

---

## How to Test

```bash
cd ~/better-schoology/extension && npm run build
# reload unpacked extension at chrome://extensions, open fuhsd.schoology.com
```
Walk each course's Materials page:
- Biology → Course Documents → "Graphing in Google Docs - Bar Graphs" (PDF inline)
- Algebra 2 → Class Pictures → IMG_7475.jpeg (image inline)
- Drama → "Vote for Drama Awards!" (discussion thread)
- Lit/Writ → "Welcome to Literature and Writing" (rich page w/ image), Unit 6 → Assignments → links (Google Docs → new tab)
- PE 9 → Sports Handouts → "Tennis Handout.pdf" (inline), "Volleyball Handout.docx" (new tab)
