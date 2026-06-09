/**
 * fetch-materials.ts — Phase 3C
 *
 * Fetches a Schoology course materials page via same-origin fetch+DOMParser.
 * Uses the course href captured during grade scraping to derive the materials URL.
 */

export type MaterialType = 'folder' | 'document' | 'link' | 'assignment' | 'quiz' | 'media' | 'discussion' | 'unknown';

// ── School-agnostic origin + fetch ────────────────────────────────────────────

/**
 * The Schoology origin for THIS school (e.g. https://fuhsd.schoology.com or
 * https://app.schoology.com) — the content script runs on the school's own
 * Schoology page, so location.origin is always the right base. Never hardcode
 * a district subdomain.
 */
export const SGY_ORIGIN = location.origin;

/**
 * Fetch a Schoology page the way the BROWSER would. The Accept header is
 * load-bearing: several page types (e.g. image file-viewer /materials/gp/
 * pages) return `202` with an EMPTY body when requested with fetch's default
 * `Accept: * / *`, and only render HTML for browser-like Accept values.
 */
export function sgyFetch(url: string): Promise<Response> {
  return fetch(url, {
    credentials: 'include',
    redirect: 'follow',
    headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
  });
}

/**
 * Schoology sits behind AWS WAF; it occasionally answers a fetch with a
 * ~2KB JS bot-challenge page instead of the real content. A real navigation
 * solves the challenge and sets a cookie; a fetch can't run its JS.
 */
export function isWafChallenge(html: string): boolean {
  return html.length < 20000 && (html.includes('awsWafCookieDomainList') || html.includes('window.gokuProps'));
}

const WAF_ERROR = 'Schoology bot-check blocked the request — reload this Schoology tab once, then retry';

export interface MaterialItem {
  type: MaterialType;
  title: string;
  href: string | null;
  id: string | null;
  dueDate?: string | null;
  description?: string | null;
  fileName?: string | null; // real filename w/ extension from aria-label (file items)
}

// ── Content view types ────────────────────────────────────────────────────────

export interface ContentParagraph {
  kind: 'h2' | 'h3' | 'text' | 'bullet' | 'duedate';
  text: string;
}

export interface ContentAttachment {
  title: string;
  href: string;
  fileSize?: string;
}

// Sanitized rich content tree — built from whitelisted tags only, rendered
// natively in the shadow DOM (no dangerouslySetInnerHTML, no iframes).
export type RichNode =
  | { t: 'text'; text: string }
  | { t: 'el'; tag: string; href?: string; src?: string; children: RichNode[] };

export interface SubmissionRevision {
  title: string;   // "Revision 1 submitted"
  status: string;  // "On time" | "Late" | ''
  time: string;    // "Apr 17, 2026 at 8:02 pm" | ''
  href: string | null;
}

export interface SubmissionInfo {
  submitHref: string;   // /assignment/{id}/dropbox/submit
  submitLabel: string;  // "Submit Assignment" | "Re-submit Assignment"
  revisions: SubmissionRevision[];
}

export interface FetchedContent {
  success: boolean;
  title: string;
  paragraphs: ContentParagraph[];
  body: RichNode[];
  attachments: ContentAttachment[];
  submission: SubmissionInfo | null; // present when the assignment has a dropbox
  error: string | null;
}

export interface DiscussionPost {
  author: string;
  time: string | null;
  body: string;
  deleteHref: string | null; // present only on the user's own comments
}

export interface FetchedDiscussion {
  success: boolean;
  title: string;
  prompt: RichNode[];
  posts: DiscussionPost[];
  error: string | null;
}

// ── File-kind detection (for inline viewers) ─────────────────────────────────

export type FileKind = 'pdf' | 'image' | 'office' | null;

/** Detect a viewable file type from an href and/or visible title. */
export function detectFileKind(href: string | null, title?: string | null): FileKind {
  const s = `${href ?? ''} ${title ?? ''}`.toLowerCase();
  if (/\.pdf\b/.test(s)) return 'pdf';
  if (/\.(png|jpe?g|gif|webp|bmp|heic)\b/.test(s)) return 'image';
  if (/\.(docx?|pptx?|xlsx?)\b/.test(s)) return 'office';
  return null;
}

export interface FolderContents {
  folderId: string;
  folderTitle: string;
  items: MaterialItem[];
}

export interface MaterialsResult {
  success: boolean;
  courseTitle: string;
  items: MaterialItem[];
  error: string | null;
}

// ── URL helpers ───────────────────────────────────────────────────────────────

export function materialsUrlFromCourseHref(courseHref: string): string | null {
  if (!courseHref) return null;
  // /course/{id} or /course/{id}/anything
  const m = courseHref.match(/\/course[s]?\/(\d+)/);
  if (m) return `${SGY_ORIGIN}/course/${m[1]}/materials`;
  // /gradebook/{id}
  const g = courseHref.match(/\/gradebook\/(\d+)/);
  if (g) return `${SGY_ORIGIN}/course/${g[1]}/materials`;
  // /section/{id}
  const s = courseHref.match(/\/section\/(\d+)/);
  if (s) return `${SGY_ORIGIN}/course/${s[1]}/materials`;
  console.warn('[BS] Unrecognised course href pattern:', courseHref);
  return null;
}

// ── Link wrappers & embeddable destinations ───────────────────────────────────

