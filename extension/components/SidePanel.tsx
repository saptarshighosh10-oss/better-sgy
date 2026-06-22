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
import { AT, tileBg, hairline } from '../lib/halo';
import { parseGradeString, gradeColor } from '../lib/grade-utils';
import { computeSemesterTrend, type GradePoint } from '../lib/grade-history';
import { loadGradeData } from '../lib/storage';
import { loadChanges, dedupeChanges, type ChangeEvent } from '../lib/grade-changes';
import { loadWatchStatus, type WatchStatus } from '../lib/watch-status';
import { loadSettings, saveSettings, toggleMutedCourse, DEFAULT_SETTINGS, type Settings, type Edition } from '../lib/settings';
import { safeExternalUrl } from '../lib/safe-url';
import { loadCachedAnnouncements } from '../lib/announcement-cache';
import type { SchoologyData } from '../lib/schemas';
import type { Announcement } from '../lib/fetch-announcements';

// Set at the top of each SidePanel render so helper functions pick up the
// active edition without needing React context plumbing.
let _dense = false;

function timeAgo(ts: number): string {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/**
 * Standard grouped-list row: 13×16 padding with a hairline separator that
 * disappears on the last row. Shared by activity, settings, and update rows so
 * they all line up identically.
 */
function rowStyle(last?: boolean): React.CSSProperties {
  return { padding: _dense ? '9px 14px' : '13px 16px', borderBottom: last ? 'none' : `1px solid ${hairline()}` };
}

/** Single-line text that truncates with an ellipsis. */
const ELLIPSIS: React.CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

/** Quiet iOS-style section header. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: AT.caption, fontWeight: AT.medium, color: T.muted, letterSpacing: AT.trackBody, margin: _dense ? '20px 6px 8px' : '34px 6px 10px' }}>
      {children}
    </div>
  );
}

/** Quiet grouped surface — the single rounded container per section. */
function Group({ children }: { children: React.ReactNode }) {
  return <div style={{ background: tileBg(), borderRadius: _dense ? 12 : 18, overflow: 'hidden' }}>{children}</div>;
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '22px 18px', fontSize: AT.sub, color: T.muted, textAlign: 'center', lineHeight: 1.5 }}>{children}</div>;
}

/** iOS-style toggle switch. */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="bs-focusable"
      style={{ all: 'unset', cursor: 'pointer', width: 40, height: 24, borderRadius: 12, flexShrink: 0,
        background: on ? T.fresh : `${T.text}24`, transition: 'background 180ms ease', position: 'relative' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 20, height: 20, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 180ms cubic-bezier(0.4,0,0.2,1)' }} />
    </button>
  );
}

function SettingRow({ label, note, last, children }: { label: string; note?: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...rowStyle(last) }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text }}>{label}</div>
        {note && <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 2 }}>{note}</div>}
      </div>
      {children}
    </div>
  );
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...rowStyle(last) }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text, ...ELLIPSIS }}>{primary}</div>
        <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 2, fontVariantNumeric: 'tabular-nums', ...ELLIPSIS }}>
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

/**
 * Outer page frame — shared by the skeleton and the loaded panel so they match
 * exactly. A function (not a const) because `T.*` are theme-reactive getters that
 * must be read at render time, not at module load.
 */
function pageStyle(): React.CSSProperties {
  return {
    minHeight: '100vh', background: T.bg, color: T.text, fontFamily: AT.font,
    padding: '26px 16px 48px', boxSizing: 'border-box',
  };
}

/** Shimmer placeholder shown until storage data resolves. Mirrors the real layout. */
function Skel({ w, h, r, style }: { w: number | string; h: number; r?: number; style?: React.CSSProperties }) {
  return <div className="bs-skel" style={{ width: w, height: h, borderRadius: r ?? 7, color: T.text, ...style }} />;
}

