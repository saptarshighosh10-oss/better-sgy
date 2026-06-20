import React, { useEffect, useMemo, useRef, useState } from 'react';
import { T, inkOnAccent } from '../../lib/theme';
import { AT, tileBg, hairline } from '../../lib/halo';
import { haloCardStyle } from '../halo-ui';
import type { UseAnnouncements } from '../../lib/use-announcements';
import type { Announcement } from '../../lib/fetch-announcements';
import { openSafe } from '../../lib/safe-url';

interface Props {
  announcements: UseAnnouncements;
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
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const didMark = useRef(false);

  const buckets: Bucket[] = useMemo(() => [
    { key: 'message', label: 'Announcements', color: T.text, items: items.filter((a) => a.kind === 'message'), empty: 'No teacher messages yet.' },
    { key: 'update', label: 'Updates', color: T.text, items: items.filter((a) => a.kind === 'update'), empty: 'No notifications yet.' },
    { key: 'class-update', label: 'Class updates', color: T.text, items: items.filter((a) => a.kind === 'class-update'), empty: 'No course posts yet.' },
  ], [items]);

  useEffect(() => {
    if (loading || didMark.current || items.length === 0) return;
    setNewIds(new Set(items.filter((a) => announcements.isUnread(a.id)).map((a) => a.id)));
    announcements.markAllSeen();
    didMark.current = true;
  }, [loading, items, announcements]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: T.bg, fontFamily: AT.font }}>
      <div style={{ maxWidth: 1040, width: '100%', margin: '0 auto', padding: '40px clamp(20px, 4vw, 40px) 80px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: AT.h1, fontWeight: AT.semibold, color: T.text, letterSpacing: AT.trackHead }}>Announcements</h1>
        {announcements.unreadCount > 0 && (
          <span style={{ fontSize: AT.caption, fontWeight: AT.semibold, color: inkOnAccent(), background: T.primary, borderRadius: AT.rPill, padding: '3px 11px', lineHeight: 1.5 }}>
            {announcements.unreadCount} new
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => announcements.refresh()} className="bs-focusable bs-applink" title="Refresh"
          style={{ all: 'unset', cursor: 'pointer', color: T.primary, fontSize: AT.sub, letterSpacing: AT.trackBody }}>↻ Refresh</button>
      </div>

      {loading ? (
        <div role="status" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span className="bs-spinner" style={{ color: T.muted }} aria-hidden="true" />
          <span style={{ color: T.muted, fontSize: AT.body }}>Loading announcements…</span>
        </div>
      ) : error && items.length === 0 ? (
        <div style={{ ...haloCardStyle(), padding: '16px 20px', fontSize: AT.body, color: T.muted, lineHeight: 1.6 }}>{error}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
          {buckets.map((b, i) => (
            <CategoryCard
              key={b.key}
              bucket={b}
              index={i}
              newIds={newIds}
              announcements={announcements}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function CategoryCard({ bucket, index, newIds, announcements }: {
  bucket: Bucket;
  index: number;
  newIds: Set<string>;
  announcements: UseAnnouncements;
}) {
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [importantOnly, setImportantOnly] = useState(false);

  const authors = useMemo(() => {
    const c = new Map<string, number>();
    for (const a of bucket.items) c.set(a.author, (c.get(a.author) ?? 0) + 1);
    return Array.from(c.entries()).sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [bucket.items]);

  let visible = bucket.items;
  if (importantOnly) visible = visible.filter((a) => announcements.isImportant(a.id));
  if (authorFilter) visible = visible.filter((a) => a.author === authorFilter);

  return (
    <div className="bs-halo-in" style={{ ...haloCardStyle(), overflow: 'hidden', display: 'flex', flexDirection: 'column', animationDelay: `${index * 70}ms` }}>
      <div style={{ padding: '20px 22px 14px', borderBottom: `1px solid ${hairline()}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: AT.h1, fontWeight: AT.semibold, color: bucket.color, lineHeight: 1, letterSpacing: AT.trackHead, fontVariantNumeric: 'tabular-nums' }}>
            {bucket.items.length}
          </span>
          <span style={{ fontSize: AT.h3, fontWeight: AT.semibold, color: T.text, letterSpacing: AT.trackHead }}>
            {bucket.label}
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginTop: 14, paddingBottom: 2 }}>
          <Chip label="All" active={!authorFilter && !importantOnly} onClick={() => { setAuthorFilter(null); setImportantOnly(false); }} />
          <Chip label="★ Important" active={importantOnly} onClick={() => { setImportantOnly((v) => !v); setAuthorFilter(null); }} />
          {authors.map((name) => (
            <Chip key={name} label={name} active={authorFilter === name} onClick={() => { setAuthorFilter((v) => (v === name ? null : name)); setImportantOnly(false); }} />
          ))}
        </div>
      </div>

      <div style={{ minHeight: 0, maxHeight: 520, overflowY: 'auto' }}>
        {visible.length === 0 ? (
          <div style={{ padding: '28px 22px', fontSize: AT.sub, color: T.muted, textAlign: 'center' }}>
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
    <button type="button" onClick={onClick} className="bs-focusable bs-press" aria-pressed={active}
      style={{
        all: 'unset', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
        fontSize: AT.caption, fontWeight: AT.medium, padding: '5px 12px', borderRadius: AT.rPill,
        color: active ? T.bg : T.muted,
        background: active ? T.text : tileBg(),
      }}>
      {label}
    </button>
  );
}

function InboxRow({ item: a, index, isNew, important, onStar }: {
  item: Announcement; index: number; isNew: boolean; important: boolean; onStar: () => void;
}) {
  const open = () => openSafe(a.link);
  return (
    <button type="button" onClick={open} className="bs-row-enter bs-focusable"
      style={{
        all: 'unset', cursor: a.link ? 'pointer' : 'default', display: 'flex', gap: 11, alignItems: 'flex-start',
        width: '100%', boxSizing: 'border-box', padding: '13px 22px', borderBottom: `1px solid ${hairline()}`,
        borderLeft: `3px solid ${important ? T.amber : isNew ? T.primary : 'transparent'}`,
        animationDelay: `${Math.min(index, 12) * 30}ms`,
      }}>
      <span role="button" tabIndex={0} aria-label={important ? 'Unmark important' : 'Mark important'} title="Mark important"
        onClick={(e) => { e.stopPropagation(); onStar(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onStar(); } }}
        style={{ flexShrink: 0, cursor: 'pointer', fontSize: 16, lineHeight: '32px', color: important ? T.amber : T.muted, width: 16, textAlign: 'center' }}>
        {important ? '★' : '☆'}
      </span>
      <div aria-hidden="true" style={{
        width: 32, height: 32, flexShrink: 0, borderRadius: '50%', background: tileBg(), color: T.muted,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: AT.caption, fontWeight: AT.semibold,
      }}>{initials(a.author)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: AT.sub, fontWeight: isNew ? AT.semibold : AT.medium, color: T.text, letterSpacing: AT.trackBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.author}
          </span>
          {isNew && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.primary, flexShrink: 0 }} />}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: AT.micro, color: T.muted, flexShrink: 0 }}>{a.timeText}</span>
        </div>
        {a.courseName && (
          <div style={{ fontSize: AT.caption, color: T.muted, fontWeight: AT.medium, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.courseName}
          </div>
        )}
        <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.body}
        </div>
      </div>
    </button>
  );
}
