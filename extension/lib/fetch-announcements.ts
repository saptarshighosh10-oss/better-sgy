/**
 * fetch-announcements.ts
 *
 * Reads teacher announcements / course updates from Schoology's "Recent Activity"
 * feed and normalizes them into a small, UI-friendly shape (Gmail-style inbox).
 *
 * School-agnostic: uses SGY_ORIGIN + sgyFetch (cookies ride along), never hardcodes
 * a district. Parsing is DEFENSIVE — Schoology's feed markup varies, so every field
 * has multiple selector fallbacks and we degrade to an empty list rather than throw.
 *
 * NOTE: the exact feed DOM differs slightly per Schoology tenant. If the list comes
 * back empty on a real account, capture the feed HTML and widen the selectors here.
 */

import { SGY_ORIGIN, sgyFetch, isWafChallenge } from './fetch-materials';
import { queuedFetch } from './sgy-net';

export interface CourseRef { name: string; href: string }

export interface Announcement {
  id: string;
  kind: 'message' | 'update' | 'class-update'; // message = teacher email, update = notification, class-update = full course-feed post
  author: string;        // teacher / sender name
  courseName: string;    // realm (course / group) the post belongs to, if any
  body: string;          // plain-text body (first ~600 chars)
  bodyHtml: string;      // sanitized-ish inner HTML for the reading pane
  timeText: string;      // human "2 days ago" if present
  timestamp: number;     // ms epoch (best-effort; 0 if unknown) — used for sorting
  link: string | null;   // permalink to the update on Schoology, if present
}

export interface AnnouncementsResult {
  success: boolean;
  items: Announcement[];
  error: string | null;
}

const WAF_ERROR =
  'Schoology bot-check blocked the request — reload this Schoology tab once, then retry';


/** First non-empty text from a list of selectors within `root`. */
function pickText(root: Element, selectors: string[]): string {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    const t = el?.textContent?.trim();
    if (t) return t;
  }
  return '';
}

/** First matching element from a list of selectors. */
function pickEl(root: Element, selectors: string[]): Element | null {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function absolute(href: string | null): string | null {
  if (!href) return null;
  try {
    return new URL(href, SGY_ORIGIN).href;
  } catch {
    return null;
  }
}

/** Parse a Schoology timeago-style timestamp into ms epoch (best-effort). */
function parseTime(root: Element): { timeText: string; timestamp: number } {
  // Schoology uses <abbr class="timeago" title="ISO/date"> or data-timestamp attrs.
  const abbr = root.querySelector('abbr.timeago, abbr[title], time[datetime], [data-timestamp]');
  let timestamp = 0;
  if (abbr) {
    const raw =
      abbr.getAttribute('data-timestamp') ||
      abbr.getAttribute('datetime') ||
      abbr.getAttribute('title') ||
      '';
    if (/^\d{9,}$/.test(raw)) {
      // unix seconds or ms
      const n = Number(raw);
      timestamp = raw.length <= 10 ? n * 1000 : n;
    } else if (raw) {
      const d = Date.parse(raw);
      if (!Number.isNaN(d)) timestamp = d;
    }
  }
  const timeText = pickText(root, [
    'abbr.timeago',
    '.update-feed-time',
    '.s-edge-actions .small-gray',
    '.created',
    'time',
  ]);
  return { timeText, timestamp };
}

/**
 * Try to locate feed-post elements within a parsed document, across the markup
 * variants Schoology has shipped. Returns the first selector that yields posts.
 */
function findPosts(doc: Document): Element[] {
  const candidates = [
    '.s-edge-feed > li',
    '#edge-feed > li',
    '.feed-list > li',
    'li.s-edge-type-create',
    '.update-row',
    '[id^="edge_assoc_"]',
    '.feed-item',
  ];
  for (const sel of candidates) {
    const found = Array.from(doc.querySelectorAll(sel));
    if (found.length) return found;
  }
  return [];
}

function parsePost(el: Element, idx: number): Announcement | null {
  const author = pickText(el, [
    '.update-sender a',
    '.s-edge-author a',
    '.author a',
    '.update-sender',
    '.s-edge-author',
  ]);
  const courseName = pickText(el, [
    '.update-sender .group-name',
    '.realm-title',
    '.s-edge-realm a',
    '.update-sentto a',
    '.feed-item-realm',
  ]);
  const bodyEl = pickEl(el, [
    '.update-body',
    '.s-edge-body',
    '.feed-body',
    '.update-content',
    '.contComment',
  ]);
  const bodyHtml = (bodyEl?.innerHTML || '').trim();
  const body = (bodyEl?.textContent || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 600);
  if (!author && !body) return null; // not a real post

  const linkEl = el.querySelector('a.update-body-permalink, a.permalink, a[href*="/update/"], a[href*="#comment"]') as HTMLAnchorElement | null;
  const link = absolute(linkEl?.getAttribute('href') ?? null);
  const { timeText, timestamp } = parseTime(el);

  const id =
    el.getAttribute('id') ||
    linkEl?.getAttribute('href') ||
    `${author}|${body.slice(0, 40)}|${timeText}` ||
    `post-${idx}`;

  return {
    id,
    kind: 'update',
    author: author || 'Schoology',
    courseName,
    body,
    bodyHtml,
    timeText,
    timestamp,
    link,
  };
}

/**
 * Fetch the recent-activity feed. Tries the home feed first, then the home page
 * itself (some tenants render the feed inline). Returns a de-duped, time-sorted list.
 */
export async function fetchAnnouncements(): Promise<AnnouncementsResult> {
  const urls = [`${SGY_ORIGIN}/home/feed`, `${SGY_ORIGIN}/home`];
  let lastError: string | null = 'No announcements feed found.';

  for (const url of urls) {
    try {
      const res = await sgyFetch(url);
      const raw = await res.text();
      if (isWafChallenge(raw)) {
        lastError = WAF_ERROR;
        continue;
      }
      // Some feed endpoints answer with JSON { output: "<html>" }
      let html = raw;
      const trimmed = raw.trimStart();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const json = JSON.parse(raw);
          html = json.output || json.content || json.html || '';
        } catch {
          /* not JSON after all — use raw */
        }
      }
      if (!html) continue;

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const posts = findPosts(doc);
      if (!posts.length) continue;

      const seen = new Set<string>();
      const items: Announcement[] = [];
      posts.forEach((el, i) => {
        const a = parsePost(el, i);
        if (a && !seen.has(a.id)) {
          seen.add(a.id);
          items.push(a);
        }
      });
      if (!items.length) continue;

      items.sort((a, b) => b.timestamp - a.timestamp);
      return { success: true, items, error: null };
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Failed to load announcements.';
    }
  }
  return { success: false, items: [], error: lastError };
}

