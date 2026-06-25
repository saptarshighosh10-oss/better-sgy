import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ScrapedCourse, ScrapedAssignment } from '../../lib/schemas';
import { courseAbbr, abbrFontSize } from '../../lib/course-colors';
import {
  fetchMaterials,
  fetchItemContent,
  fetchDiscussion,
  fetchFileBlobUrl,
  postDiscussionComment,
  deleteDiscussionComment,
  submitDropboxText,
  submitDropboxFiles,
  resolveMaterialsUrl,
  resolveLinkWrapper,
  googleEmbedUrl,
  detectFileKind,
  type MaterialItem,
  type FetchedContent,
  type FetchedDiscussion,
  type RichNode,
} from '../../lib/fetch-materials';
import { loadStarredFolders, toggleStarredFolder, type StarredFolder } from '../../lib/starred-folders';
import { T, getActiveTheme, onThemeChange, inkOnAccent } from '../../lib/theme';
import { tileBg, hairline } from '../../lib/halo';
import { openSafe } from '../../lib/safe-url';

interface GradesState { courses: ScrapedCourse[]; }
interface Props { grades: GradesState; }

interface FolderEntry {
  status: 'loading' | 'done' | 'error';
  items: MaterialItem[];
  // Once a folder is loaded we keep its items and just flip this flag on
  // toggle, so the close can play the reverse roll-up animation (and re-open
  // is instant). Deleting the entry would unmount it before it could animate.
  collapsed?: boolean;
}

// A starred folder pinned to the top of the page, viewed independently of
// whichever course is currently selected in the sidebar.
interface PinnedFolder {
  href: string;
  title: string;
  courseName: string;
  status: 'loading' | 'done' | 'error';
  items: MaterialItem[];
  errorMsg?: string;
}

type Viewer =
  | { kind: 'content'; data: FetchedContent | null; url: string; title: string }
  | { kind: 'discussion'; data: FetchedDiscussion | null; url: string; title: string }
  | { kind: 'file'; fileKind: 'pdf' | 'image'; url: string; title: string }
  | { kind: 'embed'; embedUrl: string; originalUrl: string; title: string }
  | { kind: 'native'; url: string; title: string }
  | null;

// ── Icons ─────────────────────────────────────────────────────────────────────

const ICON_PATHS: Record<string, string> = {
  folder:     'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  link:       'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  assignment: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  quiz:       'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  document:   'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  media:      'M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  discussion: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  unknown:    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};

const TYPE_COLOR: Record<string, string> = {
  folder: T.folder, link: T.link, assignment: T.assign, quiz: T.assign,
  document: T.doc, media: T.muted, discussion: T.discussion, unknown: T.faint,
};

function ItemIcon({ type, size = 15 }: { type: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={TYPE_COLOR[type] ?? T.faint} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ flexShrink: 0 }}>
      <path d={ICON_PATHS[type] ?? ICON_PATHS.unknown} />
    </svg>
  );
}

const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z';

