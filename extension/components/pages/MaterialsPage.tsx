import React, { useState, useEffect, useCallback } from 'react';
import type { ScrapedCourse, ScrapedAssignment } from '../../lib/schemas';
import { courseColor, courseAbbr, abbrFontSize } from '../../lib/course-colors';
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

const T = {
  text: '#e8eaf0',
  muted: '#7a8ea3',
  faint: '#2a3a52',
  card: '#111827',
  border: '#1e2535',
  rowBorder: '#151d2e',
  activeBg: '#1a2540',
  activeBorder: '#3b82f6',
  primary: '#3b82f6',
  failed: '#ef4444',
  folder: '#f59e0b',
  link: '#06b6d4',
  doc: '#8b5cf6',
  assign: '#10b981',
} as const;

interface GradesState { courses: ScrapedCourse[]; }
interface Props { grades: GradesState; }

interface FolderEntry {
  status: 'loading' | 'done' | 'error';
  items: MaterialItem[];
}

type Viewer =
  | { kind: 'content'; data: FetchedContent | null; url: string; title: string }
  | { kind: 'discussion'; data: FetchedDiscussion | null; url: string; title: string }
  | { kind: 'file'; fileKind: 'pdf' | 'image'; url: string; title: string }
  | { kind: 'embed'; embedUrl: string; originalUrl: string; title: string }
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
  document: T.doc, media: T.muted, discussion: '#ec4899', unknown: T.faint,
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

// ── Component ─────────────────────────────────────────────────────────────────

