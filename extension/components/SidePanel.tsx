/**
 * SidePanel.tsx — Chrome side panel (lives beside any tab). A quiet, glanceable
 * companion to the overlay: recent grade changes, a per-course grade graph, and
 * cached teacher announcements. Pure storage reader — the content script produces
 * the data while a Schoology tab is open; this just renders + reacts to it.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { GlobalStyles } from './GlobalStyles';
import { T } from '../lib/theme';
import { AT, tileBg, hairline } from '../lib/apple';
import { appleCardStyle, SectionHeader } from './apple-ui';
import { parseGradeString, gradeColor } from '../lib/grade-utils';
import { courseColor } from '../lib/course-colors';
import { computeSemesterTrend, type GradePoint } from '../lib/grade-history';
import { loadGradeData } from '../lib/storage';
import { loadGradeChanges, type GradeChange } from '../lib/grade-changes';
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

function Trend({ points, color }: { points: GradePoint[]; color: string }) {
  if (points.length < 2) {
    return <div style={{ fontSize: AT.caption, color: T.muted, padding: '20px 0', textAlign: 'center' }}>Not enough history yet — check back after a few updates.</div>;
  }
  const W = 320, H = 96, pad = 6;
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
  const last = pts[pts.length - 1].split(',');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-hidden="true" style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} />
    </svg>
  );
}

export function SidePanel() {
  const [data, setData] = useState<SchoologyData | null>(null);
  const [changes, setChanges] = useState<GradeChange[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [d, ch, ann] = await Promise.all([loadGradeData(), loadGradeChanges(), loadCachedAnnouncements()]);
      setData(d);
      setChanges(ch);
      setAnnouncements(ann);
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

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: AT.font, padding: '20px 16px 40px', boxSizing: 'border-box' }}>
      <GlobalStyles />

      {/* Header */}
      <div className="bs-apple-in" style={{ marginBottom: 22 }}>
        <div style={{ fontSize: AT.sub, color: T.muted, letterSpacing: AT.trackBody }}>Better SGY</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 44, fontWeight: AT.semibold, letterSpacing: AT.trackTight, lineHeight: 1, color: gradeColor(avg) ?? T.text, fontVariantNumeric: 'tabular-nums' }}>
            {avg !== null ? avg.toFixed(1) : '—'}
          </span>
          {avg !== null && <span style={{ fontSize: AT.h3, fontWeight: AT.semibold, color: T.muted }}>%</span>}
        </div>
        <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 4 }}>
          Overall average · {courses.length} course{courses.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Grade changes */}
      <div className="bs-apple-in" style={{ marginBottom: 24 }}>
        <SectionHeader title="Recent changes" />
        <div style={{ ...appleCardStyle(), overflow: 'hidden', marginTop: 12 }}>
          {changes.length === 0 ? (
            <div style={{ padding: '22px 18px', fontSize: AT.sub, color: T.muted, textAlign: 'center' }}>
              No grade changes yet. Keep a Schoology tab open and you'll be pinged here when something moves.
            </div>
          ) : (
            changes.slice(0, 12).map((c, i) => {
              const up = c.delta >= 0;
              return (
                <div key={`${c.course}-${c.ts}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < Math.min(changes.length, 12) - 1 ? `1px solid ${hairline()}` : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.course}</div>
                    <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                      {c.oldPct?.toFixed(1)}% → {c.newPct?.toFixed(1)}% · {timeAgo(c.ts)}
                    </div>
                  </div>
                  <span style={{ fontSize: AT.sub, fontWeight: AT.semibold, color: up ? T.fresh : T.failed, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {up ? '▲' : '▼'} {Math.abs(c.delta).toFixed(1)}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Per-course graph */}
      {courses.length > 0 && (
        <div className="bs-apple-in" style={{ marginBottom: 24 }}>
          <SectionHeader title="Grade over time" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
            {courses.map((c) => {
              const active = c.name === selCourse?.name;
              const clr = courseColor(c.name, true);
              return (
                <button key={c.name} type="button" onClick={() => setSelected(c.name)} className="bs-focusable bs-press"
                  style={{ all: 'unset', cursor: 'pointer', fontSize: AT.caption, fontWeight: AT.medium, padding: '5px 11px', borderRadius: AT.rPill, whiteSpace: 'nowrap', background: active ? `${clr}24` : tileBg(), color: active ? clr : T.muted }}>
                  {c.name.length > 18 ? c.name.slice(0, 18) + '…' : c.name}
                </button>
              );
            })}
          </div>
          {selCourse && (
            <div style={{ ...appleCardStyle(), padding: '16px 16px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: AT.sub, fontWeight: AT.semibold, color: T.text }}>{selCourse.name}</span>
                <span style={{ fontSize: AT.sub, fontWeight: AT.semibold, color: gradeColor(parseGradeString(selCourse.grade).percent), fontVariantNumeric: 'tabular-nums' }}>
                  {parseGradeString(selCourse.grade).percent?.toFixed(1) ?? '—'}%
                </span>
              </div>
              <Trend points={computeSemesterTrend(selCourse)} color={courseColor(selCourse.name, true)} />
            </div>
          )}
        </div>
      )}

      {/* Announcements */}
      <div className="bs-apple-in">
        <SectionHeader title="Updates" />
        <div style={{ ...appleCardStyle(), overflow: 'hidden', marginTop: 12 }}>
          {announcements.length === 0 ? (
            <div style={{ padding: '22px 18px', fontSize: AT.sub, color: T.muted, textAlign: 'center' }}>
              No announcements cached yet. Open a Schoology tab to pull the latest.
            </div>
          ) : (
            announcements.slice(0, 10).map((a, i) => (
              <button key={a.id} type="button" onClick={() => { if (a.link) browser.tabs.create({ url: a.link }); }}
                className="bs-focusable"
                style={{ all: 'unset', display: 'block', width: '100%', boxSizing: 'border-box', cursor: a.link ? 'pointer' : 'default', padding: '12px 16px', borderBottom: i < Math.min(announcements.length, 10) - 1 ? `1px solid ${hairline()}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.author || 'Schoology'}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: AT.micro, color: T.muted, flexShrink: 0 }}>{a.timeText || timeAgo(a.timestamp)}</span>
                </div>
                {a.courseName && <div style={{ fontSize: AT.caption, color: T.primary, fontWeight: AT.medium, marginTop: 2 }}>{a.courseName}</div>}
                <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.body}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
