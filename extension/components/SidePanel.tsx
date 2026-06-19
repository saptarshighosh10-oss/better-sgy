/**
 * SidePanel.tsx — Chrome side panel (lives beside any tab). A quiet, glanceable
 * companion to the overlay: recent activity, a per-course grade graph, and cached
 * teacher updates. Pure storage reader — the content script produces the data while
 * a Schoology tab is open; this just renders + reacts to it.
 *
 * Design: iOS-grouped minimalism — one quiet grouped surface per section, hairline
 * row separators, generous whitespace, ink typography, color only for real signal.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { GlobalStyles } from './GlobalStyles';
import { T } from '../lib/theme';
import { AT, tileBg, hairline } from '../lib/apple';
import { parseGradeString, gradeColor } from '../lib/grade-utils';
import { computeSemesterTrend, type GradePoint } from '../lib/grade-history';
import { loadGradeData } from '../lib/storage';
import { loadChanges, type ChangeEvent } from '../lib/grade-changes';
import { loadWatchStatus, type WatchStatus } from '../lib/watch-status';
import { loadCachedAnnouncements } from '../lib/announcement-cache';
import type { SchoologyData } from '../lib/schemas';
import type { Announcement } from '../lib/fetch-announcements';

function timeAgo(ts: number): string {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Quiet iOS-style section header. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: AT.caption, fontWeight: AT.medium, color: T.muted, letterSpacing: AT.trackBody, margin: '34px 6px 10px' }}>
      {children}
    </div>
  );
}

/** Quiet grouped surface — the single rounded container per section. */
function Group({ children }: { children: React.ReactNode }) {
  return <div style={{ background: tileBg(), borderRadius: 18, overflow: 'hidden' }}>{children}</div>;
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '22px 18px', fontSize: AT.sub, color: T.muted, textAlign: 'center', lineHeight: 1.5 }}>{children}</div>;
}