/** Schoology wraps web-link materials as /link?a=…&path=<encoded>&nid=… */
export function resolveLinkWrapper(href: string): string {
  try {
    const u = new URL(href);
    if (u.hostname.endsWith('schoology.com') && u.pathname === '/link') {
      const p = u.searchParams.get('path');
      if (p) return p;
    }
  } catch { /* keep original */ }
  return href;
}

/**
 * Embeddable viewer URL for Google Slides/Sheets/Forms, Drive files, and
 * YouTube. Returns null for everything else — including Google DOCS, which
 * deliberately open in a new tab so assignments can be edited there.
 * (/embed and /preview endpoints allow framing; /edit does not.)
 */
export function googleEmbedUrl(href: string): string | null {
  const g = href.match(/docs\.google\.com\/(presentation|spreadsheets|forms)\/d\/(e\/)?([\w-]+)/);
  if (g) {
    const full = (g[2] ?? '') + g[3];
    if (g[1] === 'presentation') return `https://docs.google.com/presentation/d/${full}/embed?start=false&loop=false`;
    if (g[1] === 'forms') return `https://docs.google.com/forms/d/${full}/viewform?embedded=true`;
    return `https://docs.google.com/spreadsheets/d/${full}/preview`;
  }
  const d = href.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (d) return `https://drive.google.com/file/d/${d[1]}/preview`;
  const y = href.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (y) return `https://www.youtube.com/embed/${y[1]}`;
  return null;
}

// ── DOM parser ────────────────────────────────────────────────────────────────

// Schoology left-nav filter labels — never course content
const NAV_LABELS = new Set([
  'all materials', 'assignments', 'tests/quizzes', 'files', 'links',
  'discussions', 'pages', 'albums', 'scorm', 'web content', 'external tools',
  'assessments', 'export', 'notifications', 'switch to another course.',
  'switch to another course', 'mastery', 'course profile',
  // Schoology folder-navigation shortcuts
  'prev', 'next', 'up',
  // Page-chrome strings that leak into content parsing (notification settings
  // dropdown + right-rail widgets present on every course page)
  'email notification settings:', 'email notification settings',
  'reminders', 'upcoming', 'calendar', 'upcoming • calendar',
  'post: *', 'grades', 'updates', 'attendance', 'members', 'cupertino high school',
  // Hidden tab-UI / comment-section labels on assignment pages
  'routertab', 'routertab - selected', 'infotab', 'infotab - selected',
  'comments', 'there are no comments', 'submissions', 'submit assignment',
]);

function isNavHref(href: string): boolean {
  return /list_filter=|\/notifications|\/mastery|course-profile|\/grades|logout|settings/.test(href);
}

function isNavText(text: string): boolean {
  return NAV_LABELS.has(text.toLowerCase());
}

// For MATERIALS list rows only use a tiny label set — courses legitimately have
// folders named "Assignments", "Files", etc. (the big NAV_LABELS set killed
// them). Page chrome is excluded structurally via NAV_CONTAINERS instead.
const MATERIALS_NAV_LABELS = new Set(['prev', 'next', 'up', 'expand folder.', 'collapse folder.', 'all materials']);

// Chrome containers whose anchors are never course materials. NOTE: do NOT add
// plain `form` — the folder-contents table itself lives inside a <form>.
const NAV_CONTAINERS =
  '.course-materials-dropdown, #course-materials-dropdown, .dropdown-view, ' +
  '.course-material-navigator, .content-top-upper, nav, [role="navigation"], ' +
  '.breadcrumb, #sidebar-left, .sidebar, #header, #footer, .infotip-content';

function isMaterialsNav(anchor: Element, title: string): boolean {
  if (MATERIALS_NAV_LABELS.has(title.toLowerCase())) return true;
  return !!anchor.closest(NAV_CONTAINERS);
}

