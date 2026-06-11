import React, { useEffect, useMemo, useRef, useState } from 'react';
import { T, inkOnAccent } from '../../lib/theme';
import type { UseAnnouncements } from '../../lib/use-announcements';
import type { Announcement } from '../../lib/fetch-announcements';
import { SkeletonList, EmptyState } from '../Primitives';

interface Props {
  announcements: UseAnnouncements;
}

// Carousel geometry — mirrors the Assignments tab's floating bucket cards.
const CARD_W = 420;
const SPREAD = 300;
const ROT_Y = 18;
const SCALE_STEP = 0.12;
const OPA_STEP = 0.32;

function wrappedOffset(i: number, active: number, n: number): number {
  let off = i - active;
  if (off > n / 2) off -= n;
  if (off < -n / 2) off += n;
  return off;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

interface Bucket {
  key: 'message' | 'update' | 'class-update';
  label: string;
  color: string;
  items: Announcement[];
  empty: string;
}

/**
 * Announcements inbox as a 3-card floating carousel (per the user's mockup): the
 * active card is biggest, centered, and shows the full scrollable list + filters;
 * the two inactive cards sit on the sides showing only their type + count. Three
 * categories: Announcements (teacher emails), Updates (posted/graded notifications),
 * Class Updates (full course-feed posts). Each item can be starred "important".
 */
export function AnnouncementsPage({ announcements }: Props) {
  const { items, loading, error } = announcements;
  const [activeIdx, setActiveIdx] = useState(0);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const didMark = useRef(false);

  const buckets: Bucket[] = useMemo(() => [
    { key: 'message', label: 'Announcements', color: T.primary, items: items.filter((a) => a.kind === 'message'), empty: 'No teacher messages yet.' },
    { key: 'update', label: 'Updates', color: T.fresh, items: items.filter((a) => a.kind === 'update'), empty: 'No notifications yet.' },
    { key: 'class-update', label: 'Class Updates', color: T.doc, items: items.filter((a) => a.kind === 'class-update'), empty: 'No course posts yet.' },
  ], [items]);

  useEffect(() => {
    if (loading || didMark.current || items.length === 0) return;
    setNewIds(new Set(items.filter((a) => announcements.isUnread(a.id)).map((a) => a.id)));
    announcements.markAllSeen();
    didMark.current = true;
  }, [loading, items, announcements]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingLeft: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 22px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: '-0.3px' }}>Announcements</div>
        {announcements.unreadCount > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: inkOnAccent(), background: T.primary, borderRadius: 999, padding: '1px 8px', lineHeight: 1.6 }}>
            {announcements.unreadCount} new
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => announcements.refresh()} className="bs-focusable" title="Refresh"
          style={{ all: 'unset', cursor: 'pointer', color: T.muted, fontSize: 12 }}>↻ Refresh</button>
      </div>

      {loading ? (
        /* v2: skeleton feed instead of a bare spinner */
        <div style={{ flex: 1, overflow: 'hidden', padding: '8px 22px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <SkeletonList rows={6} label="Loading announcements" />
          </div>
        </div>
      ) : error && items.length === 0 ? (
        <EmptyState
          icon={
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" />
            </svg>
          }
          title="Couldn't load announcements"
          text={error}
          action={
            <button type="button" className="bs-focusable" onClick={() => announcements.refresh()}
              style={{ all: 'unset', cursor: 'pointer', background: T.primary, color: inkOnAccent(), fontSize: 12.5, fontWeight: 700, borderRadius: 8, padding: '8px 16px' }}>
              Try again
            </button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          }
          title="All caught up"
          text="No announcements yet — new teacher messages, updates, and course posts will land here."
        />
      ) : (
        <div style={{ flex: 1, minHeight: 420, position: 'relative', perspective: '1500px', overflow: 'visible' }}>
          {buckets.map((b, i) => {
            const offset = wrappedOffset(i, activeIdx, buckets.length);
            return (
              <CategoryCard
                key={b.key}
                bucket={b}
                offset={offset}
                isActive={offset === 0}
                onActivate={() => setActiveIdx(i)}
                newIds={newIds}
                announcements={announcements}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoryCard({ bucket, offset, isActive, onActivate, newIds, announcements }: {
  bucket: Bucket;
  offset: number;
  isActive: boolean;
  onActivate: () => void;
  newIds: Set<string>;
  announcements: UseAnnouncements;
}) {
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [importantOnly, setImportantOnly] = useState(false);

  const absOff = Math.abs(offset);
  const scale = 1 - absOff * SCALE_STEP;
  const opa = Math.max(0.42, 1 - absOff * OPA_STEP);
  const rotY = -offset * ROT_Y;
  const tx = offset * SPREAD;

  const authors = useMemo(() => {
    const c = new Map<string, number>();
    for (const a of bucket.items) c.set(a.author, (c.get(a.author) ?? 0) + 1);
    return Array.from(c.entries()).sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [bucket.items]);

  let visible = bucket.items;
  if (importantOnly) visible = visible.filter((a) => announcements.isImportant(a.id));
  if (authorFilter) visible = visible.filter((a) => a.author === authorFilter);

  const cardStyle: React.CSSProperties = {
    position: 'absolute', left: '50%', top: '50%', width: CARD_W, height: '94%',
    marginLeft: -(CARD_W / 2), borderRadius: 22, overflow: 'hidden', background: T.card,
    border: `1px solid ${isActive ? bucket.color + '66' : T.border}`,
    boxShadow: isActive ? `0 24px 72px rgba(0,0,0,0.7), 0 0 0 1px ${bucket.color}22` : '0 6px 24px rgba(0,0,0,0.4)',
    cursor: isActive ? 'default' : 'pointer',
    transform: `translateX(${tx}px) translateY(-50%) rotateY(${rotY}deg) scale(${scale})`,
    opacity: opa,
    transition: 'transform 0.52s cubic-bezier(0.22,1,0.36,1), opacity 0.38s ease, border-color 0.3s, box-shadow 0.4s',
    zIndex: 10 - absOff, userSelect: 'none', willChange: 'transform', display: 'flex', flexDirection: 'column',
  };

  // Inactive (side) card: just the type + how many, centered.
  if (!isActive) {
    return (
      <div role="button" tabIndex={0} onClick={onActivate}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); } }}
        className="bs-focusable" aria-label={`${bucket.label}: ${bucket.items.length}`}
        style={{ ...cardStyle, alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center' }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: bucket.color, lineHeight: 1, letterSpacing: '-2px', fontVariantNumeric: 'tabular-nums' }}>
          {bucket.items.length}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
          {bucket.label}
        </div>
      </div>
    );
  }

  // Active (center) card: header + filters + full scrollable list.
  return (
    <div style={cardStyle}>
      <div style={{ padding: '20px 20px 14px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: bucket.color, lineHeight: 1, letterSpacing: '-1.5px', fontVariantNumeric: 'tabular-nums' }}>
          {bucket.items.length}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {bucket.label}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 12, paddingBottom: 2 }}>
          <Chip label="All" active={!authorFilter && !importantOnly} onClick={() => { setAuthorFilter(null); setImportantOnly(false); }} />
          <Chip label="★ Important" active={importantOnly} onClick={() => { setImportantOnly((v) => !v); setAuthorFilter(null); }} />
          {authors.map((name) => (
            <Chip key={name} label={name} active={authorFilter === name} onClick={() => { setAuthorFilter((v) => (v === name ? null : name)); setImportantOnly(false); }} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {visible.length === 0 ? (
          <div style={{ padding: '24px 18px', fontSize: 12, color: T.muted, fontStyle: 'italic', textAlign: 'center' }}>
            {bucket.items.length === 0 ? bucket.empty : 'Nothing matches this filter.'}
          </div>
        ) : (
          visible.map((a, i) => (
            <InboxRow key={a.id} item={a} index={i} isNew={newIds.has(a.id)}
              important={announcements.isImportant(a.id)} onStar={() => announcements.toggleImportant(a.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="bs-focusable" aria-pressed={active}
      style={{
        all: 'unset', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
        color: active ? inkOnAccent() : T.muted,
        background: active ? T.primary : 'transparent',
        border: `1px solid ${active ? T.primary : T.border}`,
      }}>
      {label}
    </button>
  );
}

function InboxRow({ item: a, index, isNew, important, onStar }: {
  item: Announcement; index: number; isNew: boolean; important: boolean; onStar: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);
  return (
    <div className="bs-row-enter" style={{
      borderBottom: `1px solid ${T.rowBorder}`,
      borderLeft: `3px solid ${important ? '#fbbf24' : isNew ? T.primary : 'transparent'}`,
      animationDelay: `${Math.min(index, 12) * 30}ms`,
    }}>
      <div role="button" tabIndex={0} aria-expanded={expanded} className="bs-focusable"
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
        style={{ cursor: 'pointer', display: 'flex', gap: 9, alignItems: 'flex-start', width: '100%', boxSizing: 'border-box', padding: '10px 14px' }}>
        <span role="button" tabIndex={0} aria-label={important ? 'Unmark important' : 'Mark important'} title="Mark important"
          onClick={(e) => { e.stopPropagation(); onStar(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onStar(); } }}
          style={{ flexShrink: 0, cursor: 'pointer', fontSize: 15, lineHeight: '30px', color: important ? '#fbbf24' : T.faint, width: 16, textAlign: 'center' }}>
          {important ? '★' : '☆'}
        </span>
        <div aria-hidden="true" style={{
          width: 30, height: 30, flexShrink: 0, borderRadius: '50%', background: T.primary, color: inkOnAccent(),
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
        }}>{initials(a.author)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 12.5, fontWeight: isNew ? 800 : 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.author}
            </span>
            {isNew && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.primary, flexShrink: 0 }} />}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: T.muted, flexShrink: 0 }}>{a.timeText}</span>
          </div>
          {a.courseName && (
            <div style={{ fontSize: 10.5, color: T.primary, fontWeight: 600, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.courseName}
            </div>
          )}
          {!expanded && (
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.body}
            </div>
          )}
        </div>
        <span aria-hidden="true" style={{ flexShrink: 0, marginTop: 8, color: T.faint, transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 14px 55px' }}>
          <style>{`.bs-announce-body{font-size:12.5px;line-height:1.65;color:${T.text};word-break:break-word}.bs-announce-body img,.bs-announce-body svg{max-width:100%;height:auto}.bs-announce-body a{color:${T.primary};text-decoration:underline}.bs-announce-body p{margin:0 0 8px}.bs-announce-body ul,.bs-announce-body ol{margin:0 0 8px 18px}`}</style>
          {a.bodyHtml
            ? <div className="bs-announce-body" dangerouslySetInnerHTML={{ __html: a.bodyHtml }} />
            : <div style={{ fontSize: 12.5, lineHeight: 1.65, color: T.text, whiteSpace: 'pre-wrap' }}>{a.body || 'No additional content.'}</div>}
          {a.link && (
            <a href={a.link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 10, fontSize: 12, fontWeight: 600, color: T.primary, textDecoration: 'none' }}>
              View on Schoology ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
