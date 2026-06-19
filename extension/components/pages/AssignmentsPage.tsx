import React, { useState, useMemo, useEffect } from 'react';
import type { ScrapedCourse, ScrapedAssignment } from '../../lib/schemas';
import { courseAbbr } from '../../lib/course-colors';
import { scorePercent, parseMaxGrade, gradeColor, parseDueDate, formatDueDate, isDatePast } from '../../lib/grade-utils';
import { Icon } from '../Icon';
import { T } from '../../lib/theme';
import { AT, tileBg, hairline } from '../../lib/apple';
import { appleCardStyle } from '../apple-ui';
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
      return { label: 'To do', color: T.primary, empty: 'Nothing left to turn in.' };
    case 'done':
      return { label: 'Done', color: T.fresh, empty: 'Nothing graded or submitted yet.' };
  }
}

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
    <div style={{ background: T.bg, fontFamily: AT.font, minHeight: '100vh' }}>
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px clamp(20px, 4vw, 40px) 80px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <style>{`.bs-asgn-row { cursor: pointer; transition: background .12s; } .bs-asgn-row:hover { background: ${T.primary}14; }`}</style>
      <h1 style={{ margin: '0 0 20px', fontSize: AT.h1, fontWeight: AT.semibold, color: T.text, lineHeight: 1.1, letterSpacing: AT.trackHead }}>
        Assignments
      </h1>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <div style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: T.muted, display: 'flex', pointerEvents: 'none',
        }}>
          <Icon name="search" size={16} />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search assignments"
          aria-label="Search assignments"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: tileBg(),
            border: `1px solid ${searchFocused ? T.primary : 'transparent'}`,
            borderRadius: AT.rTile,
            color: T.text,
            fontFamily: AT.font,
            fontSize: AT.sub,
            padding: '12px 38px',
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
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => toggleCourse(c.name)}
                aria-pressed={active}
                aria-label={`${active ? 'Hide' : 'Show'} ${c.name}`}
                className="bs-focusable bs-press"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  borderRadius: AT.rPill,
                  border: 'none',
                  background: active ? T.text : tileBg(),
                  color: active ? T.bg : T.muted,
                  padding: '6px 14px',
                  fontSize: AT.caption,
                  fontWeight: AT.medium,
                  cursor: 'pointer',
                  lineHeight: 1.4,
                }}
              >
                {courseAbbr(c.name)}
              </button>
            );
          })}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: AT.sub, color: T.muted, whiteSpace: 'nowrap' }} role="status">
          {filtered.length} assignment{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Status columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'start' }}>
        {BUCKET_ORDER.map((key, i) => (
          <BucketCard
            key={key}
            bucketKey={key}
            items={buckets[key]}
            index={i}
            onOpen={openAssignment}
          />
        ))}
      </div>

      {viewer && (
        <SgyAssignmentViewer initialUrl={viewer.url} initialTitle={viewer.title} onClose={() => setViewer(null)} />
      )}
    </div>
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
  bucketKey, items, index, onOpen,
}: {
  bucketKey: BucketKey;
  items: FlatAssignment[];
  index: number;
  onOpen: (a: FlatAssignment) => void;
}) {
  const meta = getBucketMeta(bucketKey);

  return (
    <div
      className="bs-apple-in"
      style={{
        ...appleCardStyle(),
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animationDelay: `${index * 70}ms`,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 22px 16px', borderBottom: `1px solid ${hairline()}`, flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: AT.h1, fontWeight: AT.semibold, color: meta.color, lineHeight: 1, letterSpacing: AT.trackHead, fontVariantNumeric: 'tabular-nums' }}>
            {items.length}
          </span>
          <span style={{ fontSize: AT.h3, fontWeight: AT.semibold, color: T.text, letterSpacing: AT.trackHead }}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* List */}
      <div style={{ minHeight: 0, maxHeight: 520, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ padding: '28px 22px', fontSize: AT.sub, color: T.muted, textAlign: 'center' }}>
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
  const showGrade = bucketKey === 'done';
  const dateColor = bucketKey === 'missing' ? T.failed : T.muted;
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
        gap: 12,
        padding: '13px 22px',
        borderBottom: `1px solid ${hairline()}`,
        animationDelay: `${Math.min(index, 12) * 30}ms`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text, letterSpacing: AT.trackBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, fontSize: AT.caption, color: T.muted, whiteSpace: 'nowrap' }}>
          <span
            style={{
              fontWeight: AT.medium,
              color: T.muted,
              background: tileBg(),
              borderRadius: AT.rPill,
              padding: '2px 9px',
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
              <span style={{ flexShrink: 0, color: T.muted, opacity: 0.6 }}>·</span>
              <Icon name="calendar" size={11} />
              <span style={{ flexShrink: 0 }}>{formatDueDate(a.dueDate)}</span>
            </>
          )}
        </div>
      </div>

      {showGrade ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: AT.caption, fontWeight: AT.semibold, color: T.text,
          background: tileBg(),
          borderRadius: AT.rPill, padding: '4px 11px', flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          <Icon name={pill.icon} size={11} />
          {pill.label}
        </span>
      ) : (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: AT.caption, fontWeight: AT.semibold, color: dateColor,
          background: dateColor + '1f',
          borderRadius: AT.rPill, padding: '4px 11px', flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          <Icon name="calendar" size={11} />
          {formatDueDate(a.dueDate)}
        </span>
      )}
    </div>
  );
}