/** Split a "[Course - 2320: TeacherA p2 T2] Subject" line into {course, subject}. */
function splitSubject(raw: string): { course: string; subject: string } {
  const m = raw.match(/^\s*\[(.+?)\]\s*(.*)$/s);
  if (m) {
    // Trim the course code/period noise to just the readable course name.
    const course = m[1].split(/\s*-\s*\d|:/)[0].trim() || m[1].trim();
    return { course, subject: m[2].trim() || raw.trim() };
  }
  return { course: '', subject: raw.trim() };
}

/**
 * Strip scripts, inline event handlers, and dangerous URLs from untrusted HTML before
 * it's rendered via innerHTML. Keeps formatting, images, and links.
 */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, object, embed, form, link, meta, base, noscript, button').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) { el.removeAttribute(attr.name); continue; }
      if ((name === 'href' || name === 'src' || name === 'xlink:href') &&
          (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:text/html'))) {
        el.removeAttribute(attr.name); continue;
      }
      if (name === 'style' && /expression\s*\(|javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    }
  });
  return doc.body.innerHTML.trim();
}

/**
 * Fetch the FULL body of a message thread (or update permalink). The inbox list only
 * carries a short, server-truncated preview — the real content lives on the linked page.
 */
export async function fetchMessageBody(url: string): Promise<{ ok: boolean; html: string; error: string | null }> {
  try {
    const res = await sgyFetch(absolute(url) || url);
    const raw = await res.text();
    if (isWafChallenge(raw)) return { ok: false, html: '', error: WAF_ERROR };
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    const selectors = [
      '.message-body', '.private-message-body', '.s-message-body',
      '.messages-thread .body', '.message .body', '.mscontent', '.update-body', '.message-item',
    ];
    let nodes: Element[] = [];
    for (const sel of selectors) {
      const found = Array.from(doc.querySelectorAll(sel));
      if (found.length) { nodes = found; break; }
    }
    if (!nodes.length) {
      const main = doc.querySelector('#main-inner, #center-content, .content-wrapper, #content');
      if (main) nodes = [main];
    }
    if (!nodes.length) return { ok: false, html: '', error: 'Could not find the message content.' };
    // Drop obvious page chrome, then run the shared sanitizer (scripts/handlers/etc.).
    nodes.forEach((el) => el.querySelectorAll('nav, .actions, .quickbar, .reply, .comment-form').forEach((n) => n.remove()));
    const combined = nodes.map((el) => (el as HTMLElement).innerHTML).join('<hr style="border:none;border-top:1px solid currentColor;opacity:.12;margin:14px 0">');
    const html = sanitizeHtml(combined);
    return html ? { ok: true, html, error: null } : { ok: false, html: '', error: 'Message body was empty.' };
  } catch (e) {
    return { ok: false, html: '', error: e instanceof Error ? e.message : 'Failed to load the message.' };
  }
}