function Trend({ points }: { points: GradePoint[] }) {
  if (points.length < 2) {
    return <div style={{ fontSize: AT.caption, color: T.muted, padding: '16px 0 4px', textAlign: 'center' }}>Not enough history yet.</div>;
  }
  const W = 320, H = 84, pad = 6;
  const sorted = [...points].sort((a, b) => a.ts - b.ts);
  const pcts = sorted.map((p) => p.percent);
  const min = Math.min(...pcts) - 1;
  const max = Math.max(...pcts) + 1;
  const span = max - min || 1;
  const pts = sorted.map((p, i) => {
    const x = pad + (i / (sorted.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (p.percent - min) / span) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const [lx, ly] = pts[pts.length - 1].split(',');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-hidden="true" style={{ display: 'block', marginTop: 12 }}>
      <polyline points={pts.join(' ')} fill="none" stroke={T.text} strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3" fill={T.text} />
    </svg>
  );
}

function ActivityRow({ event: e, last }: { event: ChangeEvent; last: boolean }) {
  const primary = e.kind === 'grade' ? e.course : e.name;
  const secondary =
    e.kind === 'grade' ? `${e.oldPct?.toFixed(1)} → ${e.newPct?.toFixed(1)}%`
      : e.kind === 'graded' ? `Graded · ${e.course}`
        : `New assignment · ${e.course}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: last ? 'none' : `1px solid ${hairline()}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</div>
        <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 2, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {secondary} · {timeAgo(e.ts)}
        </div>
      </div>
      {e.kind === 'grade' ? (
        <span style={{ fontSize: AT.sub, fontWeight: AT.medium, color: e.delta >= 0 ? T.fresh : T.failed, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {e.delta >= 0 ? '+' : '−'}{Math.abs(e.delta).toFixed(1)}%
        </span>
      ) : e.kind === 'graded' ? (
        <span style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {e.pct !== null ? `${e.pct.toFixed(0)}%` : ''}
        </span>
      ) : null}
    </div>
  );
}

export function SidePanel() {
  const [data, setData] = useState<SchoologyData | null>(null);
  const [changes, setChanges] = useState<ChangeEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [watch, setWatch] = useState<WatchStatus | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [d, ch, ann, w] = await Promise.all([loadGradeData(), loadChanges(), loadCachedAnnouncements(), loadWatchStatus()]);
      setData(d);
      setChanges(ch);
      setAnnouncements(ann);
      setWatch(w);
      setSelected((prev) => prev ?? d?.courses[0]?.name ?? null);
    }
    void load();
    const onChanged = (_c: Record<string, unknown>, area: string) => { if (area === 'local') void load(); };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  const courses = data?.courses ?? [];
  const avg = useMemo(() => {
    const pcts = courses.map((c) => parseGradeString(c.grade).percent).filter((p): p is number => p !== null);
    return pcts.length ? pcts.reduce((s, p) => s + p, 0) / pcts.length : null;
  }, [courses]);
  const selCourse = courses.find((c) => c.name === selected) ?? courses[0] ?? null;
  const shownChanges = changes.slice(0, 14);
  const shownAnn = announcements.slice(0, 10);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: AT.font, padding: '26px 16px 48px', boxSizing: 'border-box' }}>
      <GlobalStyles />

      {/* Hero — ink number, color reserved for real signal */}
      <div className="bs-apple-in" style={{ padding: '0 6px' }}>
        <div style={{ fontSize: AT.caption, color: T.muted, letterSpacing: AT.trackBody }}>Better SGY</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, marginTop: 6 }}>
          <span style={{ fontSize: 46, fontWeight: AT.semibold, letterSpacing: AT.trackTight, lineHeight: 1, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
            {avg !== null ? avg.toFixed(1) : '—'}
          </span>
          {avg !== null && <span style={{ fontSize: 22, fontWeight: AT.medium, color: T.muted, marginBottom: 3 }}>%</span>}
        </div>
        <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 6, letterSpacing: AT.trackBody }}>
          Overall average · {courses.length} course{courses.length === 1 ? '' : 's'}{watch ? ` · checked ${timeAgo(watch.ts)}` : ''}
        </div>
      </div>

      {/* Watcher health */}
      {watch && !watch.ok && (
        <div className="bs-apple-in" style={{ marginTop: 18, padding: '12px 14px', borderRadius: 14, background: `${T.failed}12`, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <span aria-hidden="true" style={{ color: T.failed, fontWeight: AT.semibold }}>·</span>
          <div style={{ fontSize: AT.caption, color: T.text, lineHeight: 1.5 }}>
            {watch.reason === 'session'
              ? 'Grades couldn’t refresh — your Schoology session expired. Open Schoology and sign in; this catches up on its own.'
              : watch.reason === 'network'
                ? 'Couldn’t reach Schoology just now. It’ll retry shortly.'
                : 'Couldn’t read your grades this time. It’ll retry shortly.'}
          </div>
        </div>
      )}

      {/* Activity */}
      <SectionLabel>Recent activity</SectionLabel>
      <Group>
        {shownChanges.length === 0 ? (
          <EmptyRow>Nothing new yet. Grade moves, new assignments, and newly-graded work show up here.</EmptyRow>
        ) : (
          shownChanges.map((e, i) => <ActivityRow key={`${e.kind}-${e.course}-${e.ts}-${i}`} event={e} last={i === shownChanges.length - 1} />)
        )}
      </Group>

      {/* Grade over time */}
      {courses.length > 0 && (
        <>
          <SectionLabel>Grade over time</SectionLabel>
          <div style={{ display: 'flex', gap: 18, overflowX: 'auto', padding: '0 6px 2px', marginBottom: 12 }}>
            {courses.map((c) => {
              const active = c.name === selCourse?.name;
              return (
                <button key={c.name} type="button" onClick={() => setSelected(c.name)} className="bs-focusable"
                  style={{ all: 'unset', cursor: 'pointer', fontSize: AT.caption, whiteSpace: 'nowrap', paddingBottom: 5, flexShrink: 0,
                    fontWeight: active ? AT.semibold : AT.regular, color: active ? T.text : T.muted,
                    borderBottom: `2px solid ${active ? T.text : 'transparent'}` }}>
                  {c.name.length > 16 ? c.name.slice(0, 16) + '…' : c.name}
                </button>
              );
            })}
          </div>
          {selCourse && (
            <Group>
              <div style={{ padding: '16px 16px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text }}>{selCourse.name}</span>
                  <span style={{ fontSize: AT.sub, fontWeight: AT.semibold, color: gradeColor(parseGradeString(selCourse.grade).percent), fontVariantNumeric: 'tabular-nums' }}>
                    {parseGradeString(selCourse.grade).percent?.toFixed(1) ?? '—'}%
                  </span>
                </div>
                <Trend points={computeSemesterTrend(selCourse)} />
              </div>
            </Group>
          )}
        </>
      )}

      {/* Updates */}
      <SectionLabel>Updates</SectionLabel>
      <Group>
        {shownAnn.length === 0 ? (
          <EmptyRow>No updates cached yet. Open a Schoology tab to pull the latest.</EmptyRow>
        ) : (
          shownAnn.map((a, i) => (
            <button key={a.id} type="button" onClick={() => { if (a.link) browser.tabs.create({ url: a.link }); }}
              className="bs-focusable"
              style={{ all: 'unset', display: 'block', width: '100%', boxSizing: 'border-box', cursor: a.link ? 'pointer' : 'default', padding: '13px 16px', borderBottom: i === shownAnn.length - 1 ? 'none' : `1px solid ${hairline()}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.author || 'Schoology'}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: AT.micro, color: T.muted, flexShrink: 0 }}>{a.timeText || timeAgo(a.timestamp)}</span>
              </div>
              <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 4, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {a.courseName ? `${a.courseName} — ${a.body}` : a.body}
              </div>
            </button>
          ))
        )}
      </Group>
    </div>
  );
}
