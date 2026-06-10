import React, { useState, useMemo, useEffect } from 'react';
import type { ScrapedCourse, ScrapedAssignment } from '../../lib/schemas';
import { courseColor, courseAbbr } from '../../lib/course-colors';
import { scorePercent, parseMaxGrade, gradeColor, parseDueDate, formatDueDate, isDatePast } from '../../lib/grade-utils';
import { Icon } from '../Icon';
import { T } from '../../lib/theme';
import { ContentViewer, NativeTaskViewer } from './MaterialsPage';
import { fetchItemContent, submitDropboxText, submitDropboxFiles, type FetchedContent } from '../../lib/fetch-materials';

interface GradesState {
  courses: ScrapedCourse[];
}

interface Props {
  grades: GradesState;
}

interface FlatAssignment {
  id: string;
  name: string;
  status: ScrapedAssignment['status'];
  dueDate: string;
  score: string;
  percent: number | null;
  pointsPossible: number | null;
  categoryName: string;
  courseName: string;
  link: string;
}

type BucketKey = 'missing' | 'todo' | 'done';

const BUCKET_ORDER: BucketKey[] = ['missing', 'todo', 'done'];
function getBucketMeta(key: BucketKey): { label: string; color: string; empty: string } {
  switch (key) {
    case 'missing':
      return { label: 'Missing', color: T.failed, empty: "Nothing missing — you're all caught up." };
    case 'todo':
      return { label: 'To Do', color: T.primary, empty: 'Nothing left to turn in.' };
    case 'done':
      return { label: 'Done', color: T.fresh, empty: 'Nothing graded or submitted yet.' };
  }
}

// Carousel geometry — mirrors the course carousel on the Overview tab.
const CARD_W = 252;
const SPREAD = 274;
const ROT_Y = 16;
const SCALE_STEP = 0.07;
const OPA_STEP = 0.18;

/** Unsubmitted with a due date that's already passed. */
function isMissingItem(a: { status: string; dueDate: string }): boolean {
  return a.status === 'unsubmitted' && !!a.dueDate && isDatePast(a.dueDate);
}

function bucketOf(a: FlatAssignment): BucketKey {
  if (a.status === 'unsubmitted') return isMissingItem(a) ? 'missing' : 'todo';
  return 'done';
}

function matchesSearch(a: FlatAssignment, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return a.name.toLowerCase().includes(q)
    || a.categoryName.toLowerCase().includes(q)
    || a.courseName.toLowerCase().includes(q);
}

/** Missing/To Do: soonest due date first. Done: most recently due first. No-date items last either way. */
function compareForBucket(key: BucketKey) {
  return (a: FlatAssignment, b: FlatAssignment): number => {
    const da = parseDueDate(a.dueDate)?.getTime();
    const db = parseDueDate(b.dueDate)?.getTime();
    if (da == null && db == null) return 0;
    if (da == null) return 1;
    if (db == null) return -1;
    return key === 'done' ? db - da : da - db;
  };
}

function wrappedOffset(i: number, active: number, n: number): number {
  let off = i - active;
  if (off > n / 2) off -= n;
  if (off < -n / 2) off += n;
  return off;
}