/**
 * Read the student's Schoology Messages (the envelope inbox) — "teachers emailing
 * people". Each thread becomes an Announcement (sender = author, the [Course] tag =
 * courseName, subject = body). Defensive: targets thread links and pulls sender /
 * time / preview from the surrounding row across markup variants.
 */
export async function fetchMessages(): Promise<AnnouncementsResult> {
  const urls = [`${SGY_ORIGIN}/messages`, `${SGY_ORIGIN}/messages/inbox`];
  let lastError: string | null = 'No messages found.';

  for (const url of urls) {
    try {
      const res = await sgyFetch(url);
      const raw = await res.text();
      if (isWafChallenge(raw)) {
        lastError = WAF_ERROR;
        continue;
      }
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      // Real markup (confirmed): each thread is a td.privatemsg-list-subject with a
      // full subject="" attr, sender link, .privatemsg-list-body preview, and
      // .names-date .gray time. Thread link is a.subject-link → /messages/view/<id>.
      const cells = Array.from(doc.querySelectorAll('td.privatemsg-list-subject'));
      if (!cells.length) continue;

      const seen = new Set<string>();
      const items: Announcement[] = [];
      for (const td of cells) {
        const subjectLink = td.querySelector('a.subject-link');
        const href = subjectLink?.getAttribute('href') || '';
        const threadId =
          href.match(/\/messages\/view\/(\d+)/)?.[1] ||
          td.querySelector('input[name^="threads"]')?.getAttribute('value') ||
          href;
        const id = `msg:${threadId}`;
        if (seen.has(id)) continue;
        seen.add(id);

        // The subject="" attribute holds the FULL (untruncated) subject line.
        const rawSubject = (td.getAttribute('subject') || subjectLink?.textContent || '').replace(/\s+/g, ' ').trim();
        const { course, subject } = splitSubject(rawSubject);

        const senderEl =
          td.querySelector('.names-date a[href*="/user/"]') ||
          td.querySelector('.picture a[title]') ||
          td.querySelector('img[alt]');
        const sender = (
          senderEl?.textContent ||
          senderEl?.getAttribute('title') ||
          senderEl?.getAttribute('alt') ||
          ''
        ).trim();
        const preview = pickText(td, ['.privatemsg-list-body']);
        const timeText = pickText(td, ['.names-date .gray', '.names-date .small', '.names-date span']);
        const timestamp = parseHumanTime(timeText);

        const body = (preview ? `${subject} — ${preview}` : subject).slice(0, 600) || rawSubject;

        items.push({
          id,
          kind: 'message',
          author: sender || 'Schoology',
          courseName: course,
          body,
          bodyHtml: '',
          timeText,
          timestamp,
          link: absolute(href),
        });
      }
      if (!items.length) continue;

      items.sort((a, b) => b.timestamp - a.timestamp);
      return { success: true, items, error: null };
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Failed to load messages.';
    }
  }
  return { success: false, items: [], error: lastError };
}

/**
 * Parse Schoology's human time strings ("Jun 10 at 12:36 pm",
 * "Tue Jun 9, 2026 at 10:21 am") into ms epoch. Best-effort; 0 if unparseable.
 */