function StarIcon({ filled, size = 13 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? '#f59e0b' : 'none'}
      stroke={filled ? '#f59e0b' : T.faint}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}>
      <path d={STAR_PATH} />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MaterialsPage({ grades }: Props) {
  const { courses } = grades;
  const [selected, setSelected] = useState<ScrapedCourse | null>(courses[0] ?? null);
  const [items, setItems] = useState<MaterialItem[] | null>(null);
  const [folders, setFolders] = useState<Map<string, FolderEntry>>(new Map());
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer>(null);
  const [starred, setStarred] = useState<StarredFolder[]>([]);
  const [pinnedFolder, setPinnedFolder] = useState<PinnedFolder | null>(null);

  useEffect(() => {
    loadStarredFolders().then(setStarred);
  }, []);

  // QuickNav can request a specific starred folder before navigating here —
  // it stashes it on window, we pick it up on mount and open it.
  useEffect(() => {
    const pending = (window as { __bsPendingFolder?: StarredFolder }).__bsPendingFolder;
    if (pending) {
      delete (window as { __bsPendingFolder?: StarredFolder }).__bsPendingFolder;
      void openStarredFolder(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const starredHrefs = useMemo(() => new Set(starred.map((f) => f.href)), [starred]);

  async function toggleStar(folder: StarredFolder) {
    setStarred(await toggleStarredFolder(folder));
  }

  // Open a starred folder regardless of which course is currently selected —
  // switches the sidebar/course context (if needed) and fetches the folder's
  // contents directly, pinning them above the normal materials tree.
  async function openStarredFolder(folder: StarredFolder) {
    setViewer(null);
    const course = courses.find((c) => c.name === folder.courseName);
    if (course && course.name !== selected?.name) {
      loadCourse(course); // clears pinnedFolder — so pin AFTER switching
    }
    setPinnedFolder({ ...folder, status: 'loading', items: [] });
    const result = await fetchMaterials(folder.href);
    setPinnedFolder((prev) =>
      prev && prev.href === folder.href
        ? { ...prev, status: result.success ? 'done' : 'error', items: result.items, errorMsg: result.success ? undefined : (result.error ?? 'Failed to load folder.') }
        : prev
    );
  }

  const loadCourse = useCallback(async (course: ScrapedCourse) => {
    setSelected(course);
    setItems(null);
    setFolders(new Map());
    setViewer(null);
    setPinnedFolder(null);
    setStatus('loading');
    setErrorMsg(null);

    const url = await resolveMaterialsUrl(course.name, course.href);
    if (!url) {
      setStatus('error');
      setErrorMsg('Could not resolve course URL. Make sure you are on a Schoology page.');
      return;
    }
    const result = await fetchMaterials(url);
    if (!result.success) {
      setStatus('error');
      setErrorMsg(result.error ?? 'Failed to load materials.');
    } else {
      setItems(result.items);
      setStatus('idle');
    }
  }, []);

  useEffect(() => {
    if (courses[0]) loadCourse(courses[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tree / folder loading ─────────────────────────────────────────────────

  async function toggleFolder(item: MaterialItem) {
    if (!item.href) return;
    const key = item.href;
    const existing = folders.get(key);
    if (existing?.status === 'done') {
      // Keep the items mounted and just toggle collapsed, so the roll-up close
      // animation can play (and re-opening is instant — no re-fetch).
      setFolders(prev => {
        const m = new Map(prev);
        const e = m.get(key);
        if (e) m.set(key, { ...e, collapsed: !e.collapsed });
        return m;
      });
      return;
    }
    setFolders(prev => new Map(prev).set(key, { status: 'loading', items: [] }));
    const result = await fetchMaterials(item.href!);
    setFolders(prev => new Map(prev).set(key, {
      status: result.success ? 'done' : 'error',
      items: result.items,
      collapsed: false,
    }));
  }

  // ── Viewer openers + in-viewer actions (comment / submit) ─────────────────

  async function openContent(url: string, title: string) {
    setViewer({ kind: 'content', data: null, url, title });
    const data = await fetchItemContent(url);
    // A bare file page (no real text, single viewable attachment) → jump
    // straight to the inline file viewer instead of an empty content page.
    // Never redirect away from an assignment with a dropbox — the submit
    // panel must stay visible.
    if (data.success && !data.submission && data.body.length === 0 && data.paragraphs.length <= 2 && data.attachments.length === 1) {
      const fk = detectFileKind(data.attachments[0].href, data.attachments[0].title);
      if (fk === 'pdf' || fk === 'image') {
        setViewer({ kind: 'file', fileKind: fk, url: data.attachments[0].href, title });
        return;
      }
    }
    setViewer({ kind: 'content', data, url, title });
  }

  async function openDiscussion(url: string, title: string) {
    setViewer({ kind: 'discussion', data: null, url, title });
    const data = await fetchDiscussion(url);
    setViewer({ kind: 'discussion', data, url, title });
  }

  async function postComment(url: string, title: string, text: string) {
    const result = await postDiscussionComment(url, text);
    if (result.success) {
      // Re-fetch so the new comment shows up in the thread
      const data = await fetchDiscussion(url);
      setViewer(v => (v?.kind === 'discussion' && v.url === url) ? { kind: 'discussion', data, url, title } : v);
    }
    return result;
  }

  async function deleteComment(url: string, title: string, deleteHref: string) {
    const result = await deleteDiscussionComment(deleteHref);
    if (result.success) {
      const data = await fetchDiscussion(url);
      setViewer(v => (v?.kind === 'discussion' && v.url === url) ? { kind: 'discussion', data, url, title } : v);
    }
    return result;
  }

  async function submitAssignment(url: string, title: string, submitHref: string, text: string) {
    const result = await submitDropboxText(submitHref, text);
    if (result.success) {
      // Re-fetch the assignment page so the new revision shows in the panel
      const data = await fetchItemContent(url);
      setViewer(v => (v?.kind === 'content' && v.url === url) ? { kind: 'content', data, url, title } : v);
    }
    return result;
  }

  async function submitAssignmentFiles(url: string, title: string, submitHref: string, files: File[], text: string, onProgress: (m: string) => void) {
    const result = await submitDropboxFiles(submitHref, files, text || undefined, onProgress);
    if (result.success) {
      const data = await fetchItemContent(url);
      setViewer(v => (v?.kind === 'content' && v.url === url) ? { kind: 'content', data, url, title } : v);
    }
    return result;
  }

  // ── Click router ──────────────────────────────────────────────────────────

  // Single router for every clickable href (tree items, attachments, body links).
  // Decides, in priority order, how to open a destination:
  //   1. Google/YouTube/Drive          → inline embedded iframe viewer
  //   2. External link or `link`/LTI    → new browser tab (openSafe, sanitized)
  //   3. Schoology file-viewer page     → fetch page, let it auto-redirect to the file
  //   4. Direct PDF/image              → inline file viewer
  //   5. Office doc                    → new tab (we can't render it inline)
  //   6. Discussion                    → discussion thread viewer
  //   7. Quiz / assessment            → same-origin native viewer (real engine)
  //   8. Everything else              → native content viewer
  function openHref(href: string, title: string, type?: string, fileName?: string | null) {
    // Unwrap Schoology's /link?path=… redirect to the real destination first
    const real = resolveLinkWrapper(href);
    const isExternal = !real.includes('schoology.com');

    // Google Slides/Sheets/Forms, Drive files, YouTube → inline embedded viewer
    const embedUrl = googleEmbedUrl(real);
    if (embedUrl) {
      setViewer({ kind: 'embed', embedUrl, originalUrl: real, title });
      return;
    }

    // File-page hrefs (/materials/gp/{id}) carry no extension — the real
    // filename from the row's aria-label does
    const fileKind = detectFileKind(real, `${title} ${fileName ?? ''}`);
    // Remaining external links (Google Docs etc. — editable, so a real tab)
    // and Schoology "link"/LTI materials → new tab
    if (isExternal || type === 'link') {
      openSafe(real);
      return;
    }
    href = real;
    // File-viewer pages are HTML, not the raw file — fetch the page and let
    // the single-attachment auto-redirect open the real /attachment/ URL
    if (/\/materials\/gp\/\d+/.test(href)) {
      openContent(href, title);
      return;
    }
    if (fileKind === 'pdf' || fileKind === 'image') {
      setViewer({ kind: 'file', fileKind, url: href, title });
      return;
    }
    if (fileKind === 'office') {
      openSafe(href);
      return;
    }
    if (type === 'discussion' || /\/discussion\//.test(href)) {
      openDiscussion(href, title);
      return;
    }
    // Interactive task pages (PowerSchool assessment SPA, classic quizzes/tests)
    // can't be re-rendered from scraped HTML — embed the real same-origin page
    // so the student takes the quiz without leaving Better Schoology.
    if (/\/assessments?\/\d/.test(href) || /\/common-assessment-delivery\//.test(href) || type === 'quiz' || /\/(quiz|test)\/\d/.test(href)) {
      setViewer({ kind: 'native', url: href, title });
      return;
    }
    openContent(href, title);
  }

  function openItem(item: MaterialItem) {
    if (!item.href) return;
    openHref(item.href, item.title, item.type, item.fileName);
  }

  // Assignment pages are JS-rendered (HTML fetch finds nothing) — but we
  // already have every grade from the gradebook scrape, so look it up by name.
  function findGrade(title: string): ScrapedAssignment | null {
    if (!selected) return null;
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const t = norm(title);
    if (!t) return null;
    for (const cat of selected.categories) {
      for (const a of cat.assignments) {
        const an = norm(a.name);
        if (an === t || an.startsWith(t) || t.startsWith(an)) return a;
      }
    }
    return null;
  }

  const color = tileBg();
  const abbr = selected ? courseAbbr(selected.name) : '';
  const fs = selected ? abbrFontSize(abbr) : 48;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', inset: 0, overflow: 'hidden' }}>

      {/* ── Course pill strip ─────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
        overflowX: 'auto', padding: '8px 12px',
        borderBottom: `1px solid ${T.border}`, background: T.bg,
        scrollbarWidth: 'none',
      }}>
        {courses.map(course => {
          const a = courseAbbr(course.name);
          const isActive = selected?.name === course.name;
          return (
            <button
              key={course.name}
              onClick={() => loadCourse(course)}
              title={course.name}
              style={{
                all: 'unset', flexShrink: 0, cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 6, padding: '5px 10px 5px 6px',
                borderRadius: 20, boxSizing: 'border-box',
                background: isActive ? T.activeBg : tileBg(),
                border: `1.5px solid ${isActive ? T.primary : 'transparent'}`,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: isActive ? T.primary : T.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: Math.round(abbrFontSize(a) * 0.28), fontWeight: 900, lineHeight: 1,
                  color: getActiveTheme() === 'mono-light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)',
                  userSelect: 'none',
                }} aria-hidden="true">{a}</span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: isActive ? 600 : 400,
                color: isActive ? T.text : T.muted,
                maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {course.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main panel ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Slim context bar — shows viewer breadcrumb; course already visible in pill strip */}
        {selected && viewer && (
          <div style={{ height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 6, borderBottom: `1px solid ${hairline()}`, background: T.panel }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{selected.name}</span>
            <span style={{ fontSize: 11, color: T.faint }}>›</span>
            <span style={{ fontSize: 11, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{viewer.title}</span>
          </div>
        )}

        {/* Content area — overflowAnchor off: Chrome's scroll anchoring jumps
            the container when an embedded Slides iframe changes slides */}
        <div style={{
          flex: 1,
          overflowY: viewer?.kind === 'file' || viewer?.kind === 'embed' || viewer?.kind === 'native' ? 'hidden' : 'auto',
          display: viewer?.kind === 'file' || viewer?.kind === 'embed' || viewer?.kind === 'native' ? 'flex' : 'block',
          flexDirection: 'column',
          overflowAnchor: 'none',
        }}>

          {/* Inline file viewer (PDF / image) */}
          {viewer?.kind === 'file' && (
            <FileViewer
              fileKind={viewer.fileKind}
              url={viewer.url}
              title={viewer.title}
              onBack={() => setViewer(null)}
            />
          )}

          {/* In-overlay quiz/assessment runner (same-origin native page) */}
          {viewer?.kind === 'native' && (
            <NativeTaskViewer
              url={viewer.url}
              title={viewer.title}
              onBack={() => setViewer(null)}
            />
          )}

          {/* Embedded Google Slides / Sheets / Drive / YouTube viewer */}
          {viewer?.kind === 'embed' && (
            <EmbedViewer
              embedUrl={viewer.embedUrl}
              originalUrl={viewer.originalUrl}
              title={viewer.title}
              onBack={() => setViewer(null)}
            />
          )}

          {/* Discussion thread viewer */}
          {viewer?.kind === 'discussion' && (
            <div style={{ padding: 20 }}>
              <DiscussionViewer
                data={viewer.data}
                url={viewer.url}
                title={viewer.title}
                onBack={() => setViewer(null)}
                onNavigate={openHref}
                onPost={(text) => postComment(viewer.url, viewer.title, text)}
                onDelete={(deleteHref) => deleteComment(viewer.url, viewer.title, deleteHref)}
              />
            </div>
          )}

          {/* Native content viewer */}
          {viewer?.kind === 'content' && (
            <div style={{ padding: 20 }}>
              <ContentViewer
                data={viewer.data}
                url={viewer.url}
                title={viewer.title}
                grade={findGrade(viewer.title)}
                onBack={() => setViewer(null)}
                onNavigate={openHref}
                onSubmit={(submitHref, text) => submitAssignment(viewer.url, viewer.title, submitHref, text)}
                onSubmitFiles={(submitHref, files, text, onProgress) => submitAssignmentFiles(viewer.url, viewer.title, submitHref, files, text, onProgress)}
              />
            </div>
          )}

          {!viewer && (
            <>
              {starred.length > 0 && (
                <StarredPanel
                  starred={starred}
                  activeHref={pinnedFolder?.href ?? null}
                  onOpen={openStarredFolder}
                  onUnstar={toggleStar}
                />
              )}

              {pinnedFolder ? (
                <PinnedFolderView
                  pinned={pinnedFolder}
                  folders={folders}
                  starred={starredHrefs}
                  onToggle={toggleFolder}
                  onOpen={openItem}
                  onToggleStar={toggleStar}
                  onBack={() => setPinnedFolder(null)}
                />
              ) : (
                <>
                  {status === 'loading' && (
                    <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 180 }}>
                      <span className="bs-spinner" style={{ color: T.muted }} aria-hidden="true" />
                      <span style={{ color: T.muted, fontSize: 13 }}>Loading materials…</span>
                    </div>
                  )}

                  {status === 'error' && (
                    <div style={{ padding: 20 }}>
                      <div style={{ padding: '16px 20px', background: '#1a0f0f', border: `1px solid ${T.failed}30`, borderRadius: 10, fontSize: 13, color: T.failed, lineHeight: 1.6 }}>
                        {errorMsg}
                      </div>
                    </div>
                  )}

                  {status === 'idle' && items === null && <Splash />}

                  {status === 'idle' && items !== null && (
                    items.length === 0 ? (
                      <div style={{ padding: '24px 20px', textAlign: 'center', color: T.muted, fontSize: 13 }}>
                        No materials found in this course.
                      </div>
                    ) : (
                      <div style={{ padding: '8px 0' }}>
                        <ItemTree
                          items={items}
                          depth={0}
                          folders={folders}
                          ancestors={[]}
                          onToggle={toggleFolder}
                          onOpen={openItem}
                          courseName={selected?.name ?? ''}
                          starred={starredHrefs}
                          onToggleStar={toggleStar}
                        />
                      </div>
                    )
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tree ──────────────────────────────────────────────────────────────────────

interface TreeProps {
  items: MaterialItem[];
  depth: number;
  folders: Map<string, FolderEntry>;
  ancestors: string[]; // hrefs of folders already open above us — stops self-recursion
  onToggle: (item: MaterialItem) => void;
  onOpen: (item: MaterialItem) => void;
  courseName: string;
  starred: Set<string>;
  onToggleStar: (folder: StarredFolder) => void;
}

const MAX_TREE_DEPTH = 12;

/**
 * Animated folder reveal. Uses a grid-template-rows 0fr↔1fr transition (the same
 * trick as <CourseGradebook>'s `.bs-collapse`) so the SAME motion plays in both
 * directions — rolls down on open, rolls back up on close. The content stays
 * mounted while collapsed so the close can animate (instant unmount can't), which
 * also makes re-opening snappy. Starts at 0fr on mount and flips on the next frame
 * so the first open animates too; respects reduced-motion via GlobalStyles. */
function FolderCollapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  const [rows, setRows] = useState('0fr');
  useEffect(() => {
    const id = requestAnimationFrame(() => setRows(open ? '1fr' : '0fr'));
    return () => cancelAnimationFrame(id);
  }, [open]);
  return (
    <div className="bs-collapse" style={{ gridTemplateRows: rows }}>
      <div className="bs-collapse-content" style={{ opacity: open ? 1 : 0 }}>
        {children}
      </div>
    </div>
  );
}

function ItemTree({ items, depth, folders, ancestors, onToggle, onOpen, courseName, starred, onToggleStar }: TreeProps) {
  return (
    <>
      {items.map((item, i) => {
        const folderEntry = item.href ? folders.get(item.href) : undefined;
        // A folder whose href already appears above itself in the tree would
        // expand forever (Schoology folder pages can link back to themselves)
        const isCycle = !!item.href && ancestors.includes(item.href);
        // `hasContent` = data is loaded & renderable (mounted even while collapsed
        // so the close can animate). `isOpen` = actually rolled open right now.
        const hasContent = folderEntry?.status === 'done' && !isCycle && depth < MAX_TREE_DEPTH;
        const isOpen = hasContent && !folderEntry?.collapsed;
        return (
          <React.Fragment key={(item.href ?? item.title) + i}>
            <TreeRow
              item={item}
              depth={depth}
              index={i}
              folderEntry={isCycle ? undefined : folderEntry}
              onToggle={onToggle}
              onOpen={onOpen}
              courseName={courseName}
              isStarred={!!item.href && starred.has(item.href)}
              onToggleStar={onToggleStar}
            />
            {hasContent && (
              <FolderCollapse open={isOpen}>
                {folderEntry!.items.length > 0 ? (
                  <ItemTree
                    items={folderEntry!.items}
                    depth={depth + 1}
                    folders={folders}
                    ancestors={item.href ? [...ancestors, item.href] : ancestors}
                    onToggle={onToggle}
                    onOpen={onOpen}
                    courseName={courseName}
                    starred={starred}
                    onToggleStar={onToggleStar}
                  />
                ) : (
                  <div style={{
                    padding: `6px 12px 6px ${12 + (depth + 1) * 20 + 22}px`,
                    fontSize: 12,
                    color: T.faint,
                    borderBottom: `1px solid ${T.rowBorder}`,
                  }}>
                    Empty folder
                  </div>
                )}
              </FolderCollapse>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

function TreeRow({ item, depth, index, folderEntry, onToggle, onOpen, courseName, isStarred, onToggleStar }: {
  item: MaterialItem;
  depth: number;
  index: number;
  folderEntry: FolderEntry | undefined;
  onToggle: (item: MaterialItem) => void;
  onOpen: (item: MaterialItem) => void;
  courseName: string;
  isStarred: boolean;
  onToggleStar: (folder: StarredFolder) => void;
}) {
  const isFolder = item.type === 'folder';
  // Open = loaded AND not collapsed, so the chevron rotates back on close.
  const isExpanded = folderEntry?.status === 'done' && !folderEntry?.collapsed;
  const isLoadingFolder = folderEntry?.status === 'loading';
  const hasMeta = !!(item.dueDate || item.description);
  const indent = 12 + depth * 20;

  function handleClick() {
    if (isFolder) onToggle(item);
    else if (item.href) onOpen(item);
  }

  return (
    <button
      onClick={handleClick}
      className="bs-row-enter"
      style={{
        all: 'unset',
        display: 'flex',
        alignItems: hasMeta ? 'flex-start' : 'center',
        gap: 7,
        width: '100%',
        paddingLeft: indent,
        paddingRight: 14,
        paddingTop: 9,
        paddingBottom: 9,
        cursor: item.href || isFolder ? 'pointer' : 'default',
        boxSizing: 'border-box',
        borderBottom: `1px solid ${T.rowBorder}`,
        animationDelay: `${Math.min(index, 12) * 30}ms`,
      }}
    >
      {/* Expand chevron column (folders only) */}
      <div style={{ width: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: hasMeta ? 2 : 0 }}>
        {isFolder && !isLoadingFolder && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.12s ease' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
        {isLoadingFolder && (
          <span className="bs-spinner" role="status" aria-label="Loading folder" style={{ color: T.muted, width: 10, height: 10 }} />
        )}
      </div>

      {/* Type icon */}
      <div style={{ flexShrink: 0, marginTop: hasMeta ? 1 : 0 }}>
        <ItemIcon type={item.type} size={15} />
      </div>

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
          <span style={{
            fontSize: 13,
            color: isFolder ? (getActiveTheme() !== 'original' ? T.text : '#d4b896') : T.text,
            fontWeight: isFolder ? 500 : 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {item.title}
          </span>
          {item.fileSize && (
            <span style={{ fontSize: 10, color: T.faint, flexShrink: 0 }}>{item.fileSize}</span>
          )}
        </div>
        {item.dueDate && (
          <div style={{ fontSize: 11, color: T.primary, marginTop: 2 }}>Due {item.dueDate}</div>
        )}
        {item.description && (
          <div style={{ fontSize: 11, color: '#4a5a70', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.description}
          </div>
        )}
      </div>

      {/* Star toggle (folders only) — cross-course quick access */}
      {isFolder && item.href && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onToggleStar({ href: item.href!, title: item.title, courseName }); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onToggleStar({ href: item.href!, title: item.title, courseName });
            }
          }}
          style={{ display: 'flex', alignItems: 'center', flexShrink: 0, cursor: 'pointer', padding: 4, marginTop: hasMeta ? -2 : 0, marginRight: -6, borderRadius: 4 }}
          title={isStarred ? 'Remove from Starred' : 'Add to Starred'}
        >
          <StarIcon filled={isStarred} size={13} />
        </span>
      )}
    </button>
  );
}

// ── Starred folders quick-access panel ─────────────────────────────────────────

function StarredPanel({ starred, activeHref, onOpen, onUnstar }: {
  starred: StarredFolder[];
  activeHref: string | null;
  onOpen: (folder: StarredFolder) => void;
  onUnstar: (folder: StarredFolder) => void;
}) {
  return (
    <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: T.muted, letterSpacing: '-0.01em', marginBottom: 7 }}>
        Starred
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {starred.map((folder) => {
          const c = T.muted;
          const isActive = folder.href === activeHref;
          return (
            <div
              key={folder.href}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(folder)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(folder); } }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                maxWidth: 220, padding: '6px 8px 6px 10px', borderRadius: 8,
                background: isActive ? T.activeBg : T.card,
                border: `1px solid ${isActive ? T.activeBorder : T.border}`,
                cursor: 'pointer',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} aria-hidden="true" />
              <ItemIcon type="folder" size={13} />
              <span style={{ fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {folder.title}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onUnstar(folder); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onUnstar(folder); } }}
                style={{ display: 'flex', alignItems: 'center', flexShrink: 0, cursor: 'pointer', padding: 2, marginLeft: 2, borderRadius: 4 }}
                title="Remove from Starred"
              >
                <StarIcon filled size={12} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Pinned (starred) folder view ────────────────────────────────────────────────

function PinnedFolderView({ pinned, folders, starred, onToggle, onOpen, onToggleStar, onBack }: {
  pinned: PinnedFolder;
  folders: Map<string, FolderEntry>;
  starred: Set<string>;
  onToggle: (item: MaterialItem) => void;
  onOpen: (item: MaterialItem) => void;
  onToggleStar: (folder: StarredFolder) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${T.border}` }}>
        <button onClick={onBack} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: T.primary, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
          Materials
        </button>
        <span style={{ color: T.faint, fontSize: 12, flexShrink: 0 }}>/</span>
        <StarIcon filled size={12} />
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pinned.title}
        </span>
        <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>{pinned.courseName}</span>
      </div>

      {pinned.status === 'loading' && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 120 }}>
          <span className="bs-spinner" style={{ color: T.muted }} aria-hidden="true" />
          <span style={{ color: T.muted, fontSize: 13 }}>Loading folder…</span>
        </div>
      )}

      {pinned.status === 'error' && (
        <div style={{ padding: 20 }}>
          <div style={{ padding: '16px 20px', background: '#1a0f0f', border: `1px solid ${T.failed}30`, borderRadius: 10, fontSize: 13, color: T.failed, lineHeight: 1.6 }}>
            {pinned.errorMsg ?? 'Failed to load folder.'}
          </div>
        </div>
      )}

      {pinned.status === 'done' && (
        pinned.items.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center', color: T.muted, fontSize: 13 }}>
            Empty folder.
          </div>
        ) : (
          // Roll the starred folder's materials down on open — same motion as a
          // folder expanding. key={pinned.href} remounts (and re-animates) when you
          // switch to a different starred folder.
          <FolderCollapse key={pinned.href} open>
            <div style={{ padding: '8px 0' }}>
              <ItemTree
                items={pinned.items}
                depth={0}
                folders={folders}
                ancestors={[pinned.href]}
                onToggle={onToggle}
                onOpen={onOpen}
                courseName={pinned.courseName}
                starred={starred}
                onToggleStar={onToggleStar}
              />
            </div>
          </FolderCollapse>
        )
      )}
    </div>
  );
}

// ── Shared viewer bits ────────────────────────────────────────────────────────

function BackButton({ onBack, label = 'Back to materials' }: { onBack: () => void; label?: string }) {
  return (
    <button onClick={onBack} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: T.primary, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 16 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
      {label}
    </button>
  );
}

type NavigateFn = (href: string, title: string, type?: string) => void;

// ── Rich body renderer (sanitized tree → native elements) ─────────────────────

const RICH_STYLES: Record<string, React.CSSProperties> = {
  p:          { fontSize: 13, color: '#8a9bb0', lineHeight: 1.65, margin: '0 0 10px' },
  div:        { fontSize: 13, color: '#8a9bb0', lineHeight: 1.65, margin: '0 0 6px' },
  h1:         { fontSize: 17, fontWeight: 700, color: T.text, margin: '16px 0 6px', lineHeight: 1.3 },
  h2:         { fontSize: 15, fontWeight: 700, color: T.text, margin: '14px 0 5px', lineHeight: 1.3 },
  h3:         { fontSize: 13, fontWeight: 600, color: T.text, margin: '10px 0 4px', lineHeight: 1.3 },
  h4:         { fontSize: 13, fontWeight: 600, color: T.text, margin: '8px 0 4px', lineHeight: 1.3 },
  ul:         { margin: '4px 0 10px', paddingLeft: 22 },
  ol:         { margin: '4px 0 10px', paddingLeft: 22 },
  li:         { fontSize: 13, color: '#8a9bb0', lineHeight: 1.6, marginBottom: 3 },
  blockquote: { borderLeft: `2px solid ${T.faint}`, margin: '8px 0', paddingLeft: 12, color: T.muted, fontSize: 13, lineHeight: 1.6 },
  pre:        { background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, fontSize: 12, color: T.text, overflowX: 'auto' },
  code:       { fontFamily: 'ui-monospace, monospace', fontSize: 12, color: T.text },
  table:      { borderCollapse: 'collapse', margin: '8px 0', fontSize: 12 },
  td:         { border: `1px solid ${T.border}`, padding: '5px 9px', color: '#8a9bb0' },
  th:         { border: `1px solid ${T.border}`, padding: '5px 9px', color: T.text, fontWeight: 600 },
  span:       {},
  strong:     { color: T.text },
  b:          { color: T.text },
};

function RichBody({ nodes, onNavigate }: { nodes: RichNode[]; onNavigate: NavigateFn }) {
  return <>{nodes.map((n, i) => <RichNodeView key={i} node={n} onNavigate={onNavigate} />)}</>;
}

function RichNodeView({ node, onNavigate }: { node: RichNode; onNavigate: NavigateFn }) {
  if (node.t === 'text') return <>{node.text}</>;
  const { tag, href, src, children } = node;

  if (tag === 'br') return <br />;
  if (tag === 'img') {
    return <img src={src} alt="" style={{ maxWidth: '100%', borderRadius: 8, margin: '8px 0', display: 'block' }} />;
  }
  if (tag === 'a' && href) {
    const text = richText(children) || href;
    return (
      <a
        href={href}
        onClick={(e) => { e.preventDefault(); onNavigate(href, text); }}
        style={{ color: T.primary, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
      >
        {children.map((c, i) => <RichNodeView key={i} node={c} onNavigate={onNavigate} />)}
      </a>
    );
  }

  const kids = children.map((c, i) => <RichNodeView key={i} node={c} onNavigate={onNavigate} />);
  const style = RICH_STYLES[tag] ?? {};
  switch (tag) {
    case 'ul': return <ul style={style}>{kids}</ul>;
    case 'ol': return <ol style={style}>{kids}</ol>;
    case 'li': return <li style={style}>{kids}</li>;
    case 'table': return <table style={style}><tbody>{flattenTableChildren(node).map((tr, i) => <RichNodeView key={i} node={tr} onNavigate={onNavigate} />)}</tbody></table>;
    case 'tr': return <tr>{kids}</tr>;
    case 'td': return <td style={RICH_STYLES.td}>{kids}</td>;
    case 'th': return <th style={RICH_STYLES.th}>{kids}</th>;
    case 'strong': case 'b': return <strong style={style}>{kids}</strong>;
    case 'em': case 'i': return <em>{kids}</em>;
    case 'u': return <u>{kids}</u>;
    case 'pre': return <pre style={style}>{kids}</pre>;
    case 'code': return <code style={style}>{kids}</code>;
    case 'span': return <span>{kids}</span>;
    case 'h1': case 'h2': case 'h3': case 'h4':
      return <div style={style}>{kids}</div>;
    case 'blockquote': return <blockquote style={style}>{kids}</blockquote>;
    default: return <div style={RICH_STYLES.div}>{kids}</div>;
  }
}

// <table> children may be thead/tbody wrappers — flatten down to tr nodes
function flattenTableChildren(table: Extract<RichNode, { t: 'el' }>): RichNode[] {
  const rows: RichNode[] = [];
  for (const child of table.children) {
    if (child.t === 'el' && (child.tag === 'thead' || child.tag === 'tbody')) rows.push(...child.children);
    else rows.push(child);
  }
  return rows.filter((r) => r.t === 'el' && r.tag === 'tr');
}

function richText(nodes: RichNode[]): string {
  return nodes.map((n) => (n.t === 'text' ? n.text : richText(n.children))).join('').trim();
}

// ── Inline file viewer (blob-fetched via background worker) ───────────────────

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200, 300];

function imageMime(s: string): string {
  if (/\.png\b/i.test(s)) return 'image/png';
  if (/\.gif\b/i.test(s)) return 'image/gif';
  if (/\.webp\b/i.test(s)) return 'image/webp';
  return 'image/jpeg';
}

function FileViewer({ fileKind, url, title, onBack }: {
  fileKind: 'pdf' | 'image';
  url: string;
  title: string;
  onBack: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setBlobUrl(null);
    setError(null);
    setZoom(100);
    const mime = fileKind === 'pdf' ? 'application/pdf' : imageMime(`${url} ${title}`);
    fetchFileBlobUrl(url, mime).then(({ blobUrl: b, error: e }) => {
      if (cancelled) { if (b) URL.revokeObjectURL(b); return; }
      created = b;
      if (e || !b) setError(e ?? 'Could not load file');
      else setBlobUrl(b);
    });
    return () => { cancelled = true; if (created) URL.revokeObjectURL(created); };
  }, [url, fileKind]); // eslint-disable-line react-hooks/exhaustive-deps

  function stepZoom(dir: 1 | -1) {
    const i = ZOOM_STEPS.findIndex((z) => z >= zoom);
    const cur = i === -1 ? ZOOM_STEPS.length - 1 : i;
    const next = Math.min(Math.max(cur + dir, 0), ZOOM_STEPS.length - 1);
    setZoom(ZOOM_STEPS[next]);
  }

  // Download name: keep the title, make sure it has a sensible extension
  const ext = url.match(/\.(pdf|png|jpe?g|gif|webp|bmp|heic)(\?|$)/i)?.[1]
    ?? title.match(/\.(pdf|png|jpe?g|gif|webp|bmp|heic)\s*$/i)?.[1]
    ?? (fileKind === 'pdf' ? 'pdf' : 'jpg');
  const downloadName = /\.[a-z0-9]{2,5}$/i.test(title.trim()) ? title.trim() : `${title.trim() || 'file'}.${ext}`;

  const btn: React.CSSProperties = {
    all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#c8d5e8',
    background: T.card, border: `1px solid ${T.border}`, borderRadius: 6,
    padding: '4px 9px', lineHeight: 1, display: 'inline-flex', alignItems: 'center', gap: 5,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', flexShrink: 0, borderBottom: `1px solid ${T.rowBorder}` }}>
        <button onClick={onBack} style={{ ...btn, color: T.primary, border: 'none', background: 'transparent', paddingLeft: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>
        <span style={{ flex: 1, fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>

        {/* Zoom controls */}
        <button onClick={() => stepZoom(-1)} style={btn} title="Zoom out" disabled={!blobUrl}>−</button>
        <span style={{ fontSize: 11, color: T.muted, minWidth: 38, textAlign: 'center' }}>{zoom}%</span>
        <button onClick={() => stepZoom(1)} style={btn} title="Zoom in" disabled={!blobUrl}>+</button>
        <button onClick={() => setZoom(100)} style={btn} title="Reset zoom">Fit</button>

        {/* Download */}
        {blobUrl && (
          <a href={blobUrl} download={downloadName} style={{ ...btn, textDecoration: 'none' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Download
          </a>
        )}
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration: 'none' }} title="Open original in a new tab">↗</a>
      </div>

      {/* Body */}
      {error && (
        <div style={{ padding: 20 }}>
          <div style={{ padding: '16px 20px', background: '#1a0f0f', border: `1px solid ${T.failed}30`, borderRadius: 10, fontSize: 13, color: T.failed }}>
            {error} — <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: T.primary }}>open in new tab</a>
          </div>
        </div>
      )}
      {!error && !blobUrl && (
        <div style={{ padding: 20, color: T.muted, fontSize: 13 }}>Loading {fileKind === 'pdf' ? 'PDF' : 'image'}…</div>
      )}

      {!error && blobUrl && fileKind === 'pdf' && (
        <div style={{ flex: 1, minHeight: 0, padding: '12px 20px 20px', display: 'flex' }}>
          {/* key forces the viewer to remount when the zoom fragment changes */}
          <embed
            key={`${blobUrl}#zoom=${zoom}`}
            src={`${blobUrl}#zoom=${zoom}`}
            type="application/pdf"
            style={{ flex: 1, width: '100%', border: `1px solid ${T.border}`, borderRadius: 10, background: '#fff' }}
          />
        </div>
      )}

      {!error && blobUrl && fileKind === 'image' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px 20px' }}>
          <img src={blobUrl} alt={title}
            style={{ width: `${zoom}%`, maxWidth: zoom <= 100 ? '100%' : 'none', borderRadius: 10, border: `1px solid ${T.border}`, display: 'block' }} />
        </div>
      )}
    </div>
  );
}

// ── Embedded Google / YouTube viewer ──────────────────────────────────────────
// NOTE: the "no iframes" rule is about SCHOOLOGY content (we parse + render it
// natively). Google Slides/Drive/YouTube can't be parsed — their /embed and
// /preview endpoints exist exactly for this, so an iframe is the correct tool.

/**
 * Runs an interactive Schoology page (assessment SPA, quiz) inside the overlay
 * via a same-origin iframe. The content script only mounts in the top frame,
 * so the framed page is plain native Schoology — login cookies included.
 * Grades shown elsewhere refresh on the next scrape after finishing.
 */
/**
 * Same-origin, so we can restyle the framed document. These quizzes run on
 * Learnosity (the `lrn_*` widgets) embedded by Schoology — the question data,
 * images and answer-saving all go through Learnosity's cryptographically signed
 * session, so we can't re-render it natively. Instead we hide Schoology's chrome
 * and re-skin the real engine to match Better Schoology: themed gutter, a clean
 * "paper" question card, accent buttons, responsive images. It IS the real quiz,
 * just wearing our theme — so answers and images work for real.
 * Style lives in <head>, so the Learnosity SPA's internal page changes keep it.
 */
function blendCss(): string {
  const accent = T.primary;
  const light = getActiveTheme() === 'mono-light';
  const accentInk = inkOnAccent();
  // Card surface + ink follow the active theme so the quiz reads as dark or light
  const surface = light ? '#ffffff' : T.card;
  const ink = light ? '#1a1a1a' : T.text;
  const sub = T.muted;
  const line = T.border;
  // Input fields: lighter than the card so they read as real fields, not holes
  const fieldBg = light ? '#ffffff' : T.activeBg;
  // Pager pills: kept a consistent LIGHT control on every theme, with a fixed
  // darker-grey digit (requested) — so the number always reads regardless of
  // theme/accent and never blacks out. Active page = accent border + ring.
  const pillBg = light ? '#e7e6e1' : '#edeef2';
  const pillBorder = light ? '#cfcdc6' : '#d6d8de';
  const pillDigit = '#3f3f46';
  return `
    /* — Hide Schoology global chrome (never content wrappers) — */
    #header, header[role="banner"], .site-navigation,
    #footer, footer, #sidebar-left, .impersonation-banner-wrapper,
    .breadcrumb, #sgy-omni-bar { display: none !important; }
    .site-navigation-resize { margin-left: 0 !important; padding-left: 0 !important; width: 100% !important; }
    #main, #content, #center-col, #center-inner { margin: 0 !important; padding-top: 0 !important; }

    /* — Whole document + every wrapper follows the theme (kills white gutters) — */
    html, body, #main, #content, #center-col, #center-inner,
    .site-navigation-resize, .sgy-singleton-container, #region-content,
    #content-wrapper, .content-wrapper {
      background: ${T.bg} !important; color: ${ink} !important; min-width: 0 !important;
    }

    /* — LANDING / RESULTS page: full-bleed, themed (no white, no squish) — */
    .assessment-delivery-landing-app {
      width: 100% !important; max-width: none !important; margin: 0 !important;
      min-height: 100% !important;
      background: ${T.bg} !important; color: ${ink} !important;
      border: none !important; border-radius: 0 !important; box-shadow: none !important;
    }
    /* Recolor structural blocks + kill the decorative light-blue banner bg/image.
       Scoped to block elements so sprite icons (status dots) on spans survive. */
    .assessment-delivery-landing-app :is(div,section,header,main,table,thead,tbody,tr,td,th) {
      background-color: transparent !important; background-image: none !important;
      border-color: ${line} !important;
    }
    .assessment-delivery-landing-app :is(div,span,p,td,th,h1,h2,h3,h4,h5,label,li,a,strong,b) {
      color: ${ink} !important;
    }
    /* Make the grade score clearly visible on the now-dark banner */
    .received-grade, .max-points, .grade-title { color: ${accent} !important; font-weight: 800 !important; }
    .received-grade { font-size: 1.4em !important; }

    /* — Quiz delivery: kill EVERY white wrapper. Broad catch-all on Learnosity
       containers + the delivery shell, so no white can stick out anywhere.
       The layout uses directional regions (lrn-right-region, lrn-top-region…)
       — [class*="lrn-"][class*="region"] catches them ALL. Card/buttons excluded. */
    .ca-assessment-delivery-take-assessment,
    [class*="assessment-delivery"],
    [class^="lrn-assess"]:not(.lrn-assess-item):not(button):not(a),
    [class*=" lrn-assess"]:not(.lrn-assess-item):not(button):not(a),
    [class*="lrn-"][class*="region"], [class*="lrn-scrollable"],
    .lrn-assess-master-container, .lrn-assess-content, .lrn-assess-pages,
    .lrn-assess-page, .lrn-assess-items-wrapper {
      background: transparent !important; color: ${ink} !important;
      box-shadow: none !important; border: none !important; border-radius: 0 !important;
    }
    /* Breathing room so the title/last row never clip */
    .lrn-assess-content, .lrn-assess-pages { padding: 18px 0 30px !important; }
    .ca-assessment-delivery-take-assessment :is(h1,h2,h3,h4,span,div,p,label) { color: ${ink} !important; }

    /* Remove the redundant right-side accessibility toolbar (the permanently-white
       strip) — its tools (contrast/fullscreen/item-list) are non-essential in the
       overlay; pagination + Review stay in the bottom region. Reclaim its width. */
    .lrn-right-region, .lrn-top-right-region { display: none !important; }
    .app-layout.has-right-region, [class*="has-right-region"] { padding-right: 0 !important; }

    /* — Question content card (ONE clean elevated surface, no card-in-card) — */
    .lrn-assess-item {
      background: ${surface} !important; color: ${ink} !important;
      border: 1px solid ${line} !important; border-radius: 14px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,${light ? '0.10' : '0.35'}) !important;
      padding: 26px 36px 30px !important;
    }
    /* Give the question text real left breathing room */
    .lrn-assess-item .lrn_response, .lrn-assess-item .lrn_qr,
    .lrn-assess-item .lrn_stimulus, .lrn-assess-item .lrn_widget { padding-left: 6px !important; }
    /* Flatten EVERY structural wrapper INSIDE the card so the question sits on ONE
       surface — no card-in-card, no stacked inner box behind the text. Blends like
       the app's front page (a single clean card, not Learnosity's nested layers).
       Backgrounds + shadows are killed broadly on inner block elements; the actual
       form fields (combobox / cloze-select dropdowns are <span>s) are NOT matched,
       so they keep their field surface. Borders are removed only on the known
       structural wrappers — never on the dropdowns. */
    .lrn-assess-item :is(div, section, article, ul, ol, li, p, dl, table, tbody, tr, td) {
      background: transparent !important; background-color: transparent !important;
      box-shadow: none !important;
    }
    .lrn-assess-content, .lrn_widget, .lrn_qr, .lrn_question, .lds-root,
    .lrn_stimulus, .lrn_stimulus_content, .lrn_response_wrapper, .lrn_response,
    .lrn_cloze_response_container, .lrn_response_innerbody, .lrn_response_input,
    .lrn-assess-item .row, .lrn-assess-item [class*="col-"] {
      background: transparent !important; border: none !important; box-shadow: none !important;
    }
    .lrn_widget, .lrn_response_wrapper, .lrn_qr { padding: 0 !important; }
    .lrn-assess-item :is(div,span,p,td,th,h1,h2,h3,h4,label,li,strong,b,em,i) {
      color: ${ink} !important;
    }

    /* — Primary buttons (Start / Resume / Next / Submit / Finish) → accent — */
    .lrn_btn_blue, .lrn_btn.lrn_btn_blue, button.lrn_btn_blue,
    input[type="submit"], .s-button-primary, .button-primary {
      background: ${accent} !important; border-color: ${accent} !important;
      color: ${accentInk} !important; border-radius: 8px !important;
    }
    /* Secondary / prev buttons: themed surface, ink text (visible on any accent) */
    .lrn_btn:not(.lrn_btn_blue) {
      background: ${fieldBg} !important; color: ${ink} !important;
      border: 1px solid ${line} !important; border-radius: 8px !important;
    }
    /* Toolbar button ICONS (prev ‹ / next › / review ▦ / finish) must follow the
       button's ink — Learnosity renders them as icon-font glyphs / inline SVG, and
       left alone they stay black and "black out" on dark themes. Force color + svg
       fill/stroke at high specificity so the glyph always contrasts its button. */
    .bottom-wrapper .lrn_btn_blue, .bottom-wrapper .lrn_btn_blue :is(span,svg,i,em,use,path),
    .lrn_btn_blue.test-review-screen, .lrn_btn_blue.test-review-screen :is(span,svg,i,em,use,path),
    .lrn_btn_blue.item-next, .lrn_btn_blue.item-next :is(span,svg,i,em,use,path) {
      color: ${accentInk} !important; fill: ${accentInk} !important; stroke: ${accentInk} !important;
    }
    .bottom-wrapper .lrn_btn:not(.lrn_btn_blue),
    .bottom-wrapper .lrn_btn:not(.lrn_btn_blue) :is(span,svg,i,em,use,path) {
      color: ${ink} !important; fill: ${ink} !important; stroke: ${ink} !important;
    }
    /* Previous button → accent, matching Next / Review / Finish. It's the only
       toolbar button Learnosity ships WITHOUT .lrn_btn_blue, so the neutral rule
       above was catching it. The :not(.lrn_btn_blue) bumps this to 0,4,0 so it beats
       that neutral rule regardless of source order. Disabled (page 1) stays dimmed. */
    .bottom-wrapper .lrn_btn.item-prev:not(.lrn_btn_blue) {
      background: ${accent} !important; border-color: ${accent} !important;
      border-radius: 8px !important;
    }
    .bottom-wrapper .lrn_btn.item-prev:not(.lrn_btn_blue),
    .bottom-wrapper .lrn_btn.item-prev:not(.lrn_btn_blue) :is(span,svg,i,em,use,path) {
      color: ${accentInk} !important; fill: ${accentInk} !important; stroke: ${accentInk} !important;
    }
    .bottom-wrapper .lrn_btn.item-prev:disabled,
    .bottom-wrapper .lrn_btn.item-prev[disabled] {
      opacity: 0.5 !important; cursor: not-allowed !important;
    }

    /* — Bottom page-counter (lrn-pager): pills are a consistent LIGHT control on
         every theme with a fixed darker-grey digit (pillDigit) — the number always
         reads and never blacks out on dark themes. The digit color is forced at HIGH
         specificity (.lrn-pager .lrn-assess-pagination .lrn-assess-li … = 0,5,0) +
         a universal fallback, so it beats Learnosity's CDN stylesheet (the old
         0,3,1 rule lost the cascade — that's why the digits stayed Learnosity-black).
         Active page is marked by an accent border + ring (not a full fill), matching
         the app's quieter selected-state look. Pills are flex-centered with padding
         so the digit never touches the edge. Scoped to .lrn-pager / .pagination-active
         only — the Review-screen status grid (.item-card / .lrn-assess-review-*) is
         untouched. Color only; native prev/next nav unaffected. — */
    .lrn-pager, .lrn-assess-pagination, .slides-horizontal-pagination, .pagination {
      background: transparent !important; border: none !important;
    }
    .lrn-pager .lrn-assess-li, .lrn-assess-pagination .lrn-assess-li {
      background: ${pillBg} !important; border: 1px solid ${pillBorder} !important;
      border-radius: 8px !important; box-shadow: none !important;
      margin: 0 3px !important; overflow: hidden !important;
    }
    /* Center the digit in a square-ish pill with breathing room on every edge */
    .lrn-pager .lrn-assess-li .lrn-assess-btn,
    .lrn-pager .lrn-assess-li a.lrn-assess-horizontal-link,
    .lrn-assess-pagination .lrn-assess-li .lrn-assess-btn {
      display: flex !important; align-items: center !important; justify-content: center !important;
      min-width: 36px !important; height: 34px !important; padding: 0 11px !important;
      box-sizing: border-box !important; text-decoration: none !important;
    }
    .lrn-pager .lrn-assess-li .pagination-item-number,
    .lrn-assess-pagination .lrn-assess-li .pagination-item-number {
      display: flex !important; align-items: center !important; justify-content: center !important;
      padding: 0 !important; margin: 0 !important; line-height: 1 !important; font-weight: 700 !important;
    }
    /* Digit → fixed darker grey on every pill (0,5,0 beats Learnosity + universal
       fallback). Pills stay light on all themes, so the grey always reads. */
    .lrn-pager .lrn-assess-pagination .lrn-assess-li .pagination-item-number,
    .lrn-pager .lrn-assess-pagination .lrn-assess-li a,
    .lrn-pager .lrn-assess-li * {
      color: ${pillDigit} !important;
    }
    /* Active page = accent border + ring (digit stays darker grey for consistency) */
    .lrn-pager .lrn-assess-li.pagination-active,
    .lrn-assess-pagination .lrn-assess-li.pagination-active {
      background: #ffffff !important; border-color: ${accent} !important;
      box-shadow: 0 0 0 2px ${accent} !important;
    }
    /* Keyboard focus ring on pager links */
    .lrn-pager .lrn-assess-li a:focus-visible {
      outline: 2px solid ${accent} !important; outline-offset: 2px;
    }

    /* Review / Finish modal → consistent dark surface (separate pager variant —
       status grid, no .pagination-active, so it never gets accent-clobbered) */
    .lrn-assess-modal-content, .lrn-dialog-default, .review-screen, .app-panel {
      background: #1a1a1a !important; color: #faf9f6 !important;
    }
    .review-screen :is(div,span,p,label,h1,h2,h3) { color: #faf9f6 !important; }
    .item-card .item-number, .item-card .inner, .item-card .overlay { color: #faf9f6 !important; }

    /* — Answer inputs / cloze dropdowns: visible field surface, not black holes.
       NOTE: only the actual fields get a surface — the .lrn_response_input wrapper
       is intentionally left transparent (above) so the inline cloze sentence isn't
       boxed, which is what created the stacked look. — */
    select, input, textarea, .lrn-cloze-select, .lrn_textinput, .lrn_combobox,
    [class*="cloze"] input, [class*="cloze"] select {
      background: ${fieldBg} !important; color: ${ink} !important;
      border: 1px solid ${line} !important; border-radius: 6px !important;
    }
    .lrn-cloze-select:focus, .lrn_textinput:focus, .lrn_combobox:focus,
    select:focus, input:focus { outline: 2px solid ${accent} !important; outline-offset: 1px; }

    /* — Highlight / token-select questions ("pick the word that doesn't belong"):
       Learnosity's default selection is a glaring bright yellow you can barely read
       through. Re-skin SELECTED tokens to a soft accent tint + themed ink + an accent
       outline (legible on dark AND light). The ${accent}40 alpha-hex + !important
       overrides Learnosity's inline highlight color. Unselected tokens are untouched.
       (Defensive: covers the common Learnosity class/aria variants for this type.) */
    .lrn-assess-item :is(mark, .lrn-highlight, .lrn_highlight, .lrn_highlighted),
    .lrn-assess-item .lrn-token.lrn-selected,
    .lrn-assess-item :is([class*="token"][class*="select"], [class*="highlight"][class*="select"]),
    .lrn-assess-item [aria-pressed="true"]:is([class*="token"], [class*="highlight"], [class*="choice"]) {
      background-color: ${accent}40 !important;
      color: ${ink} !important;
      box-shadow: inset 0 0 0 1.5px ${accent} !important;
      border-radius: 4px !important; padding: 0 2px !important;
    }

    /* — Drag-and-drop questions: drop zones become themed dashed targets (not stark
       white boxes), draggable answer chips become themed tiles. Higher specificity
       than the flatten rule so the boxes/chips keep their surface. Any number/label
       inside reads as themed ink. (Defensive: standard Learnosity DnD classes.) */
    .lrn-assess-item :is(.lrn_response_container, .association_dropzone,
      .lrn-possibility-response-container, [class*="dropzone"], [class*="drop-zone"],
      [class*="drop_zone"], .lrn_clozeassociation .lrn_response_input) {
      background: ${fieldBg} !important;
      border: 2px dashed ${sub} !important;
      border-radius: 8px !important; color: ${ink} !important; min-height: 30px !important;
    }
    /* Reorder / sortable rows (the full-width "put them in order" cards) + any
       generic draggable → the theme's MAIN color (white on mono-light, near-black
       on mono-dark), NOT accent. Accent on those big rows was too much. */
    .lrn-assess-item :is([draggable="true"], [class*="sortable"], [class*="orderlist"],
      [class*="order-list"], .lrn_sortable, .lrn_orderlist, .lrn-sortable-item,
      .lrn_response_rowwrapper) {
      background: ${T.bg} !important; color: ${ink} !important;
      border: 1px solid ${line} !important; border-radius: 8px !important;
      box-shadow: 0 1px 3px rgba(0,0,0,${light ? '0.10' : '0.28'}) !important;
    }
    .lrn-assess-item :is([draggable="true"], [class*="sortable"], [class*="orderlist"],
      .lrn_response_rowwrapper) :is(span,div,p,svg,i,em,strong,b) {
      color: ${ink} !important; fill: ${ink} !important;
    }
    /* Drag-INTO-box answer chips (the small "something you eat/drink" tiles) keep
       the accent. Declared AFTER the neutral rule, so a chip that's also [draggable]
       wins by source order; the big reorder rows (no .lrn_dragitem) stay neutral. */
    .lrn-assess-item :is(.lrn_dragitem, .lrn-possibility, .lrn_draggable,
      .lrn_aggregate .lrn_possibility) {
      background: ${accent} !important; color: ${accentInk} !important;
      border: 1px solid ${accent} !important; border-radius: 8px !important;
      box-shadow: 0 1px 3px rgba(0,0,0,${light ? '0.18' : '0.35'}) !important;
    }
    .lrn-assess-item :is(.lrn_dragitem, .lrn-possibility, .lrn_draggable,
      .lrn_aggregate .lrn_possibility) :is(span,div,p,svg,i,em,strong,b) {
      color: ${accentInk} !important; fill: ${accentInk} !important;
    }

    .lrn-assess-modal-content {
      background: ${surface} !important; color: ${ink} !important; border-radius: 14px !important;
    }
    .lrn-assess-modal-content :is(div,span,p,label,li) { color: ${ink} !important; }

    /* — Muted secondary text — */
    .assessment-status, .attempt-table-column-header { color: ${sub} !important; }

    /* — Images: always fit the card, never clipped or hidden — */
    .lrn-assess-item img, .lrn_widget img, .lb-image, .lrn_qr img,
    .assessment-delivery-landing-app img { max-width: 100% !important; height: auto !important; }

    /* — Match Better Schoology's font (text only — not inputs, keeps sizing) — */
    .assessment-delivery-landing-app,
    .ca-assessment-delivery-take-assessment, .lrn-assess-item, .lrn_widget,
    .lrn-assess-item :is(h1,h2,h3,h4,p,span,div,label,li) {
      font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
    }
  `;
}

/** Inject/refresh the blend stylesheet inside the framed doc with current theme. */
function applyBlendCss(doc: Document | null | undefined) {
  try {
    if (!doc?.head) return;
    let style = doc.getElementById('__bs_blend__') as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement('style');
      style.id = '__bs_blend__';
      doc.head.appendChild(style);
    }
    const css = blendCss();
    if (style.textContent !== css) style.textContent = css;
    // Keep our blend sheet LAST in <head> so equal-specificity ties resolve in our
    // favor — Learnosity mounts its own <style>/<link> after onLoad, which would
    // otherwise win source order and re-blacken the pager digits.
    if (doc.head.lastElementChild !== style) doc.head.appendChild(style);
  } catch { /* transient / cross-origin */ }
}

/**
 * Same-origin, so we restyle the framed document. These quizzes run on
 * Learnosity (`lrn_*` widgets) embedded by Schoology — questions, images and
 * answer-saving go through Learnosity's signed session, so we can't re-render
 * natively. Instead we hide Schoology chrome and re-skin the REAL engine to
 * match Better Schoology. It IS the real quiz, just wearing our theme.
 *
 * Both the landing app and the Learnosity delivery are React SPAs that render
 * (and re-render) after `onLoad`, so a one-shot inject can be wiped or land
 * before content exists. We (re)inject on a short poll AND keep the <style>
 * present via a MutationObserver so it survives route changes inside the frame.
 */
function blendFrame(frame: HTMLIFrameElement | null) {
  let doc: Document | null = null;
  try { doc = frame?.contentDocument ?? null; } catch { return; }
  if (!doc) return;
  const d = doc;

  applyBlendCss(d);
  // Survive React re-renders that swap subtrees / re-mount the app
  try {
    const obs = new MutationObserver(() => applyBlendCss(d));
    obs.observe(d.documentElement, { childList: true, subtree: true });
    // Stop observing when the frame navigates away (next onLoad re-runs this)
    frame?.addEventListener('load', () => obs.disconnect(), { once: true });
  } catch { /* observer unsupported — poll still covers it */ }
  // Brief poll for late async mounts
  let n = 0;
  const iv = setInterval(() => { applyBlendCss(d); if (++n > 16) clearInterval(iv); }, 400);
}

export function NativeTaskViewer({ url, title, onBack, backLabel = 'Back to Materials' }: {
  url: string;
  title: string;
  onBack: () => void;
  backLabel?: string;
}) {
  const [frameKey, setFrameKey] = useState(0);
  const frameRef = React.useRef<HTMLIFrameElement>(null);

  // Re-skin the live quiz when the student switches theme or accent mid-attempt
  useEffect(() => {
    return onThemeChange(() => {
      try { applyBlendCss(frameRef.current?.contentDocument); } catch { /* ignore */ }
    });
  }, []);
  const btn: React.CSSProperties = {
    all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: T.text,
    background: T.card, border: `1px solid ${T.border}`, borderRadius: 6,
    padding: '6px 11px', lineHeight: 1, display: 'inline-flex', alignItems: 'center', gap: 5,
    textDecoration: 'none',
  };
  return (
    <div className="bs-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', flexShrink: 0, borderBottom: `1px solid ${T.border}`, background: T.panel }}>
        {/* Prominent back-to-materials button */}
        <button type="button" onClick={onBack} className="bs-focusable bs-lift" style={{
          ...btn,
          background: T.primary,
          border: 'none',
          color: inkOnAccent(),
          fontWeight: 700, padding: '7px 13px',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
          {backLabel}
        </button>
        <span style={{ flex: 1, fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title} <span style={{ opacity: 0.7 }}>· live Schoology — answers save for real</span>
        </span>
        <button type="button" onClick={() => setFrameKey((k) => k + 1)} className="bs-focusable" style={btn} title="Reload the task">
          ↻ Reload
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="bs-focusable" style={btn} title="Open in a full tab">
          Open ↗
        </a>
      </div>
      <iframe
        ref={frameRef}
        key={frameKey}
        src={url}
        title={`${title} — Schoology task`}
        allow="microphone; camera; fullscreen"
        allowFullScreen
        onLoad={(e) => blendFrame(e.currentTarget)}
        style={{ flex: 1, width: '100%', minHeight: 0, border: 'none', background: T.bg, display: 'block' }}
      />
    </div>
  );
}

function EmbedViewer({ embedUrl, originalUrl, title, onBack }: {
  embedUrl: string;
  originalUrl: string;
  title: string;
  onBack: () => void;
}) {
  const btn: React.CSSProperties = {
    all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#c8d5e8',
    background: T.card, border: `1px solid ${T.border}`, borderRadius: 6,
    padding: '4px 9px', lineHeight: 1, display: 'inline-flex', alignItems: 'center', gap: 5,
    textDecoration: 'none',
  };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', flexShrink: 0, borderBottom: `1px solid ${T.rowBorder}` }}>
        <button onClick={onBack} style={{ ...btn, color: T.primary, border: 'none', background: 'transparent', paddingLeft: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>
        <span style={{ flex: 1, fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <a href={originalUrl} target="_blank" rel="noopener noreferrer" style={btn} title="Open in a new tab">
          Open ↗
        </a>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '12px 20px 20px', display: 'flex' }}>
        <iframe
          src={embedUrl}
          title={title}
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
          style={{ flex: 1, width: '100%', border: `1px solid ${T.border}`, borderRadius: 10, background: '#fff' }}
        />
      </div>
    </div>
  );
}

// ── Discussion thread viewer ──────────────────────────────────────────────────

function DiscussionViewer({ data, url, title, onBack, onNavigate, onPost, onDelete }: {
  data: FetchedDiscussion | null;
  url: string;
  title: string;
  onBack: () => void;
  onNavigate: NavigateFn;
  onPost: (text: string) => Promise<{ success: boolean; error: string | null }>;
  onDelete: (deleteHref: string) => Promise<{ success: boolean; error: string | null }>;
}) {
  const [draft, setDraft] = useState('');
  const [postState, setPostState] = useState<'idle' | 'sending'>('idle');
  const [postError, setPostError] = useState<string | null>(null);
  // deleteHref of the post awaiting confirm / being deleted
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(deleteHref: string) {
    setDeleting(deleteHref);
    setDeleteError(null);
    const result = await onDelete(deleteHref);
    setDeleting(null);
    setConfirmDelete(null);
    if (!result.success) setDeleteError(result.error ?? 'Failed to delete comment');
  }

  async function handlePost() {
    const text = draft.trim();
    if (!text || postState === 'sending') return;
    setPostState('sending');
    setPostError(null);
    const result = await onPost(text);
    setPostState('idle');
    if (result.success) setDraft('');
    else setPostError(result.error ?? 'Failed to post comment');
  }

  return (
    <div>
      <BackButton onBack={onBack} />

      {data === null && <div style={{ color: T.muted, fontSize: 13 }}>Loading discussion…</div>}

      {data && !data.success && (
        <div style={{ padding: '16px 20px', background: '#1a0f0f', border: `1px solid ${T.failed}30`, borderRadius: 10, fontSize: 13, color: T.failed, lineHeight: 1.6 }}>
          {data.error ?? 'Failed to load discussion.'}{' '}
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: T.primary }}>Open in Schoology</a>
        </div>
      )}

      {data?.success && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, fontSize: 18, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
              {data.title || title}
            </div>
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: T.muted, textDecoration: 'none', flexShrink: 0, marginTop: 4 }}>
              Reply in Schoology ↗
            </a>
          </div>

          {data.prompt.length > 0 && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
              <RichBody nodes={data.prompt} onNavigate={onNavigate} />
            </div>
          )}

          {/* Comment composer */}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 18 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a comment…"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical',
                background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: '9px 11px', fontSize: 13, color: T.text, lineHeight: 1.5,
                fontFamily: 'inherit', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <button
                onClick={handlePost}
                disabled={!draft.trim() || postState === 'sending'}
                style={{
                  all: 'unset',
                  cursor: !draft.trim() || postState === 'sending' ? 'default' : 'pointer',
                  background: !draft.trim() ? T.border : T.primary,
                  color: !draft.trim() ? T.muted : '#fff',
                  fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 7,
                  opacity: postState === 'sending' ? 0.6 : 1,
                }}
              >
                {postState === 'sending' ? 'Posting…' : 'Post comment'}
              </button>
              {postError && (
                <span style={{ fontSize: 11, color: T.failed }}>
                  {postError} — <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: T.primary }}>reply in Schoology</a>
                </span>
              )}
            </div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 500, color: T.muted, letterSpacing: '-0.01em', marginBottom: 8 }}>
            {data.posts.length} {data.posts.length === 1 ? 'Post' : 'Posts'}
          </div>

          {data.posts.length === 0 && (
            <div style={{ fontSize: 13, color: T.muted }}>
              No posts loaded.{' '}
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: T.primary }}>View in Schoology</a>
            </div>
          )}

          {deleteError && (
            <div style={{ marginBottom: 10, padding: '8px 12px', background: '#1a0f0f', border: `1px solid ${T.failed}30`, borderRadius: 8, fontSize: 12, color: T.failed }}>
              {deleteError}
            </div>
          )}

          {data.posts.map((post, i) => (
            <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#c8d5e8' }}>{post.author}</span>
                {post.time && <span style={{ fontSize: 11, color: T.faint }}>{post.time}</span>}
                <span style={{ flex: 1 }} />
                {post.deleteHref && confirmDelete !== post.deleteHref && (
                  <button
                    onClick={() => { setConfirmDelete(post.deleteHref); setDeleteError(null); }}
                    style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: T.faint }}
                    title="Delete your comment"
                  >
                    Delete
                  </button>
                )}
                {post.deleteHref && confirmDelete === post.deleteHref && (
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, fontSize: 11 }}>
                    {deleting === post.deleteHref ? (
                      <span style={{ color: T.muted }}>Deleting…</span>
                    ) : (
                      <>
                        <span style={{ color: T.muted }}>Delete this comment?</span>
                        <button onClick={() => handleDelete(post.deleteHref!)}
                          style={{ all: 'unset', cursor: 'pointer', color: T.failed, fontWeight: 600 }}>
                          Yes, delete
                        </button>
                        <button onClick={() => setConfirmDelete(null)}
                          style={{ all: 'unset', cursor: 'pointer', color: T.muted }}>
                          Cancel
                        </button>
                      </>
                    )}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#8a9bb0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{post.body}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Native content viewer ─────────────────────────────────────────────────────

function GradeChip({ grade }: { grade: ScrapedAssignment }) {
  const hasScore = grade.score !== '';
  const missing = grade.status === 'unsubmitted';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
      {hasScore && (
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, background: '#0e2419', border: `1px solid ${T.assign}40`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: T.assign, fontWeight: 600 }}>
          Grade: {grade.score} {grade.maxGrade}
        </span>
      )}
      {!hasScore && (
        <span style={{ display: 'inline-flex', background: missing ? '#1a0f0f' : '#12203a', border: `1px solid ${missing ? T.failed : T.activeBorder}40`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: missing ? T.failed : T.primary, fontWeight: 600 }}>
          {missing ? 'Not submitted' : grade.status === 'submitted' ? 'Submitted — not graded yet' : 'Not graded yet'}
        </span>
      )}
      {grade.dueDate && (
        <span style={{ fontSize: 11, color: T.muted }}>Due {grade.dueDate}</span>
      )}
    </div>
  );
}

// Collect embeddable Google/YouTube destinations referenced by a page —
// from rich-body links AND the attachments list — so they can be shown
// inline instead of hiding behind tiny links like "30.3".
function collectEmbeds(data: FetchedContent): { embedUrl: string; originalUrl: string; label: string }[] {
  const out: { embedUrl: string; originalUrl: string; label: string }[] = [];
  const seen = new Set<string>();
  function visit(nodes: RichNode[]) {
    for (const n of nodes) {
      if (n.t === 'el') {
        if (n.tag === 'a' && n.href) {
          const real = resolveLinkWrapper(n.href);
          const e = googleEmbedUrl(real);
          if (e && !seen.has(e)) {
            seen.add(e);
            out.push({ embedUrl: e, originalUrl: real, label: richText(n.children) || real });
          }
        }
        visit(n.children);
      }
    }
  }
  visit(data.body);
  for (const att of data.attachments) {
    const real = resolveLinkWrapper(att.href);
    const e = googleEmbedUrl(real);
    if (e && !seen.has(e)) {
      seen.add(e);
      out.push({ embedUrl: e, originalUrl: real, label: att.title });
    }
  }
  return out;
}

// ── Submissions panel (assignment dropbox) ────────────────────────────────────

function SubmissionsPanel({ info, assignmentUrl, onSubmit, onSubmitFiles }: {
  info: NonNullable<FetchedContent['submission']>;
  assignmentUrl: string;
  onSubmit: (submitHref: string, text: string) => Promise<{ success: boolean; error: string | null }>;
  onSubmitFiles: (submitHref: string, files: File[], text: string, onProgress: (m: string) => void) => Promise<{ success: boolean; error: string | null }>;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [mode, setMode] = useState<'files' | 'text'>('files');
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = React.useRef(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setComposerOpen(false); setDraft(''); setFiles([]); setProgress('');
    setDragging(false); dragDepth.current = 0;
  }

  /** Append, skipping exact duplicates (same name + size) */
  function addFiles(incoming: File[]) {
    if (incoming.length === 0) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}|${f.size}`));
      return [...prev, ...incoming.filter((f) => !seen.has(`${f.name}|${f.size}`))];
    });
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files ?? []));
  }

  async function handleSubmit() {
    if (state === 'sending') return;
    if (mode === 'text') {
      const text = draft.trim();
      if (!text) return;
      setState('sending'); setError(null);
      const result = await onSubmit(info.submitHref, text);
      if (result.success) { setState('done'); reset(); }
      else { setState('idle'); setError(result.error ?? 'Submission failed'); }
    } else {
      if (files.length === 0) return;
      setState('sending'); setError(null); setProgress('');
      const result = await onSubmitFiles(info.submitHref, files, draft.trim(), setProgress);
      if (result.success) { setState('done'); reset(); }
      else { setState('idle'); setProgress(''); setError(result.error ?? 'Upload failed'); }
    }
  }

  return (
    <div style={{ marginTop: 20, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: info.revisions.length > 0 ? 10 : 0 }}>
        <span style={{ fontSize: 10, fontWeight: 500, color: T.muted, letterSpacing: '-0.01em', flex: 1 }}>
          Submissions
        </span>
        {info.submitHref && !composerOpen && (
          <button onClick={() => { setComposerOpen(true); setError(null); }}
            style={{ all: 'unset', cursor: 'pointer', background: T.primary, color: '#fff', fontSize: 12, fontWeight: 600, padding: '5px 13px', borderRadius: 7 }}>
            {info.submitLabel || 'Submit Assignment'}
          </button>
        )}
      </div>

      {info.revisions.map((rev, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 0', borderTop: i > 0 ? `1px solid ${T.rowBorder}` : 'none' }}>
          <span style={{ fontSize: 13, color: T.text }}>
            {rev.href ? (
              <a href={rev.href} target="_blank" rel="noopener noreferrer" style={{ color: T.text, textDecoration: 'underline', textUnderlineOffset: 2 }}>{rev.title}</a>
            ) : rev.title}
          </span>
          {rev.status && (
            <span style={{ fontSize: 10, fontWeight: 600, color: rev.status === 'On time' ? T.assign : T.failed, border: `1px solid ${rev.status === 'On time' ? T.assign : T.failed}40`, borderRadius: 5, padding: '1px 7px' }}>
              {rev.status}
            </span>
          )}
          <span style={{ flex: 1 }} />
          {rev.time && <span style={{ fontSize: 11, color: T.muted }}>{rev.time}</span>}
        </div>
      ))}

      {info.revisions.length === 0 && !composerOpen && (
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>No submissions yet.</div>
      )}

      {state === 'done' && (
        <div style={{ marginTop: 8, fontSize: 12, color: T.assign }}>Submitted ✓</div>
      )}

      {composerOpen && (
        <div style={{ marginTop: 10 }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {(['files', 'text'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 7,
                  background: mode === m ? T.activeBg : 'transparent', color: mode === m ? T.text : T.muted,
                  border: `1px solid ${mode === m ? T.activeBorder + '60' : 'transparent'}` }}>
                {m === 'files' ? 'Upload files' : 'Type text'}
              </button>
            ))}
          </div>

          {mode === 'files' && (
            <div>
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
                onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
              {/* Whole-surface drop zone — drop anywhere on the box, or click to browse */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Drop files here or press Enter to browse"
                className="bs-focusable"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                onDragEnter={onDragEnter}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                style={{
                  cursor: 'pointer',
                  minHeight: 96,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: dragging ? `${T.primary}14` : T.bg,
                  border: `1.5px dashed ${dragging ? T.primary : T.border}`,
                  borderRadius: 10,
                  padding: '14px 12px',
                  transition: 'border-color 150ms ease-out, opacity 150ms ease-out',
                  textAlign: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dragging ? T.primary : T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: dragging ? T.primary : T.text }}>
                  {dragging ? 'Drop to add' : 'Drag files here, or click to browse'}
                </span>
                {files.length === 0 && (
                  <span style={{ fontSize: 10, color: T.muted }}>Each submit creates a new revision</span>
                )}
              </div>
              {files.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.text, padding: '3px 0' }}>
                      <ItemIcon type={detectFileKind(f.name, f.name) === 'image' ? 'media' : 'document'} size={13} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize: 10, color: T.muted }}>{(f.size / 1024).toFixed(0)} KB</span>
                      <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="bs-focusable" aria-label={`Remove ${f.name}`} style={{ all: 'unset', cursor: 'pointer', color: T.muted, fontSize: 13, padding: '0 4px' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment (optional)" rows={2}
                aria-label="Submission comment"
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', marginTop: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 11px', fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none' }} />
            </div>
          )}

          {mode === 'text' && (
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type your submission…" rows={6}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 11px', fontSize: 13, color: T.text, lineHeight: 1.5, fontFamily: 'inherit', outline: 'none' }} />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            {(() => {
              const canSubmit = mode === 'text' ? !!draft.trim() : files.length > 0;
              return (
                <button type="button" onClick={handleSubmit} disabled={!canSubmit || state === 'sending'}
                  className="bs-focusable"
                  style={{ all: 'unset', display: 'inline-flex', alignItems: 'center', gap: 7, cursor: !canSubmit || state === 'sending' ? 'default' : 'pointer', background: !canSubmit ? T.border : T.primary, color: !canSubmit ? T.muted : (getActiveTheme() === 'mono-light' ? '#faf9f6' : '#fff'), fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 7, opacity: state === 'sending' ? 0.7 : 1 }}>
                  {state === 'sending' && <span className="bs-spinner" aria-hidden="true" style={{ width: 10, height: 10 }} />}
                  {state === 'sending' ? (progress || 'Submitting…') : 'Submit'}
                </button>
              );
            })()}
            <button onClick={reset} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: T.muted }}>Cancel</button>
            <span style={{ flex: 1 }} />
            <a href={info.submitHref || assignmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.muted, textDecoration: 'none' }}>
              Open in Schoology ↗
            </a>
          </div>
          {error && (
            <div style={{ marginTop: 8, fontSize: 12, color: T.failed }}>
              {error} — <a href={info.submitHref || assignmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: T.primary }}>submit in Schoology</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ContentViewer({ data, url, title, grade, onBack, onNavigate, onSubmit, onSubmitFiles }: {
  data: FetchedContent | null;
  url: string;
  title: string;
  grade: ScrapedAssignment | null;
  onBack: () => void;
  onNavigate: NavigateFn;
  onSubmit: (submitHref: string, text: string) => Promise<{ success: boolean; error: string | null }>;
  onSubmitFiles: (submitHref: string, files: File[], text: string, onProgress: (m: string) => void) => Promise<{ success: boolean; error: string | null }>;
}) {
  if (data === null) {
    return (
      <div>
        <BackButton onBack={onBack} />
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 12, lineHeight: 1.3 }}>{title}</div>
        <div style={{ color: T.muted, fontSize: 13 }}>Loading content…</div>
      </div>
    );
  }

  return (
    <div>
      <BackButton onBack={onBack} />

      {!data.success && (
        <div style={{ padding: '16px 20px', background: '#1a0f0f', border: `1px solid ${T.failed}30`, borderRadius: 10, fontSize: 13, color: T.failed, lineHeight: 1.6 }}>
          {data.error ?? 'Failed to load content.'}{' '}
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: T.primary }}>Open in Schoology</a>
        </div>
      )}

      {data.success && (
        <>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 12, lineHeight: 1.3 }}>
            {data.title || title || '(Untitled)'}
          </div>

          {/* Grade from the gradebook scrape (assignment pages are JS-rendered) */}
          {grade && <GradeChip grade={grade} />}

          {/* Due date chip always comes from paragraph extraction */}
          {data.body.length > 0 && data.paragraphs.filter(p => p.kind === 'duedate').map((p, i) => (
            <div key={`dd${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#12203a', border: `1px solid ${T.activeBorder}40`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: T.primary, marginBottom: 14 }}>
              Due: {p.text}
            </div>
          ))}

          {/* Rich body (links, images, formatting) — falls back to plain paragraphs */}
          {data.body.length > 0 && <RichBody nodes={data.body} onNavigate={onNavigate} />}

          {data.body.length === 0 && data.paragraphs.map((p, i) => {
            if (p.kind === 'duedate') return (
              <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#12203a', border: `1px solid ${T.activeBorder}40`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: T.primary, marginBottom: 14 }}>
                Due: {p.text}
              </div>
            );
            if (p.kind === 'h2') return <div key={i} style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: '14px 0 5px', lineHeight: 1.3 }}>{p.text}</div>;
            if (p.kind === 'h3') return <div key={i} style={{ fontSize: 13, fontWeight: 600, color: '#c8d5e8', margin: '10px 0 4px', lineHeight: 1.3 }}>{p.text}</div>;
            if (p.kind === 'bullet') return (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '2px 0', fontSize: 13, color: '#8a9bb0', lineHeight: 1.6 }}>
                <span style={{ color: T.faint, flexShrink: 0 }}>•</span>
                <span>{p.text}</span>
              </div>
            );
            return <p key={i} style={{ fontSize: 13, color: '#8a9bb0', lineHeight: 1.6, margin: '0 0 8px' }}>{p.text}</p>;
          })}

          {data.body.length === 0 && data.paragraphs.length === 0 && data.attachments.length === 0 && (
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
              No text content found.{' '}
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: T.primary }}>Open in Schoology</a>
            </div>
          )}

          {/* Inline embeds — Slides decks etc. hide behind tiny links like "30.3";
              render them right here so the user sees the deck, not a link */}
          {collectEmbeds(data).map((e, i) => (
            <div key={e.embedUrl} style={{ marginTop: i === 0 ? 20 : 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 500, color: T.muted, letterSpacing: '-0.01em' }}>
                  {/youtube\.com/.test(e.embedUrl) ? 'Video' : 'Slides / Doc'}
                  {e.label && e.label.length < 60 ? ` — ${e.label}` : ''}
                </span>
                <a href={e.originalUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 10, color: T.muted, textDecoration: 'none' }}>
                  Open ↗
                </a>
              </div>
              <iframe
                src={e.embedUrl}
                title={e.label}
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
                // maxHeight keeps the whole frame visible at once — when it
                // overflowed, each slide change scrolled the page to the
                // frame top and the user had to scroll back down every time
                style={{ width: '100%', aspectRatio: '16 / 10', maxHeight: '62vh', border: `1px solid ${T.border}`, borderRadius: 10, background: '#fff', display: 'block' }}
              />
            </div>
          ))}

          {/* Assignment dropbox: revision history + submit */}
          {data.submission && (
            <SubmissionsPanel info={data.submission} assignmentUrl={url} onSubmit={onSubmit} onSubmitFiles={onSubmitFiles} />
          )}

          {data.attachments.length > 0 && (
            <div style={{ marginTop: data.body.length > 0 || data.paragraphs.length > 0 ? 20 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: T.muted, letterSpacing: '-0.01em', marginBottom: 8 }}>Attachments</div>
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
                {data.attachments.map((att, i) => {
                  const fk = detectFileKind(att.href, att.title);
                  return (
                    <button key={i} onClick={() => onNavigate(att.href, att.title)}
                      style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', borderBottom: i < data.attachments.length - 1 ? `1px solid ${T.rowBorder}` : 'none', boxSizing: 'border-box' }}>
                      <ItemIcon type={fk === 'image' ? 'media' : fk === 'pdf' ? 'document' : 'link'} size={15} />
                      <span style={{ flex: 1, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.title}</span>
                      {att.fileSize && <span style={{ fontSize: 10, color: T.faint, flexShrink: 0 }}>{att.fileSize}</span>}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2a3a52" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        {fk === 'pdf' || fk === 'image'
                          ? <polyline points="9 18 15 12 9 6" />
                          : <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />}
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Splash() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 10, textAlign: 'center' }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2a3a52" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <div style={{ fontSize: 13, color: '#4d5f7a' }}>Select a course to browse its materials.</div>
    </div>
  );
}