function SidePanelSkeleton() {
  return (
    <div style={pageStyle()}>
      <GlobalStyles />
      {/* Hero */}
      <div style={{ padding: '0 6px' }}>
        <Skel w={72} h={11} />
        <Skel w={132} h={44} style={{ marginTop: 12 }} />
        <Skel w={160} h={12} style={{ marginTop: 12 }} />
      </div>
      {/* Recent activity */}
      <div style={{ height: 13, margin: '34px 6px 10px' }}><Skel w={96} h={11} /></div>
      <div style={{ background: tileBg(), borderRadius: 18, overflow: 'hidden' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i === 3 ? 'none' : `1px solid ${hairline()}` }}>
            <div style={{ flex: 1 }}>
              <Skel w="62%" h={13} />
              <Skel w="42%" h={10} style={{ marginTop: 7 }} />
            </div>
            <Skel w={38} h={13} />
          </div>
        ))}
      </div>
      {/* Graph */}
      <div style={{ height: 13, margin: '34px 6px 10px' }}><Skel w={108} h={11} /></div>
      <div style={{ display: 'flex', gap: 14, padding: '0 6px 14px' }}>
        {[44, 58, 50].map((w, i) => <Skel key={i} w={w} h={12} />)}
      </div>
      <div style={{ background: tileBg(), borderRadius: 18, padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Skel w={120} h={13} /><Skel w={40} h={13} />
        </div>
        <Skel w="100%" h={84} r={12} style={{ marginTop: 14 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Render sections — each owns one grouped surface in the panel. Split out purely
// for readability; the markup is identical to the inline original.
// ─────────────────────────────────────────────────────────────────────────────

/** Big ink average + course count + last-checked line. */
function Hero({ avg, courseCount, watch }: { avg: number | null; courseCount: number; watch: WatchStatus | null }) {
  return (
    <div className="bs-halo-in" style={{ padding: '0 6px' }}>
      <div style={{ fontSize: AT.caption, color: T.muted, letterSpacing: AT.trackBody }}>Better SGY</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, marginTop: 6 }}>
        <span style={{ fontSize: 46, fontWeight: AT.semibold, letterSpacing: AT.trackTight, lineHeight: 1, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
          {avg !== null ? avg.toFixed(1) : '—'}
        </span>
        {avg !== null && <span style={{ fontSize: 22, fontWeight: AT.medium, color: T.muted, marginBottom: 3 }}>%</span>}
      </div>
      <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 6, letterSpacing: AT.trackBody }}>
        Overall average · {courseCount} course{courseCount === 1 ? '' : 's'}{watch ? ` · checked ${timeAgo(watch.ts)}` : ''}
      </div>
    </div>
  );
}

/** Soft banner shown only when the background grade watcher last failed. */
function WatcherHealth({ watch }: { watch: WatchStatus }) {
  const message =
    watch.reason === 'session'
      ? 'Grades couldn’t refresh — your Schoology session expired. Open Schoology and sign in; this catches up on its own.'
      : watch.reason === 'network'
        ? 'Couldn’t reach Schoology just now. It’ll retry shortly.'
        : 'Couldn’t read your grades this time. It’ll retry shortly.';
  return (
    <div className="bs-halo-in" style={{ marginTop: 18, padding: '12px 14px', borderRadius: 14, background: `${T.failed}12`, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      <span aria-hidden="true" style={{ color: T.failed, fontWeight: AT.semibold }}>·</span>
      <div style={{ fontSize: AT.caption, color: T.text, lineHeight: 1.5 }}>{message}</div>
    </div>
  );
}

/** Recent grade moves / new + newly-graded work. */
function ActivitySection({ shownChanges }: { shownChanges: ChangeEvent[] }) {
  return (
    <>
      <SectionLabel>Recent activity</SectionLabel>
      <Group>
        {shownChanges.length === 0 ? (
          <EmptyRow>Nothing new yet. Grade moves, new assignments, and newly-graded work show up here.</EmptyRow>
        ) : (
          shownChanges.map((e, i) => <ActivityRow key={`${e.kind}-${e.course}-${e.ts}-${i}`} event={e} last={i === shownChanges.length - 1} />)
        )}
      </Group>
    </>
  );
}

/** Course chip-picker plus the trend sparkline for the selected course. */
function GradeOverTime({ courses, selCourse, onSelect }: {
  courses: SchoologyData['courses'];
  selCourse: SchoologyData['courses'][number] | null;
  onSelect: (name: string) => void;
}) {
  return (
    <>
      <SectionLabel>Grade over time</SectionLabel>
      <div style={{ display: 'flex', gap: 18, overflowX: 'auto', padding: '0 6px 2px', marginBottom: 12 }}>
        {courses.map((c) => {
          const active = c.name === selCourse?.name;
          return (
            <button key={c.name} type="button" onClick={() => onSelect(c.name)} className="bs-focusable"
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
  );
}

/** Cached teacher updates; each row opens the source link in a new tab. */
function UpdatesSection({ shownAnn }: { shownAnn: Announcement[] }) {
  return (
    <>
      <SectionLabel>Updates</SectionLabel>
      <Group>
        {shownAnn.length === 0 ? (
          <EmptyRow>No updates cached yet. Open a Schoology tab to pull the latest.</EmptyRow>
        ) : (
          shownAnn.map((a, i) => (
            <button key={a.id} type="button" onClick={() => { const u = safeExternalUrl(a.link); if (u) browser.tabs.create({ url: u }); }}
              className="bs-focusable"
              style={{ all: 'unset', display: 'block', width: '100%', boxSizing: 'border-box', cursor: a.link ? 'pointer' : 'default', ...rowStyle(i === shownAnn.length - 1) }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text, ...ELLIPSIS }}>{a.author || 'Schoology'}</span>
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
    </>
  );
}

/** Notification toggles. `onSave` persists a settings patch and returns the new settings. */
function NotificationSettings({ settings, onSave }: { settings: Settings; onSave: (patch: Partial<Settings>) => Promise<Settings> }) {
  return (
    <>
      <SectionLabel>Settings</SectionLabel>
      <Group>
        <SettingRow label="Notifications" note="Grade changes & new work">
          <Toggle on={settings.notifications} onChange={async (v) => onSave({ notifications: v })} />
        </SettingRow>
        <SettingRow label="Due-soon reminders" note="Heads-up the day before">
          <Toggle on={settings.dueSoonReminders} onChange={async (v) => onSave({ dueSoonReminders: v })} />
        </SettingRow>
        <SettingRow label="Open sound" note="Chime when the panel opens" last>
          <Toggle on={settings.chime} onChange={async (v) => onSave({ chime: v })} />
        </SettingRow>
      </Group>
    </>
  );
}

/** Poll-interval segmented control. */
function CheckFrequency({ settings, onSave }: { settings: Settings; onSave: (patch: Partial<Settings>) => Promise<Settings> }) {
  return (
    <>
      <SectionLabel>Check every</SectionLabel>
      <div style={{ display: 'flex', gap: 8 }}>
        {[5, 15, 30, 60].map((m) => {
          const active = settings.pollMinutes === m;
          return (
            <button key={m} type="button" className="bs-focusable"
              onClick={async () => onSave({ pollMinutes: m })}
              style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 12,
                fontSize: AT.caption, fontWeight: AT.medium,
                background: active ? T.text : tileBg(), color: active ? T.bg : T.muted }}>
              {m}m
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Per-course alert toggles (on = alerts enabled). */
function MuteCourses({ courses, settings, onToggle }: {
  courses: SchoologyData['courses'];
  settings: Settings;
  onToggle: (name: string) => Promise<Settings>;
}) {
  return (
    <>
      <SectionLabel>Mute courses</SectionLabel>
      <Group>
        {courses.map((c, i) => {
          const muted = settings.mutedCourses.includes(c.name);
          return (
            <SettingRow key={c.name} label={c.name} last={i === courses.length - 1}>
              <Toggle on={!muted} onChange={async () => onToggle(c.name)} />
            </SettingRow>
          );
        })}
      </Group>
      <div style={{ fontSize: AT.micro, color: T.muted, margin: '8px 6px 0' }}>On = you’ll get alerts for this course.</div>
    </>
  );
}

const EDITIONS: { id: Edition; label: string; note: string }[] = [
  { id: 'halo',  label: 'Halo',  note: 'Clean · color accents · recommended' },
  { id: 'forge', label: 'Forge', note: 'Dense · everything at a glance' },
  { id: 'slate', label: 'Slate', note: 'Monochrome · zero distraction' },
];

function EditionPicker({ settings, onSave }: { settings: Settings; onSave: (patch: Partial<Settings>) => Promise<Settings> }) {
  return (
    <>
      <SectionLabel>UI style</SectionLabel>
      <Group>
        {EDITIONS.map((e, i) => (
          <SettingRow key={e.id} label={e.label} note={e.note} last={i === EDITIONS.length - 1}>
            {settings.edition === e.id ? (
              <span style={{ fontSize: AT.caption, fontWeight: AT.semibold, color: T.primary }}>Active</span>
            ) : (
              <button type="button" className="bs-focusable bs-press"
                onClick={() => onSave({ edition: e.id })}
                style={{ all: 'unset', cursor: 'pointer', fontSize: AT.caption, fontWeight: AT.medium,
                  color: T.primary, padding: '5px 12px', borderRadius: 8, background: `${T.primary}18` }}>
                Switch
              </button>
            )}
          </SettingRow>
        ))}
      </Group>
    </>
  );
}

function DetectedSection({ data }: { data: SchoologyData }) {
  const totalAssignments = data.courses.reduce((sum, c) => sum + c.categories.reduce((s, cat) => s + cat.assignments.length, 0), 0);
  const rows: { label: string; value: string; last?: boolean }[] = [
    { label: 'Last synced', value: timeAgo(data.scrapedAt) },
    { label: 'Grading period', value: data.gradingPeriod || '—' },
    { label: 'Courses', value: String(data.courses.length) },
    { label: 'Assignments', value: String(totalAssignments), last: true },
  ];
  return (
    <>
      <SectionLabel>Detected</SectionLabel>
      <Group>
        {rows.map((r) => (
          <div key={r.label} style={{ ...rowStyle(r.last), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: AT.sub, color: T.text }}>{r.label}</span>
            <span style={{ fontSize: AT.sub, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
          </div>
        ))}
      </Group>
    </>
  );
}

export function SidePanel() {
  const [data, setData] = useState<SchoologyData | null>(null);
  const [changes, setChanges] = useState<ChangeEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [watch, setWatch] = useState<WatchStatus | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    async function load() {
      const [d, ch, ann, w, st] = await Promise.all([loadGradeData(), loadChanges(), loadCachedAnnouncements(), loadWatchStatus(), loadSettings()]);
      setData(d);
      setChanges(ch);
      setAnnouncements(ann);
      setWatch(w);
      setSettings(st);
      setSelected((prev) => prev ?? d?.courses[0]?.name ?? null);
      setLoading(false);
    }
    void load();
    const onChanged = (_c: Record<string, unknown>, area: string) => { if (area === 'local') void load(); };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  if (loading) return <SidePanelSkeleton />;

  const courses = data?.courses ?? [];
  const avg = useMemo(() => {
    const pcts = courses.map((c) => parseGradeString(c.grade).percent).filter((p): p is number => p !== null);
    return pcts.length ? pcts.reduce((s, p) => s + p, 0) / pcts.length : null;
  }, [courses]);
  const selCourse = courses.find((c) => c.name === selected) ?? courses[0] ?? null;
  const shownChanges = dedupeChanges(changes, 8);
  const shownAnn = announcements.slice(0, 10);

  // Persist a settings patch / course mute, reflect the saved result in local state, return it.
  const saveAndApply = async (patch: Partial<Settings>): Promise<Settings> => {
    const next = await saveSettings(patch);
    setSettings(next);
    return next;
  };
  const toggleMute = async (name: string): Promise<Settings> => {
    const next = await toggleMutedCourse(name);
    setSettings(next);
    return next;
  };

  // Apply edition flags before any helper reads _dense.
  _dense = settings.edition === 'forge';
  const slate = settings.edition === 'slate';

  return (
    <div style={{ ...pageStyle(), ...(slate ? { filter: 'grayscale(1) saturate(0)' } : {}) }}>
      <GlobalStyles />

      <Hero avg={avg} courseCount={courses.length} watch={watch} />

      {watch && !watch.ok && <WatcherHealth watch={watch} />}

      <ActivitySection shownChanges={shownChanges} />

      {courses.length > 0 && (
        <GradeOverTime courses={courses} selCourse={selCourse} onSelect={setSelected} />
      )}

      <UpdatesSection shownAnn={shownAnn} />

      <NotificationSettings settings={settings} onSave={saveAndApply} />

      <CheckFrequency settings={settings} onSave={saveAndApply} />

      {courses.length > 0 && (
        <MuteCourses courses={courses} settings={settings} onToggle={toggleMute} />
      )}

      <EditionPicker settings={settings} onSave={saveAndApply} />

      {data && <DetectedSection data={data} />}

      <div style={{ height: 24 }} />
    </div>
  );
}