export function MaterialsPage({ grades }: Props) {
  const { courses } = grades;
  const [selected, setSelected] = useState<ScrapedCourse | null>(courses[0] ?? null);
  const [items, setItems] = useState<MaterialItem[] | null>(null);
  const [folders, setFolders] = useState<Map<string, FolderEntry>>(new Map());
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer>(null);

  const loadCourse = useCallback(async (course: ScrapedCourse) => {
    setSelected(course);
    setItems(null);
    setFolders(new Map());
    setViewer(null);
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

  async function toggleFolder(item: MaterialItem) {
    if (!item.href) return;
    const key = item.href;
    const existing = folders.get(key);
    if (existing?.status === 'done') {
      setFolders(prev => { const m = new Map(prev); m.delete(key); return m; });
      return;
    }
    setFolders(prev => new Map(prev).set(key, { status: 'loading', items: [] }));
    const result = await fetchMaterials(item.href!);
    setFolders(prev => new Map(prev).set(key, {
      status: result.success ? 'done' : 'error',
      items: result.items,
    }));
  }

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

  // Single router for every clickable href (tree items, attachments, body links)
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
      window.open(real, '_blank', 'noopener,noreferrer');
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
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    if (type === 'discussion' || /\/discussion\//.test(href)) {
      openDiscussion(href, title);
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

  const color = selected ? courseColor(selected.name) : '#3b82f6';
  const abbr = selected ? courseAbbr(selected.name) : '';
  const fs = selected ? abbrFontSize(abbr) : 48;

  return (
    <div style={{ display: 'flex', position: 'absolute', inset: 0, overflow: 'hidden' }}>

      {/* ── Course sidebar ───────────────────────────────────────────── */}
      <div style={{ width: 200, flexShrink: 0, borderRight: `1px solid ${T.border}`, overflowY: 'auto', background: '#0d1019', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 12px 6px', fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Courses
        </div>
        {courses.map(course => {
          const c = courseColor(course.name);
          const a = courseAbbr(course.name);
          const isActive = selected?.name === course.name;
          return (
            <button key={course.name} onClick={() => loadCourse(course)}
              style={{ all: 'unset', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', cursor: 'pointer',
                background: isActive ? T.activeBg : 'transparent',
                borderLeft: `2px solid ${isActive ? c : 'transparent'}`,
                boxSizing: 'border-box' }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: c, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                <span style={{ fontSize: Math.round(abbrFontSize(a) * 0.42), fontWeight: 900, color: 'rgba(255,255,255,0.22)', userSelect: 'none', lineHeight: 1 }} aria-hidden="true">{a}</span>
              </div>
              <span style={{ flex: 1, fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? T.text : '#8892a4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {course.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main panel ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Course banner */}
        {selected && (
          <div style={{ height: 64, flexShrink: 0, background: color, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
            <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: fs * 0.65, fontWeight: 900, color: 'rgba(255,255,255,0.1)', userSelect: 'none', lineHeight: 1, letterSpacing: '-1px' }} aria-hidden="true">{abbr}</div>
            <div style={{ zIndex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{selected.name}</div>
              {selected.teacher && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{selected.teacher}</div>}
            </div>
            {viewer && (
              <span style={{ zIndex: 1, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                / {viewer.title}
              </span>
            )}
          </div>
        )}

        {/* Content area — overflowAnchor off: Chrome's scroll anchoring jumps
            the container when an embedded Slides iframe changes slides */}
        <div style={{
          flex: 1,
          overflowY: viewer?.kind === 'file' || viewer?.kind === 'embed' ? 'hidden' : 'auto',
          display: viewer?.kind === 'file' || viewer?.kind === 'embed' ? 'flex' : 'block',
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
              {status === 'loading' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180 }}>
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
                    />
                  </div>
                )
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
}

const MAX_TREE_DEPTH = 12;

function ItemTree({ items, depth, folders, ancestors, onToggle, onOpen }: TreeProps) {
  return (
    <>
      {items.map((item, i) => {
        const folderEntry = item.href ? folders.get(item.href) : undefined;
        // A folder whose href already appears above itself in the tree would
        // expand forever (Schoology folder pages can link back to themselves)
        const isCycle = !!item.href && ancestors.includes(item.href);
        const isExpanded = folderEntry?.status === 'done' && !isCycle && depth < MAX_TREE_DEPTH;
        return (
          <React.Fragment key={(item.href ?? item.title) + i}>
            <TreeRow
              item={item}
              depth={depth}
              folderEntry={isCycle ? undefined : folderEntry}
              onToggle={onToggle}
              onOpen={onOpen}
            />
            {isExpanded && folderEntry!.items.length > 0 && (
              <ItemTree
                items={folderEntry!.items}
                depth={depth + 1}
                folders={folders}
                ancestors={item.href ? [...ancestors, item.href] : ancestors}
                onToggle={onToggle}
                onOpen={onOpen}
              />
            )}
            {isExpanded && folderEntry!.items.length === 0 && (
              <div style={{
                padding: `6px 12px 6px ${12 + (depth + 1) * 20 + 22}px`,
                fontSize: 12,
                color: T.faint,
                borderBottom: `1px solid ${T.rowBorder}`,
              }}>
                Empty folder
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

function TreeRow({ item, depth, folderEntry, onToggle, onOpen }: {
  item: MaterialItem;
  depth: number;
  folderEntry: FolderEntry | undefined;
  onToggle: (item: MaterialItem) => void;
  onOpen: (item: MaterialItem) => void;
}) {
  const isFolder = item.type === 'folder';
  const isExpanded = folderEntry?.status === 'done';
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
          <span style={{ fontSize: 11, color: T.muted, lineHeight: 1 }}>…</span>
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
            color: isFolder ? '#d4b896' : '#c8d5e8',
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
    </button>
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
  h3:         { fontSize: 13, fontWeight: 600, color: '#c8d5e8', margin: '10px 0 4px', lineHeight: 1.3 },
  h4:         { fontSize: 13, fontWeight: 600, color: '#c8d5e8', margin: '8px 0 4px', lineHeight: 1.3 },
  ul:         { margin: '4px 0 10px', paddingLeft: 22 },
  ol:         { margin: '4px 0 10px', paddingLeft: 22 },
  li:         { fontSize: 13, color: '#8a9bb0', lineHeight: 1.6, marginBottom: 3 },
  blockquote: { borderLeft: `2px solid ${T.faint}`, margin: '8px 0', paddingLeft: 12, color: T.muted, fontSize: 13, lineHeight: 1.6 },
  pre:        { background: '#0d1019', border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, fontSize: 12, color: '#c8d5e8', overflowX: 'auto' },
  code:       { fontFamily: 'ui-monospace, monospace', fontSize: 12, color: '#c8d5e8' },
  table:      { borderCollapse: 'collapse', margin: '8px 0', fontSize: 12 },
  td:         { border: `1px solid ${T.border}`, padding: '5px 9px', color: '#8a9bb0' },
  th:         { border: `1px solid ${T.border}`, padding: '5px 9px', color: T.text, fontWeight: 600 },
  span:       {},
  strong:     { color: '#c8d5e8' },
  b:          { color: '#c8d5e8' },
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
                background: '#0d1019', border: `1px solid ${T.border}`, borderRadius: 8,
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

          <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setComposerOpen(false); setDraft(''); setFiles([]); setProgress('');
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
        <span style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.5px', flex: 1 }}>
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
          <span style={{ fontSize: 13, color: '#c8d5e8' }}>
            {rev.href ? (
              <a href={rev.href} target="_blank" rel="noopener noreferrer" style={{ color: '#c8d5e8', textDecoration: 'underline', textUnderlineOffset: 2 }}>{rev.title}</a>
            ) : rev.title}
          </span>
          {rev.status && (
            <span style={{ fontSize: 10, fontWeight: 600, color: rev.status === 'On time' ? T.assign : T.failed, border: `1px solid ${rev.status === 'On time' ? T.assign : T.failed}40`, borderRadius: 5, padding: '1px 7px' }}>
              {rev.status}
            </span>
          )}
          <span style={{ flex: 1 }} />
          {rev.time && <span style={{ fontSize: 11, color: T.faint }}>{rev.time}</span>}
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
                onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); }} />
              <button onClick={() => fileInputRef.current?.click()}
                style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: '#c8d5e8', background: '#0d1019', border: `1px dashed ${T.border}`, borderRadius: 8, padding: '9px 14px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                Choose file{files.length !== 1 ? 's' : ''}
              </button>
              {files.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#c8d5e8', padding: '3px 0' }}>
                      <ItemIcon type={detectFileKind(f.name, f.name) === 'image' ? 'media' : 'document'} size={13} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize: 10, color: T.faint }}>{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ all: 'unset', cursor: 'pointer', color: T.faint, fontSize: 13 }} title="Remove">×</button>
                    </div>
                  ))}
                </div>
              )}
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Optional comment…" rows={2}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', marginTop: 8, background: '#0d1019', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 11px', fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none' }} />
            </div>
          )}

          {mode === 'text' && (
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type your submission…" rows={6}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: '#0d1019', border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 11px', fontSize: 13, color: T.text, lineHeight: 1.5, fontFamily: 'inherit', outline: 'none' }} />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            {(() => {
              const canSubmit = mode === 'text' ? !!draft.trim() : files.length > 0;
              return (
                <button onClick={handleSubmit} disabled={!canSubmit || state === 'sending'}
                  style={{ all: 'unset', cursor: !canSubmit || state === 'sending' ? 'default' : 'pointer', background: !canSubmit ? T.border : T.primary, color: !canSubmit ? T.muted : '#fff', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 7, opacity: state === 'sending' ? 0.6 : 1 }}>
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

function ContentViewer({ data, url, title, grade, onBack, onNavigate, onSubmit, onSubmitFiles }: {
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
                <span style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
              <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Attachments</div>
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
                {data.attachments.map((att, i) => {
                  const fk = detectFileKind(att.href, att.title);
                  return (
                    <button key={i} onClick={() => onNavigate(att.href, att.title)}
                      style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', borderBottom: i < data.attachments.length - 1 ? `1px solid ${T.rowBorder}` : 'none', boxSizing: 'border-box' }}>
                      <ItemIcon type={fk === 'image' ? 'media' : fk === 'pdf' ? 'document' : 'link'} size={15} />
                      <span style={{ flex: 1, fontSize: 13, color: '#c8d5e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.title}</span>
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