function classifyFromHref(href: string): MaterialType {
  if (/[?&]f=\d+/.test(href)) return 'folder';
  if (/\/assignment\/|\/submissions\//.test(href)) return 'assignment';
  if (/\/quiz\/|\/test\//.test(href)) return 'quiz';
  if (/\/discussion\//.test(href)) return 'discussion';
  // LTI launches (eText, Albert, etc.) need a real browser tab — treat as link.
  // /link?path=… is Schoology's redirect wrapper for web-link materials.
  if (/\/external_tool\/|\/link\/view\/|\/link\?/.test(href)) return 'link';
  if (/\/materials\/gp\/|\/attachment\/\d+\/source\//.test(href)) return 'document';
  return 'document';
}

/**
 * Visible text with Schoology's hidden helper spans stripped — anchors embed
 * `.infotip-content` (duplicate filename tooltip) and `.visually-hidden`
 * spans whose text otherwise pollutes titles.
 */
function cleanText(el: Element | null): string {
  if (!el) return '';
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('.infotip-content, .visually-hidden').forEach((n) => n.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function classifyFromElement(el: Element, href: string): MaterialType {
  const cls = (el.className || '') + ' ' + ((el.parentElement?.className) || '');
  if (/s-type-folder|material-type-folder/i.test(cls)) return 'folder';
  if (/s-type-assignment|material-type-assignment/i.test(cls)) return 'assignment';
  if (/s-type-quiz|material-type-quiz|s-type-test/i.test(cls)) return 'quiz';
  if (/s-type-discussion|material-type-discussion/i.test(cls)) return 'discussion';
  if (/s-type-link|material-type-link/i.test(cls)) return 'link';
  if (/s-type-media|material-type-media/i.test(cls)) return 'media';
  if (/s-type-document|material-type-document|s-type-page/i.test(cls)) return 'document';
  return classifyFromHref(href);
}

// Titles shaped like "Biology - 3110: GeeA p1 T2" are course-profile links, not materials
const COURSE_TITLE_SHAPE = /-\s*\d{3,5}\s*:\s*\w+\s+p\d+/i;

function parseMaterialsDoc(doc: Document, courseId: string, currentFolderId: string | null): MaterialItem[] {
  const items: MaterialItem[] = [];
  const seen = new Set<string>();

  /**
   * Links that must never become tree items: mailto links, the course/materials
   * root itself, and — critically — the folder we are currently inside.
   * Schoology folder pages link back to themselves (and inline-expanded
   * subfolders re-list their parents), which made the tree expand itself
   * recursively until the page froze.
   */
  function isSelfOrJunk(href: string, title: string): boolean {
    if (/^mailto:/i.test(href)) return true;
    if (COURSE_TITLE_SHAPE.test(title)) return true;
    try {
      const u = new URL(href);
      if (u.hostname.endsWith('schoology.com')) {
        const f = u.searchParams.get('f');
        if (f && f === currentFolderId) return true; // self-link
        const p = u.pathname.replace(/\/$/, '');
        // A bare materials root (no folder param) is never a material item.
        // Section id and course-alias id differ, so match ANY course id here.
        if (!f && (/^\/course\/\d+\/materials$/.test(p) || p === `/course/${courseId}`)) return true;
      }
    } catch { /* relative/odd URL — keep */ }
    return false;
  }

  // Strategy 1: look for .item-row / .material-row inside main content cols
  const contentCandidates = [
    '#center-col',
    '#main-content',
    '#center-wrapper',
    '.materials-list',
    '.item-list',
  ];
  let container: Element | null = null;
  for (const sel of contentCandidates) {
    container = doc.querySelector(sel);
    if (container) break;
  }

  (container ?? doc).querySelectorAll('.item-row, .material-row').forEach((row) => {
    const anchor = row.querySelector('a') as HTMLAnchorElement | null;
    if (!anchor) return;
    const titleEl = row.querySelector('.item-title, .title, [class*="title"]');
    const title = (
      cleanText(titleEl?.querySelector('a') ?? titleEl) || cleanText(anchor)
    ).split('\n')[0].trim();
    if (!title || title.length < 2 || isMaterialsNav(anchor, title)) return;
    const href = anchor.href || '';
    if (isNavHref(href) || isSelfOrJunk(href, title)) return;
    const key = href || title;
    if (seen.has(key)) return;
    seen.add(key);

    const type = classifyFromElement(row, href);

    const dueEl = row.querySelector('.due-date, .submission-deadline, .deadline, .item-due');
    const dueDate = dueEl?.textContent?.replace(/\bdue\b/i, '').trim() || null;

    const descEl = row.querySelector('.item-summary, .summary, .description, .item-description, .short-description');
    const description = descEl?.textContent?.trim().slice(0, 160) || null;

    items.push({
      type,
      title,
      href: href || null,
      id: href.match(/[?&]f=(\d+)/)?.[1] ?? null,
      dueDate,
      description,
    });
  });

  if (items.length > 0) return items;

  // Strategy 2: scan all links, strict filtering
  const fileTitles = new Set<string>(); // file rows render TWO anchors (direct attachment + gp viewer) — keep one
  (container ?? doc.body).querySelectorAll('a[href]').forEach((a) => {
    const anchor = a as HTMLAnchorElement;
    const href = anchor.href;
    const title = cleanText(anchor);

    if (!title || title.length < 2) return;
    if (isMaterialsNav(anchor, title) || isNavHref(href) || isSelfOrJunk(href, title)) return;
    if (seen.has(href || title)) return;

    // Keep links that are: any course's materials URL (folders use the SECTION
    // id but files/items use the parent COURSE id — they differ!), known
    // content URLs (assignment/discussion/page have NO course id at all,
    // e.g. /assignment/1234567), or external.
    const isMaterialsLink = /\/course\/\d+\/materials/.test(href);
    const isContentLink = /\/(assignment|discussion|page|quiz|test|album|event|attachment|external_tool|link)\/\d/.test(href)
      || /\/(assignment|discussion|page|quiz)\//.test(href)
      || /\/link\/view\//.test(href)
      || /\/link\?/.test(href);
    const isFolder = /[?&]f=\d+/.test(href);
    const isExternal = !href.includes('schoology.com');
    if (!isMaterialsLink && !isExternal && !isContentLink) return;

    // File items: direct attachment link + /materials/gp/ viewer link share a
    // title — keep whichever comes first (the direct attachment link)
    const isFileLink = /\/attachment\/\d+\/source\//.test(href) || /\/materials\/gp\/\d+/.test(href);
    if (isFileLink) {
      if (fileTitles.has(title)) return;
      fileTitles.add(title);
    }

    seen.add(href || title);

    // Real filename (with extension) lives in the tooltip aria-label
    const fileName = isFileLink
      ? (anchor.getAttribute('aria-label') ?? anchor.querySelector('[aria-label]')?.getAttribute('aria-label') ?? null)
      : null;

    const fk = isFileLink ? detectFileKind(href, `${title} ${fileName ?? ''}`) : null;
    items.push({
      type: isFolder ? 'folder'
        : isExternal ? 'link'
        : fk === 'image' ? 'media'
        : classifyFromHref(href),
      title,
      href,
      id: href.match(/[?&]f=(\d+)/)?.[1] ?? null,
      dueDate: null,
      description: null,
      fileName,
    });
  });

  return items;
}

// ── Course href resolver ──────────────────────────────────────────────────────

// Session cache — survives until extension reloads
let hrefCache: Map<string, string> | null = null;

/**
 * Background-fetch the grades page and extract course name → href map.
 * Result is cached for the session so this only runs once.
 */
/** Fetch a Schoology page and extract all unique /course/{id} hrefs with their link text */
async function extractCourseLinksFromPage(url: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await sgyFetch(url);
    if (!res.ok) return map;
    const html = await res.text();
    if (html.includes('id="edit-mail"') || html.includes('accounts.google.com')) return map;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('a[href*="/course/"]').forEach((a) => {
      const href = (a as HTMLAnchorElement).href;
      if (!href) return;
      const text = a.textContent?.trim() ?? '';
      if (text.length > 2) map.set(text, href);
      // Also key by course ID so we can look up by any partial match
    });
  } catch { /* ignore */ }
  return map;
}

export async function fetchCourseHrefs(): Promise<Map<string, string>> {
  if (hrefCache) return hrefCache;

  // course-dashboard has real /course/{id} links for every enrolled course
  const map = await extractCourseLinksFromPage(`${SGY_ORIGIN}/home/course-dashboard`);

  // Fallback: also try home page
  if (map.size === 0) {
    const fallback = await extractCourseLinksFromPage(`${SGY_ORIGIN}/home`);
    fallback.forEach((v, k) => map.set(k, v));
  }

  console.log('[BS] fetchCourseHrefs found', map.size, 'links');
  hrefCache = map;
  return map;
}

/**
 * Resolve the materials URL for a course, fetching hrefs in background if needed.
 */
/** Read section ID directly from .gradebook-course div IDs in the live DOM */
function hrefFromLiveDOM(courseName: string): string | null {
  for (const div of document.querySelectorAll('.gradebook-course')) {
    const link = div.querySelector('.gradebook-course-title a');
    const rawTitle = link?.textContent?.trim() ?? '';
    if (!rawTitle) continue;
    const m = rawTitle.match(/^(.+?)\s*-\s*\d+:\s*/);
    const parsed = m ? m[1].trim() : rawTitle.split(/\s*-\s*\d+:|:/)[0].trim();
    if (parsed !== courseName) continue;
    // div id = "s-js-gradebook-course-{sectionId}"
    const sectionId = (div as HTMLElement).id?.replace('s-js-gradebook-course-', '');
    if (sectionId && /^\d+$/.test(sectionId)) {
      const href = `${SGY_ORIGIN}/course/${sectionId}`;
      console.log('[BS] materials href from live DOM:', href);
      return href;
    }
  }
  return null;
}

export async function resolveMaterialsUrl(courseName: string, storedHref: string): Promise<string | null> {
  // 1. Stored href from last scrape
  if (storedHref) {
    const url = materialsUrlFromCourseHref(storedHref);
    if (url) return url;
  }
  // 2. Live DOM (content script has direct document access)
  const liveHref = hrefFromLiveDOM(courseName);
  if (liveHref) {
    const url = materialsUrlFromCourseHref(liveHref);
    if (url) return url;
  }
  // 3. Background-fetch grades page
  const map = await fetchCourseHrefs();
  const href = map.get(courseName) ?? '';
  console.log('[BS] fetchCourseHrefs map entry for', courseName, '→', href);
  return materialsUrlFromCourseHref(href);
}

// ── Main fetch function ───────────────────────────────────────────────────────

export async function fetchMaterials(materialsUrl: string): Promise<MaterialsResult> {
  try {
    const response = await sgyFetch(materialsUrl);

    if (!response.ok) {
      return { success: false, courseTitle: '', items: [], error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // Auth redirect check
    if (
      html.includes('id="edit-mail"') ||
      html.includes('accounts.google.com') ||
      html.includes('name="lt"')
    ) {
      return { success: false, courseTitle: '', items: [], error: 'Session expired — visit Schoology to log back in' };
    }
    if (isWafChallenge(html)) {
      return { success: false, courseTitle: '', items: [], error: WAF_ERROR };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const courseTitle =
      doc.querySelector('h1.page-title, .course-title, h1')?.textContent?.trim() ?? '';

    const courseId = materialsUrl.match(/\/course\/(\d+)/)?.[1] ?? '';
    const currentFolderId = materialsUrl.match(/[?&]f=(\d+)/)?.[1] ?? null;
    const items = parseMaterialsDoc(doc, courseId, currentFolderId);

    return { success: true, courseTitle, items, error: null };
  } catch (err) {
    return {
      success: false,
      courseTitle: '',
      items: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Folder fetch (for drilling into a folder) ─────────────────────────────────

export async function fetchFolderContents(folderUrl: string, folderTitle: string, folderId: string): Promise<FolderContents> {
  const result = await fetchMaterials(folderUrl);
  return {
    folderId,
    folderTitle,
    items: result.items,
  };
}

// ── Rich body extraction (sanitized tree, native render) ─────────────────────

const ALLOWED_TAGS = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 'br', 'a', 'img', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'pre', 'code', 'span',
]);
const DROP_TAGS = new Set(['script', 'style', 'noscript', 'iframe', 'form', 'nav', 'svg', 'button', 'input', 'select']);

function nodeToRich(node: Node): RichNode[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (!text.trim()) return [];
    return [{ t: 'text', text }];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (tag === 'iframe') {
    // Teachers embed Slides/YouTube as iframes in page bodies — surface them
    // as links (the click router opens them in the inline embed viewer)
    const src = el.getAttribute('src') ?? '';
    if (googleEmbedUrl(src)) {
      return [{ t: 'el', tag: 'a', href: src, children: [{ t: 'text', text: '▶ Open embedded content' }] }];
    }
    return [];
  }
  if (DROP_TAGS.has(tag)) return [];
  // Skip Schoology chrome that leaks into content containers
  if (/\b(breadcrumb|course-nav|sidebar|left-col|right-col|action-links|dropdown|infotip|comment-form|s-comments?-form|notification|reminders|upcoming)\b/i.test(el.className || '')) return [];

  if (tag === 'img') {
    const src = (el as HTMLImageElement).src;
    if (!src || src.startsWith('data:')) return [];
    return [{ t: 'el', tag: 'img', src, children: [] }];
  }
  if (tag === 'br') return [{ t: 'el', tag: 'br', children: [] }];

  const children = Array.from(el.childNodes).flatMap(nodeToRich);
  if (tag === 'a') {
    const href = (el as HTMLAnchorElement).href;
    if (!href) return children;
    return [{ t: 'el', tag: 'a', href, children: children.length ? children : [{ t: 'text', text: href }] }];
  }
  if (!ALLOWED_TAGS.has(tag)) return children; // unwrap unknown tags, keep their content
  if (children.length === 0) return [];
  return [{ t: 'el', tag, children }];
}

/** Extract a sanitized rich tree from a known content container element. */
export function extractRichBody(container: Element): RichNode[] {
  return Array.from(container.childNodes).flatMap(nodeToRich);
}

// Containers that hold ONLY authored content (safe for rich extraction).
// Deliberately excludes #center-col / body — those include page chrome.
// NOTE: Schoology renders page bodies as `s-page-content-full` (one class
// token!) — match any s-page-content* variant, not just the bare class.
const RICH_CONTENT_SELECTORS = [
  '[class*="s-page-content"]',
  '.s-page-summary',
  '.info-body',
  '.assignment-body',
  '.discussion-prompt',
  '.course-info-wrapper .body',
] as const;

function findRichContainer(doc: Document): Element | null {
  for (const sel of RICH_CONTENT_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el && (el.textContent ?? '').trim().length > 0) return el;
  }
  return null;
}

/** First selector match (in selector order) that has non-empty text. */
function firstNonEmptyText(scope: Element, selectors: string[]): string | null {
  for (const sel of selectors) {
    for (const m of Array.from(scope.querySelectorAll(sel))) {
      const t = m.textContent?.trim();
      if (t) return t;
    }
  }
  return null;
}

// ── Discussion fetch (native thread viewer) ──────────────────────────────────

export async function fetchDiscussion(url: string): Promise<FetchedDiscussion> {
  try {
    const res = await sgyFetch(url);
    if (!res.ok) return { success: false, title: '', prompt: [], posts: [], error: `HTTP ${res.status}` };
    const html = await res.text();
    if (html.includes('id="edit-mail"') || html.includes('accounts.google.com')) {
      return { success: false, title: '', prompt: [], posts: [], error: 'Session expired' };
    }
    if (isWafChallenge(html)) {
      return { success: false, title: '', prompt: [], posts: [], error: WAF_ERROR };
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const title = doc.querySelector('h1.page-title, .page-title, h1')?.textContent?.trim() ?? '';

    const promptEl = findRichContainer(doc) ?? doc.querySelector('.discussion-view .body, .discussion-body');
    const prompt = promptEl ? extractRichBody(promptEl) : [];

    const posts: DiscussionPost[] = [];
    const seen = new Set<string>();
    const postEls = doc.querySelectorAll(
      '.s-comments-list .comment, ul.comment-list li.comment, .discussion-card, div.comment[id^="comment"]'
    );
    const candidates = postEls.length > 0 ? postEls : doc.querySelectorAll('.comment');
    candidates.forEach((el) => {
      // Avoid nested duplicates: only take elements whose closest .comment is themselves
      const closest = el.closest('.comment, .discussion-card');
      if (closest && closest !== el) return;
      // Ordered search, first NON-EMPTY text wins — a comma-list querySelector
      // returns the avatar <a href="/user/..."><img/></a> (no text) first.
      const author = firstNonEmptyText(el, [
        '.comment-author a', '.comment-author', 'h3 a[href*="/user/"]', 'header a[href*="/user/"]',
        'a[href*="/user/"]', '.author a', '.author', 'h3', 'h4',
      ]) ?? 'Unknown';
      const body =
        el.querySelector('.comment-body-wrapper, .comment-body, .comment-text, p')?.textContent?.trim() ?? '';
      if (!body) return;
      const key = author + '|' + body.slice(0, 80);
      if (seen.has(key)) return;
      seen.add(key);
      const time = firstNonEmptyText(el, [
        '.comment-time', 'time', '.created', '.date', 'span[class*="time"]', 'span[class*="date"]',
      ]);
      // Delete action only exists on the user's own comments
      const deleteHref = (el.querySelector('a[href*="/comment/delete/"]') as HTMLAnchorElement | null)?.href ?? null;
      posts.push({ author, time, body, deleteHref });
    });

    return { success: true, title, prompt, posts, error: null };
  } catch (err) {
    return { success: false, title: '', prompt: [], posts: [], error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Assignment submissions (dropbox) ──────────────────────────────────────────

/**
 * Parse the server-rendered "Submissions" right-rail on an assignment page
 * (.drop-item-display-own): revision list + the submit/re-submit popup link.
 * Verified live in extension/.debug/raw-assignment.html.
 */
function parseSubmissionInfo(doc: Document, baseUrl: string): SubmissionInfo | null {
  const submitAnchor = doc.querySelector('.submit-assignment a[href*="/dropbox/submit"], a.dropbox-submit') as HTMLAnchorElement | null;
  const rail = doc.querySelector('.drop-item-display-own, #dropbox-revisions');
  if (!submitAnchor && !rail) return null;

  const revisions: SubmissionRevision[] = [];
  rail?.querySelectorAll('li').forEach((li) => {
    const a = li.querySelector('a[href*="/dropbox/view/"]') as HTMLAnchorElement | null;
    const clone = li.cloneNode(true) as Element;
    clone.querySelectorAll('script, .infotip-content').forEach((n) => n.remove());
    // Normalize NBSP etc. before matching
    const text = (clone.textContent ?? '').replace(/[\s ]+/g, ' ').trim();
    let title = a ? cleanText(a) : text.match(/Revision \d+\s*\w*/)?.[0] ?? '';
    // Anchor text glues on the subtitle ("Revision 1 submitted1 item · On time")
    title = title.replace(/(\d+\s*items?\b|·).*$/i, '').replace(/submitted.*$/i, 'submitted').trim();
    if (!title) return;
    const status = text.replace(/ /g, ' ').match(/(On time|Late|Missing)/)?.[1] ?? '';
    const time = text.match(/\w{3} \d{1,2}, \d{4} at [\d:]+ [ap]m/)?.[0] ?? '';
    revisions.push({ title, status, time, href: a?.href ?? null });
  });

  let submitHref = submitAnchor?.getAttribute('href') ?? null;
  if (submitHref) {
    try { submitHref = new URL(submitHref, baseUrl).toString(); } catch { /* keep */ }
  }
  if (!submitHref && revisions.length === 0) return null;

  return {
    submitHref: submitHref ?? '',
    submitLabel: submitAnchor ? cleanText(submitAnchor) || 'Submit Assignment' : '',
    revisions,
  };
}

/**
 * Submit a TEXT submission ("Create" mode) by replaying Schoology's dropbox
 * submit form: GET /assignment/{id}/dropbox/submit, find the form containing
 * textarea[name="submission"], copy hidden fields (form_token etc.), set the
 * text, POST back. File uploads are a separate flow (plupload) — not here.
 */
export async function submitDropboxText(submitUrl: string, text: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await sgyFetch(submitUrl);
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const html = await res.text();
    if (isWafChallenge(html)) return { success: false, error: WAF_ERROR };
    if (html.includes('id="edit-mail"') || html.includes('accounts.google.com')) {
      return { success: false, error: 'Session expired' };
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // The submit page has multiple forms (upload / create tabs) — we want the
    // one with the "submission" textarea (typed text submission)
    let form: HTMLFormElement | null = null;
    let taName = 'submission';
    for (const f of Array.from(doc.querySelectorAll('form'))) {
      if (f.querySelector('textarea[name="submission"]')) { form = f as HTMLFormElement; break; }
    }
    if (!form) {
      // fall back to any dropbox form with a textarea
      for (const f of Array.from(doc.querySelectorAll('form[action*="dropbox/submit"]'))) {
        const ta = f.querySelector('textarea');
        if (ta?.getAttribute('name')) { form = f as HTMLFormElement; taName = ta.getAttribute('name')!; break; }
      }
    }
    if (!form) return { success: false, error: 'No text-submission form found — use Schoology to submit files' };

    const actionUrl = new URL(form.getAttribute('action') || submitUrl, submitUrl).toString();
    const body = new URLSearchParams();
    // The form has MULTIPLE submit buttons sharing name="op" (Submit / Save
    // Draft) — setting all of them made the last one win and saved a DRAFT
    // instead of submitting. Collect them and pick the real Submit.
    const submitButtons: string[] = [];
    form.querySelectorAll('input').forEach((inp) => {
      const name = inp.getAttribute('name');
      if (!name || name === taName) return;
      const type = (inp.getAttribute('type') || 'text').toLowerCase();
      if (type === 'submit') { submitButtons.push(inp.getAttribute('value') ?? ''); return; }
      if (type === 'button' || type === 'image' || type === 'file') return;
      if ((type === 'checkbox' || type === 'radio') && !inp.hasAttribute('checked')) return;
      body.set(name, inp.getAttribute('value') ?? '');
    });
    const opValue =
      submitButtons.find((v) => /^submit$/i.test(v.trim())) ??
      submitButtons.find((v) => /submit/i.test(v) && !/draft/i.test(v)) ??
      submitButtons[0] ?? 'Submit';
    body.set('op', opValue);
    body.set(taName, text);

    const post = await fetch(actionUrl, {
      method: 'POST',
      credentials: 'include',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!post.ok) return { success: false, error: `Submit failed: HTTP ${post.status}` };
    const postHtml = await post.text();
    if (isWafChallenge(postHtml)) return { success: false, error: WAF_ERROR };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Discussion comment posting ────────────────────────────────────────────────

/**
 * Post a comment by replaying Schoology's own reply form: fetch the discussion
 * page, find the form containing a textarea, copy every hidden/checked input
 * (form_token, form_build_id, etc.), set the textarea field to `text`, and
 * POST it with credentials — exactly what the browser would submit.
 */
export async function postDiscussionComment(discussionUrl: string, text: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await sgyFetch(discussionUrl);
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const html = await res.text();
    if (html.includes('id="edit-mail"') || html.includes('accounts.google.com')) {
      return { success: false, error: 'Session expired' };
    }
    if (isWafChallenge(html)) {
      return { success: false, error: WAF_ERROR };
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Canonical post form (verified live: #s-comments-post-comment-form with
    // textarea[name="comment"]); fall back to any form containing a textarea
    let form: HTMLFormElement | null = doc.querySelector('#s-comments-post-comment-form');
    let textarea: Element | null = form?.querySelector('textarea') ?? null;
    if (!form || !textarea) {
      for (const f of Array.from(doc.querySelectorAll('form'))) {
        const ta = f.querySelector('textarea');
        if (ta) { form = f as HTMLFormElement; textarea = ta; break; }
      }
    }
    if (!form || !textarea) {
      return { success: false, error: 'No comment form found on this discussion' };
    }
    const taName = textarea.getAttribute('name');
    if (!taName) return { success: false, error: 'Comment form not recognized' };

    const actionAttr = form.getAttribute('action') || discussionUrl;
    const actionUrl = new URL(actionAttr, discussionUrl).toString();

    const body = new URLSearchParams();
    form.querySelectorAll('input').forEach((inp) => {
      const name = inp.getAttribute('name');
      if (!name || name === taName) return;
      const type = (inp.getAttribute('type') || 'text').toLowerCase();
      if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') return;
      if ((type === 'checkbox' || type === 'radio') && !inp.hasAttribute('checked')) return;
      body.set(name, inp.getAttribute('value') ?? '');
    });
    form.querySelectorAll('select').forEach((sel) => {
      const name = sel.getAttribute('name');
      if (!name) return;
      const opt = sel.querySelector('option[selected]') ?? sel.querySelector('option');
      if (opt) body.set(name, opt.getAttribute('value') ?? opt.textContent ?? '');
    });
    // Drupal-style forms route on the submit button's name/value ("op")
    const submit = form.querySelector('input[type="submit"], button[type="submit"]');
    const submitName = submit?.getAttribute('name');
    if (submitName) {
      body.set(submitName, submit?.getAttribute('value') ?? submit?.textContent?.trim() ?? 'Submit');
    }
    body.set(taName, text);

    const post = await fetch(actionUrl, {
      method: 'POST',
      credentials: 'include',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!post.ok) return { success: false, error: `Post failed: HTTP ${post.status}` };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete the user's own comment. Schoology uses a Drupal-style two-step:
 * GET /comment/delete/{id} returns a confirm form (form_build_id + form_token
 * + submit "Delete") which must be POSTed back to the same URL. Verified live
 * in extension/.debug/delete-form.html.
 */
export async function deleteDiscussionComment(deleteHref: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await sgyFetch(deleteHref);
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const html = await res.text();
    if (isWafChallenge(html)) return { success: false, error: WAF_ERROR };
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const form = (doc.querySelector('#s-comment-delete-comment-form') ?? doc.querySelector('form')) as HTMLFormElement | null;
    if (!form) return { success: false, error: 'No delete confirmation form found' };

    const actionUrl = new URL(form.getAttribute('action') || deleteHref, deleteHref).toString();
    const body = new URLSearchParams();
    form.querySelectorAll('input').forEach((inp) => {
      const name = inp.getAttribute('name');
      if (!name) return;
      const type = (inp.getAttribute('type') || 'text').toLowerCase();
      if (type === 'submit') { body.set(name, inp.getAttribute('value') ?? 'Delete'); return; }
      if (type === 'button' || type === 'image' || type === 'file') return;
      body.set(name, inp.getAttribute('value') ?? '');
    });

    const post = await fetch(actionUrl, {
      method: 'POST',
      credentials: 'include',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!post.ok) return { success: false, error: `Delete failed: HTTP ${post.status}` };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── File blob fetch (inline PDF viewer) ──────────────────────────────────────

/**
 * Fetch a Schoology file via the BACKGROUND worker and return an object URL.
 * Attachment URLs 302 to files-cdn.schoology.com — cross-origin, so a content
 * script fetch dies on CORS; the background worker is exempt (host_permissions).
 * Wrapping the bytes in a typed Blob also bypasses Content-Disposition:
 * attachment so PDFs render in <embed> instead of downloading.
 * Caller must URL.revokeObjectURL when done.
 */
export async function fetchFileBlobUrl(url: string, mime: string): Promise<{ blobUrl: string | null; error: string | null }> {
  try {
    const resp = await browser.runtime.sendMessage({ type: 'fetch-file', url }) as
      { ok: boolean; base64?: string; contentType?: string; error?: string };
    if (!resp?.ok || !resp.base64) {
      return { blobUrl: null, error: resp?.error ?? 'Background fetch failed' };
    }
    const binary = atob(resp.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime || resp.contentType || 'application/octet-stream' });
    return { blobUrl: URL.createObjectURL(blob), error: null };
  } catch (err) {
    return { blobUrl: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Item content fetch (native viewer) ───────────────────────────────────────

export async function fetchItemContent(url: string): Promise<FetchedContent> {
  try {
    const res = await sgyFetch(url);
    if (!res.ok) return { success: false, title: '', paragraphs: [], body: [], attachments: [], submission: null, error: `HTTP ${res.status}` };
    const html = await res.text();
    if (html.includes('id="edit-mail"') || html.includes('accounts.google.com')) {
      return { success: false, title: '', paragraphs: [], body: [], attachments: [], submission: null, error: 'Session expired' };
    }
    if (isWafChallenge(html)) {
      return { success: false, title: '', paragraphs: [], body: [], attachments: [], submission: null, error: WAF_ERROR };
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const title = cleanText(doc.querySelector('h1.page-title, .page-title, h1'))
      .replace(/\s*\d+\s+lesson plans?\s*$/i, '');

    // Primary content area selectors (most specific → most general).
    // NOTE: never use .content-wrapper here — on Schoology it wraps the whole
    // page including the notification-settings form and right-rail widgets.
    const content = (
      doc.querySelector('.s-page-content') ??
      doc.querySelector('.info-body') ??
      doc.querySelector('.assignment-body') ??
      doc.querySelector('.submission-info') ??
      doc.querySelector('#center-col') ??
      doc.querySelector('#main-content') ??
      doc.body
    );

    const paragraphs: ContentParagraph[] = [];
    const seen = new Set<string>();

    // Due date
    const dueEl = content.querySelector('.submission-deadline, .due-date-time, .deadline, .due-date, .assignment-due');
    if (dueEl) {
      const txt = dueEl.textContent?.replace(/\bdue\b/i, '').trim() ?? '';
      if (txt) { paragraphs.push({ kind: 'duedate', text: txt }); seen.add(txt); }
    }

    // Text content blocks
    content.querySelectorAll('h2, h3, p, li, .body-wrapper').forEach((el) => {
      if (el.closest(
        '.sidebar, .left-col, #left-col, .right-col, #right-col, .attachments-viewer, ' +
        '.breadcrumb, nav, .course-nav, form, header, footer, #footer, #header, ' +
        '.reminders, .upcoming-events, .upcoming-list, #notifications, ' +
        '.notification-settings, [class*="notification"], .page-title-wrapper, .dropdown, .infotip, ' +
        '#comments, .comments, .s-comments, .comment, .discussion-comments'
      )) return;
      const text = el.textContent?.trim() ?? '';
      if (!text || text.length < 3 || seen.has(text) || isNavText(text)) return;
      seen.add(text);
      const tag = el.tagName.toLowerCase();
      if (tag === 'h2') paragraphs.push({ kind: 'h2', text });
      else if (tag === 'h3') paragraphs.push({ kind: 'h3', text });
      else if (tag === 'li') paragraphs.push({ kind: 'bullet', text });
      else paragraphs.push({ kind: 'text', text });
    });

    // Rich body — only from containers known to hold authored content
    const richContainer = findRichContainer(doc);
    const body = richContainer ? extractRichBody(richContainer) : [];

    // Attachments — dedupe by attachment ID (a file appears as both
    // /attachment/{id}/source/file.pdf and /attachment/{id}/docviewer)
    const attachments: ContentAttachment[] = [];
    const attSeen = new Set<string>();
    doc.querySelectorAll(
      '.attachments-viewer a[href], .attachment-row a[href], .s-attachments a[href], ' +
      '.attachments a[href*="/attachment/"], .attachments-file-name a[href], a[href*="/attachment/"], ' +
      // Web-link attachments (Google Slides etc.) live in .attachments-link
      '.attachments-link a[href]'
    ).forEach((a) => {
      const href = (a as HTMLAnchorElement).href;
      if (!href || /\/docviewer(\?|$)/.test(href)) return;
      const ttl = cleanText(a);
      if (!ttl || isNavText(ttl)) return;
      const attId = href.match(/\/attachment\/(\d+)/)?.[1] ?? href;
      if (attSeen.has(attId)) return;
      attSeen.add(attId);
      const row = a.closest('.attachment-row, .s-attachment, .attachments-file, li');
      const sizeEl = row?.querySelector('.file-size, .size, .filesize, .attachments-file-size');
      attachments.push({ title: ttl, href, fileSize: sizeEl?.textContent?.trim() });
    });

    // Image file-viewer pages render a bare <img src="/attachment/…/source/…">
    // with NO anchor at all — surface it as an attachment so the viewer's
    // single-attachment auto-redirect can open it inline.
    if (attachments.length === 0) {
      doc.querySelectorAll('img[src*="/attachment/"]').forEach((img) => {
        const src = (img as HTMLImageElement).src;
        if (!src || attSeen.has(src)) return;
        attSeen.add(src);
        attachments.push({ title: title || 'Image', href: src });
      });
    }

    return { success: true, title, paragraphs, body, attachments, submission: parseSubmissionInfo(doc, url), error: null };
  } catch (err) {
    return {
      success: false,
      title: '',
      paragraphs: [],
      body: [],
      attachments: [],
      submission: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