function parseHumanTime(text: string): number {
  if (!text) return 0;
  // Drop a leading weekday word ("Tue Jun 9…" → "Jun 9…").
  let s = text.trim().replace(/^[A-Za-z]{3,9},?\s+(?=[A-Za-z]{3})/, '');
  s = s.replace(/\bat\b/i, ' ').replace(/\s+/g, ' ').trim();
  if (!/\d{4}/.test(s)) {
    // No year → assume current school year.
    s = s.replace(/^([A-Za-z]{3,9}\s+\d{1,2})\b/, `$1, ${new Date().getFullYear()}`);
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Read the Notifications page — "what got updated". Real markup (confirmed):
 *   <span class="edge-sentence">
 *     <a href="/course/..">Biology - 3110: GeeA p1 T2</a> posted
 *     <span class="added-item"><a href="/page/..">Final grades</a></span>,
 *     <span class="other-items-link">1 other item</span>
 *     <span class="edge-time">Jun 10 at 12:36 pm</span>
 *   </span>
 * Course → author, posted item titles → body, .edge-time → time.
 */
export async function fetchNotifications(): Promise<AnnouncementsResult> {
  // The ?from_popup endpoint server-renders the .edge-sentence list.
  const urls = [`${SGY_ORIGIN}/home/notifications?from_popup`, `${SGY_ORIGIN}/home/notifications`];
  let lastError: string | null = 'No notifications found.';

  for (const url of urls) {
    try {
      const res = await sgyFetch(url);
      let raw = await res.text();
      if (isWafChallenge(raw)) { lastError = WAF_ERROR; continue; }
      // Popup may answer with JSON { content: "<html>" }.
      const trimmed = raw.trimStart();
      if (trimmed.startsWith('{')) {
        try { const j = JSON.parse(raw); raw = j.content || j.output || j.html || raw; } catch { /* keep raw */ }
      }

      const doc = new DOMParser().parseFromString(raw, 'text/html');
      const rows = Array.from(doc.querySelectorAll('.edge-sentence'));
      if (!rows.length) continue;

      const seen = new Set<string>();
      const items: Announcement[] = [];
      rows.forEach((row, idx) => {
        const courseLink = row.querySelector('a[href*="/course/"]');
        const courseRaw = (courseLink?.textContent || '').replace(/\s+/g, ' ').trim();

        const objLinks = Array.from(row.querySelectorAll('.added-item a'));
        const titles = objLinks.map((a) => (a.textContent || '').trim()).filter(Boolean);
        const other = (row.querySelector('.other-items-link')?.textContent || '').trim();
        if (other) titles.push(other);

        const timeText = (row.querySelector('.edge-time')?.textContent || '').replace(/\s+/g, ' ').trim();
        // DOM order is newest-first; use parsed time, else a decreasing fallback.
        const timestamp = parseHumanTime(timeText) || Date.now() - idx * 60000;

        const rowText = (row.textContent || '').replace(/\s+/g, ' ').trim();
        const verbM = rowText.match(/\b(posted|graded|commented|created|added|updated|shared|sent)\b/i);
        const verb = verbM ? verbM[1][0].toUpperCase() + verbM[1].slice(1).toLowerCase() : 'Posted';
        const { course } = splitSubject(`[${courseRaw}]`);
        const link = objLinks[0]?.getAttribute('href') || courseLink?.getAttribute('href') || null;
        const body = (titles.length ? `${verb}: ${titles.join(', ')}` : rowText).slice(0, 600);

        const id = `ntf:${courseRaw}|${titles.slice(0, 2).join('|').slice(0, 60)}|${timeText}`;
        if (seen.has(id)) return;
        seen.add(id);

        items.push({
          id,
          kind: 'update',
          author: course || courseRaw || 'Schoology',
          courseName: '',
          body,
          bodyHtml: '',
          timeText,
          timestamp,
          link: absolute(link),
        });
      });

      if (!items.length) continue;
      return { success: true, items, error: null };
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Failed to load notifications.';
    }
  }
  return { success: false, items: [], error: lastError };
}

/**
 * Parse one course's Updates feed (`/course/<id>/updates`) into full teacher posts.
 * Anchors on each post's `.edge-footer` (which carries the time in `.created .gray`
 * and the post id via `comments-post-<nid>`), climbs to the post, and reads the
 * author (first /user/ link OUTSIDE the footer — the footer holds the student's own
 * comment form) and body (`.update-body`, else post text minus footer/author).
 */
function parseCourseFeed(doc: Document, courseName: string, courseId: string): Announcement[] {
  const out: Announcement[] = [];
  const footers = Array.from(doc.querySelectorAll('.edge-footer'));
  const { course } = splitSubject(`[${courseName}]`);

  for (const footer of footers) {
    const post = (footer.closest('li, [class*="edge-type"], [class*="s-edge"]') || footer.parentElement) as Element | null;
    if (!post) continue;

    // The visible name is in .long-username; the avatar link has no text.
    let author = pickText(post, ['.long-username a', '.update-sentence-inner a[href*="/user/"]']);
    if (!author) author = (post.querySelector('.picture a[title], a[href*="/user/"][title]')?.getAttribute('title') || '').trim();

    const bodyEl = post.querySelector('.update-body, .s-edge-body, .summary-body, .update-content');
    let body = '';
    let bodyHtml = '';
    if (bodyEl) {
      body = (bodyEl.textContent || '').replace(/\s+/g, ' ').trim();
      bodyHtml = bodyEl.innerHTML;
    } else {
      const clone = post.cloneNode(true) as Element;
      clone.querySelectorAll('.edge-footer, .author-picture, .picture, a[href*="/user/"], script, .edge-sentence-actions').forEach((e) => e.remove());
      body = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    const timeText = pickText(footer, ['.created .gray', '.created .small', '.created span']);
    // The <li> carries a unix-seconds timestamp — most reliable for sorting.
    const li = post.closest('li[timestamp]');
    const tsAttr = li?.getAttribute('timestamp');
    const timestamp = tsAttr && /^\d+$/.test(tsAttr) ? Number(tsAttr) * 1000 : parseHumanTime(timeText);
    const nid =
      footer.querySelector('[id^="comments-post-"]')?.id.match(/comments-post-(\d+)/)?.[1] ||
      footer.querySelector('input[name="nid"]')?.getAttribute('value') ||
      li?.id ||
      `${courseId}-${body.slice(0, 30)}`;

    if (!author && !body) continue;
    out.push({
      id: `cu:${nid}`,
      kind: 'class-update',
      author: author || course,
      courseName: course,
      body: body.slice(0, 600),
      bodyHtml,
      timeText,
      timestamp,
      link: `${SGY_ORIGIN}/course/${courseId}/updates`,
    });
  }
  return out;
}

/**
 * Full teacher posts from every course's Updates feed (the rich "class updates").
 * Takes the course list straight from the grade scrape (name + /course/<id> href),
 * which is reliable — deriving it from /home/course-dashboard returned nothing.
 */
export async function fetchCourseUpdates(courses: CourseRef[]): Promise<AnnouncementsResult> {
  const entries = courses
    .map((c) => ({ name: c.name, id: c.href.match(/\/course\/(\d+)/)?.[1] }))
    .filter((e): e is { name: string; id: string } => !!e.id);
  if (!entries.length) return { success: false, items: [], error: 'No course IDs available yet.' };

  // Sequential (not Promise.all) — firing all course feeds at once trips Schoology's
  // 429 rate-limit. One at a time with retry is reliable.
  const results: Announcement[][] = [];
  for (const { name, id } of entries) {
    let posts: Announcement[] = [];
    for (const url of [`${SGY_ORIGIN}/course/${id}/feed?page=0`, `${SGY_ORIGIN}/course/${id}/updates`]) {
      try {
        // Mimic Schoology's own AJAX call — Accept: text/html (sgyFetch's default)
        // makes /feed return the empty page shell; the XHR headers return the JSON.
        const res = await queuedFetch(url, {
          credentials: 'include',
          headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json, text/javascript, */*; q=0.01' },
        });
        let raw = await res.text();
        if (isWafChallenge(raw)) continue;
        const trimmed = raw.trimStart();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try { const j = JSON.parse(raw); raw = j.output || j.content || j.html || raw; } catch { /* keep raw */ }
        }
        const doc = new DOMParser().parseFromString(raw, 'text/html');
        const parsed = parseCourseFeed(doc, name, id);
        if (parsed.length) { posts = parsed; break; }
      } catch { /* try next url */ }
    }
    results.push(posts);
  }

  const seen = new Set<string>();
  const items: Announcement[] = [];
  for (const arr of results) for (const a of arr) { if (!seen.has(a.id)) { seen.add(a.id); items.push(a); } }
  items.sort((a, b) => b.timestamp - a.timestamp);
  console.log('[BS] course updates:', items.length, '— per course:', results.map((r) => r.length), 'courses:', entries.length);
  if (items.length) return { success: true, items, error: null };
  return { success: false, items: [], error: 'No course updates found.' };
}

/** Combined inbox: Messages + Notifications + Course Updates (+ home feed). */
export async function fetchInbox(courses: CourseRef[] = []): Promise<AnnouncementsResult> {
  // Sequential, not Promise.all — running every source at once trips Schoology's
  // 429 rate-limiter (the burst made Messages/Notifications come back empty).
  const msgs = await fetchMessages();
  const notifs = await fetchNotifications();
  const courseUpdates = await fetchCourseUpdates(courses);
  const feed = await fetchAnnouncements();
  const seen = new Set<string>();
  const items: Announcement[] = [];
  for (const a of [...msgs.items, ...notifs.items, ...courseUpdates.items, ...feed.items]) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    items.push(a);
  }
  items.sort((a, b) => b.timestamp - a.timestamp);
  if (items.length) return { success: true, items, error: null };
  return { success: false, items: [], error: msgs.error || notifs.error || courseUpdates.error || feed.error };
}