export function AssignmentsPage({ grades }: Props) {
  const allItems = useMemo<FlatAssignment[]>(() => {
    const out: FlatAssignment[] = [];
    grades.courses.forEach((c) => {
      c.categories.forEach((cat) => {
        cat.assignments.forEach((a, i) => {
          out.push({
            id: `${c.name}|${cat.name}|${i}|${a.name}`,
            name: a.name,
            status: a.status,
            dueDate: a.dueDate,
            score: a.score,
            percent: scorePercent(a.score, a.maxGrade),
            pointsPossible: parseMaxGrade(a.maxGrade),
            categoryName: cat.name,
            courseName: c.name,
            link: a.link ?? '',
          });
        });
      });
    });
    return out;
  }, [grades.courses]);

  const [activeCourses, setActiveCourses] = useState<Set<string>>(
    () => new Set(grades.courses.map((c) => c.name)),
  );
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);

  // Click an assignment → open the Better SGY (themed) version of it, reusing the
  // Materials tab's content viewer: description, attachments, and the submission box.
  const openAssignment = (a: FlatAssignment) => {
    if (!a.link) return;
    const url = /^https?:\/\//.test(a.link)
      ? a.link
      : typeof location !== 'undefined'
        ? new URL(a.link, location.origin).href
        : a.link;
    setViewer({ url, title: a.name });
  };

  // Open on whichever bucket needs attention most: missing > to do > done.
  const [activeIdx, setActiveIdx] = useState(() => {
    const hasMissing = allItems.some((a) => bucketOf(a) === 'missing');
    if (hasMissing) return 0;
    const hasTodo = allItems.some((a) => bucketOf(a) === 'todo');
    return hasTodo ? 1 : 2;
  });

  const filtered = useMemo(
    () => allItems.filter((a) => activeCourses.has(a.courseName) && matchesSearch(a, search)),
    [allItems, activeCourses, search],
  );

  const buckets = useMemo(() => {
    const b: Record<BucketKey, FlatAssignment[]> = { missing: [], todo: [], done: [] };
    for (const item of filtered) b[bucketOf(item)].push(item);
    for (const key of BUCKET_ORDER) b[key].sort(compareForBucket(key));
    return b;
  }, [filtered]);

  function toggleCourse(name: string) {
    setActiveCourses((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        if (next.size === 1) return prev;
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  return (
    <div style={{ padding: 24, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <style>{`.bs-asgn-row { cursor: pointer; transition: background .12s; } .bs-asgn-row:hover { background: ${T.primary}14; }`}</style>
      <h1 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
        Assignments
      </h1>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: T.faint, display: 'flex', pointerEvents: 'none',
        }}>
          <Icon name="search" size={14} />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search assignments..."
          aria-label="Search assignments"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: T.card,
            border: `1px solid ${searchFocused ? T.primary : T.border}`,
            borderRadius: 8,
            color: T.text,
            fontSize: 12,
            padding: '9px 32px',
            outline: 'none',
          }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="bs-focusable"
            style={{
              all: 'unset', cursor: 'pointer', color: T.muted, display: 'flex', padding: 6, borderRadius: 4,
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            }}
          >
            <Icon name="x" size={12} />
          </button>
        )}
      </div>

      {/* Course filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-label="Filter by course">
          {grades.courses.map((c) => {
            const active = activeCourses.has(c.name);
            const clr = courseColor(c.name, true);
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => toggleCourse(c.name)}
                aria-pressed={active}
                aria-label={`${active ? 'Hide' : 'Show'} ${c.name}`}
                className="bs-focusable"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  border: `1px solid ${active ? `${clr}60` : T.border}`,
                  background: active ? `${clr}1a` : T.card,
                  color: active ? clr : T.muted,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  lineHeight: 1.4,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: clr, flexShrink: 0 }} />
                {courseAbbr(c.name)}
              </button>
            );
          })}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }} role="status">
          {filtered.length} assignment{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Status carousel */}
      <div style={{ flex: 1, minHeight: 420, position: 'relative', perspective: '1400px', overflow: 'visible' }}>
        {BUCKET_ORDER.map((key, i) => {
          const offset = wrappedOffset(i, activeIdx, BUCKET_ORDER.length);
          return (
            <BucketCard
              key={key}
              bucketKey={key}
              items={buckets[key]}
              offset={offset}
              isActive={offset === 0}
              onActivate={() => setActiveIdx(i)}
              onOpen={openAssignment}
            />
          );
        })}
      </div>

      {viewer && (
        <SgyAssignmentViewer initialUrl={viewer.url} initialTitle={viewer.title} onClose={() => setViewer(null)} />
      )}
    </div>
  );
}

/**
 * In-overlay Better SGY viewer: fetches the assignment with the user's session and
 * renders it themed via the Materials tab's <ContentViewer> — description, attachments,
 * and the submission box. Following a link inside the content re-fetches in place.
 */
function SgyAssignmentViewer({ initialUrl, initialTitle, onClose }: { initialUrl: string; initialTitle: string; onClose: () => void }) {
  const [cur, setCur] = useState({ url: initialUrl, title: initialTitle });
  const [data, setData] = useState<FetchedContent | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    fetchItemContent(cur.url).then((d) => { if (alive) setData(d); });
    return () => { alive = false; };
  }, [cur.url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const navigate = (href: string, title: string) => {
    const url = /^https?:\/\//.test(href)
      ? href
      : typeof location !== 'undefined'
        ? new URL(href, location.origin).href
        : href;
    setCur({ url, title: title || cur.title });
  };

  // Quizzes / assessments are JS-rendered, so the themed fetch finds no text. When the
  // page has no readable content, no attachments, and no dropbox, fall back to the live
  // (theme-blended) native runner — same as the Materials tab.
  const isInteractive =
    !!data && data.success &&
    data.body.length === 0 && data.paragraphs.length === 0 &&
    data.attachments.length === 0 && !data.submission;

  if (isInteractive) {
    return (
      <div className="bs-fade-in" style={{ position: 'fixed', inset: 0, zIndex: 2147482000, background: T.bg, display: 'flex', flexDirection: 'column' }}>
        <NativeTaskViewer url={cur.url} title={cur.title} onBack={onClose} backLabel="Back to assignments" />
      </div>
    );
  }

  return (
    <div className="bs-fade-in" style={{ position: 'fixed', inset: 0, zIndex: 2147482000, background: T.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '18px 24px 64px', boxSizing: 'border-box' }}>
        <ContentViewer
          data={data}
          url={cur.url}
          title={cur.title}
          grade={null}
          onBack={onClose}
          onNavigate={(href, title) => navigate(href, title)}
          onSubmit={(submitHref, text) => submitDropboxText(submitHref, text)}
          onSubmitFiles={(submitHref, files, text, onProgress) => submitDropboxFiles(submitHref, files, text, onProgress)}
        />
      </div>
    </div>
  );
}

function BucketCard({
  bucketKey, items, offset, isActive, onActivate, onOpen,
}: {
  bucketKey: BucketKey;
  items: FlatAssignment[];
  offset: number;
  isActive: boolean;
  onActivate: () => void;
  onOpen: (a: FlatAssignment) => void;
}) {
  const meta = getBucketMeta(bucketKey);
  const absOff = Math.abs(offset);
  const scale = 1 - absOff * SCALE_STEP;
  const opa = Math.max(0.3, 1 - absOff * OPA_STEP);
  const rotY = -offset * ROT_Y;
  const tx = offset * SPREAD;

  return (
    <div
      onClick={!isActive ? onActivate : undefined}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: CARD_W,
        height: '92%',
        marginLeft: -(CARD_W / 2),
        borderRadius: 22,
        overflow: 'hidden',
        background: T.card,
        border: `1px solid ${isActive ? meta.color + '55' : T.border}`,
        boxShadow: isActive
          ? `0 24px 72px rgba(0,0,0,0.7), 0 0 0 1px ${meta.color}22`
          : '0 6px 24px rgba(0,0,0,0.4)',
        cursor: isActive ? 'default' : 'pointer',
        transform: `translateX(${tx}px) translateY(-50%) rotateY(${rotY}deg) scale(${scale})`,
        opacity: opa,
        transition: 'transform 0.52s cubic-bezier(0.22,1,0.36,1), opacity 0.38s ease, border-color 0.3s, box-shadow 0.4s',
        zIndex: 10 - absOff,
        userSelect: 'none',
        willChange: 'transform',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header — real button so keyboard users can switch buckets */}
      <button
        type="button"
        onClick={onActivate}
        aria-pressed={isActive}
        aria-label={`${meta.label}: ${items.length} assignment${items.length !== 1 ? 's' : ''}`}
        className="bs-focusable"
        tabIndex={0}
        style={{
          all: 'unset', boxSizing: 'border-box', width: '100%', display: 'block',
          padding: '20px 18px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
          cursor: isActive ? 'default' : 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800, color: meta.color, lineHeight: 1, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
          {items.length}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {meta.label}
        </div>
      </button>

      {/* List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: isActive ? 'auto' : 'hidden' }}>
        {items.length === 0 ? (
          <div style={{ padding: '24px 18px', fontSize: 12, color: T.muted, fontStyle: 'italic', textAlign: 'center' }}>
            {meta.empty}
          </div>
        ) : (
          items.map((a, i) => <BucketRow key={a.id} item={a} index={i} bucketKey={bucketKey} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

/** Single badge summarizing a graded/submitted assignment: % takes priority, then submission status. */
function assignmentPill(a: FlatAssignment): { icon: 'check' | 'minus'; label: string; color: string } {
  if (a.percent !== null) {
    return { icon: 'check', label: `${a.percent.toFixed(1)}%`, color: gradeColor(a.percent) };
  }
  if (a.status === 'submitted') return { icon: 'check', label: 'Submitted', color: T.fresh };
  return { icon: 'minus', label: 'Ungraded', color: T.muted };
}

function BucketRow({ item: a, index, bucketKey, onOpen }: { item: FlatAssignment; index: number; bucketKey: BucketKey; onOpen: (a: FlatAssignment) => void }) {
  const clr = courseColor(a.courseName, true);
  const showGrade = bucketKey === 'done';
  const dateColor = bucketKey === 'missing' ? T.failed : T.primary;
  const pill = assignmentPill(a);
  const clickable = !!a.link;

  return (
    <div
      className={`bs-row-enter${clickable ? ' bs-asgn-row' : ''}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      title={clickable ? `Open "${a.name}"` : undefined}
      onClick={clickable ? () => onOpen(a) : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(a); } } : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderBottom: `1px solid ${T.rowBorder}`,
        animationDelay: `${Math.min(index, 12) * 30}ms`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 10, color: T.muted, whiteSpace: 'nowrap' }}>
          <span
            style={{
              fontWeight: 700,
              color: clr,
              background: `${clr}1a`,
              border: `1px solid ${clr}40`,
              borderRadius: 999,
              padding: '1px 6px',
              flexShrink: 0,
            }}
          >
            {courseAbbr(a.courseName)}
          </span>
          <span style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {a.categoryName}
          </span>
          {showGrade && (
            <>
              <span style={{ flexShrink: 0, color: T.faint }}>·</span>
              <Icon name="calendar" size={10} />
              <span style={{ flexShrink: 0 }}>{formatDueDate(a.dueDate)}</span>
            </>
          )}
        </div>
      </div>

      {showGrade ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 700, color: pill.color,
          background: pill.color + '18', border: `1px solid ${pill.color}35`,
          borderRadius: 7, padding: '3px 8px', flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          <Icon name={pill.icon} size={11} />
          {pill.label}
        </span>
      ) : (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 700, color: dateColor,
          background: dateColor + '18', border: `1px solid ${dateColor}35`,
          borderRadius: 7, padding: '3px 8px', flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          <Icon name="calendar" size={11} />
          {formatDueDate(a.dueDate)}
        </span>
      )}
    </div>
  );
}
