/**
 * SlateSchoologyLayout.tsx — the "Slate" edition.
 *
 * A faithful nod to classic Schoology: the blue top header with Home/Courses/
 * Groups/Resources + search, a left course list, a centre "Recent Activity" feed
 * synthesised from announcements + recently-graded work, and a right rail with
 * "Upcoming" and "Overdue". Clicking a course opens an inline Schoology-style
 * gradebook. Carries its OWN fixed Schoology palette, independent of the theme.
 */
import React, { useMemo, useState } from 'react';
import type { ScrapedCourse, SchoologyData } from '../../lib/schemas';
import { parseGradeString, scorePercent, isMissing, isUpcoming, formatDueDate, parseDueDate } from '../../lib/grade-utils';
import { courseAbbr } from '../../lib/course-colors';

// ── Schoology palette (fixed) ─────────────────────────────────────────────────
const S = {
  header: '#4b91c9',
  headerDark: '#3d7ab0',
  pageBg: '#eef0f3',
  card: '#ffffff',
  ink: '#33424a',
  muted: '#7c878e',
  link: '#0677ba',
  border: '#dfe2e5',
  hair: '#edeff1',
  green: '#3aa548',
  red: '#d3322b',
  amber: '#e88a1a',
  font: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
} as const;

const COURSE_ICON = ['#5a8f3c', '#3c6e8f', '#8f5a3c', '#6e3c8f', '#8f3c5a', '#3c8f6e', '#8f8f3c', '#3c3c8f'];
function iconColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return COURSE_ICON[h % COURSE_ICON.length];
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?';
}

interface Announcement { author: string; body: string; courseName?: string; timeText?: string; timestamp?: number; }
interface GradesState { courses: ScrapedCourse[]; data: SchoologyData | null; }
interface Props { grades: GradesState; announcements?: Announcement[]; }

export function SlateSchoologyLayout({ grades, announcements = [] }: Props) {
  const { courses } = grades;
  const [openCourse, setOpenCourse] = useState<ScrapedCourse | null>(null);

  // Recent Activity = announcements + recently-graded work, newest-ish first.
  const feed = useMemo(() => {
    const items: Array<{ author: string; course?: string; text: string; time: string; kind: 'post' | 'grade' }> = [];
    for (const a of announcements.slice(0, 8)) {
      items.push({ author: a.author || 'Schoology', course: a.courseName, text: a.body, time: a.timeText || '', kind: 'post' });
    }
    for (const c of courses) {
      const graded = c.categories.flatMap((cat) => cat.assignments).filter((x) => x.status === 'graded').slice(-2);
      for (const g of graded) {
        const pct = scorePercent(g.score, g.maxGrade);
        items.push({ author: c.teacher || c.name, course: c.name, kind: 'grade', time: g.dueDate ? formatDueDate(g.dueDate) : '',
          text: `graded ${g.name}${g.score ? ` — ${g.score}${g.maxGrade ? ` ${g.maxGrade}` : ''}${pct !== null ? ` (${pct.toFixed(0)}%)` : ''}` : ''}` });
      }
    }
    return items.slice(0, 12);
  }, [courses, announcements]);

  // Upcoming + overdue.
  const { upcoming, overdue } = useMemo(() => {
    const up: Array<{ course: string; name: string; due: string; d: Date | null }> = [];
    const od: Array<{ course: string; name: string; due: string }> = [];
    for (const c of courses) {
      for (const cat of c.categories) {
        for (const a of cat.assignments) {
          if (isUpcoming(a)) up.push({ course: c.name, name: a.name, due: a.dueDate, d: parseDueDate(a.dueDate) });
          else if (isMissing(a)) od.push({ course: c.name, name: a.name, due: a.dueDate });
        }
      }
    }
    up.sort((x, y) => (x.d?.getTime() ?? 0) - (y.d?.getTime() ?? 0));
    return { upcoming: up.slice(0, 6), overdue: od.slice(0, 6) };
  }, [courses]);

  const NAV = ['Home', 'Courses', 'Groups', 'Resources'];

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: S.pageBg, fontFamily: S.font, color: S.ink, overflow: 'hidden' }}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <header style={{ flexShrink: 0, height: 50, background: S.header, display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 12, gap: 4 }}>
        <button type="button" onClick={() => setOpenCourse(null)}
          style={{ all: 'unset', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 19, letterSpacing: '-0.01em', marginRight: 18, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span aria-hidden="true" style={{ display: 'inline-flex' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 3L1 8l11 5 9-4.09V15h2V8L12 3zM5 13.18v3.5L12 20l7-3.32v-3.5L12 16l-7-2.82z" /></svg>
          </span>
          Schoology
        </button>
        {NAV.map((n) => (
          <button key={n} type="button" onClick={() => setOpenCourse(null)}
            style={{ all: 'unset', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, padding: '0 12px', height: 50, display: 'flex', alignItems: 'center', opacity: n === 'Home' ? 1 : 0.92, background: n === 'Home' ? S.headerDark : 'transparent' }}>
            {n} <span aria-hidden="true" style={{ marginLeft: 5, fontSize: 9, opacity: 0.8 }}>▾</span>
          </button>
        ))}
        <div style={{ flex: 1, maxWidth: 360, margin: '0 14px', height: 30, background: '#fff', borderRadius: 3, display: 'flex', alignItems: 'center', padding: '0 10px', color: S.muted, fontSize: 13 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={S.muted} strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
          <span style={{ marginLeft: 8 }}>Search</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, color: '#fff' }}>
          {['M3 11l18-5v12L3 14M11 18.5a2 2 0 11-4 0', 'M12 22a2 2 0 002-2h-4a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z'].map((d, i) => (
            <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
          ))}
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#fff', color: S.header, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>ME</div>
        </div>
      </header>

      {openCourse ? (
        <CourseView course={openCourse} onBack={() => setOpenCourse(null)} />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 16px 80px', display: 'grid', gridTemplateColumns: 'minmax(170px, 210px) minmax(0, 1fr) minmax(200px, 260px)', gap: 16, alignItems: 'start' }}>
            {/* Left: course list */}
            <Panel title="Courses">
              {courses.map((c) => (
                <button key={c.name} type="button" onClick={() => setOpenCourse(c)}
                  style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', width: '100%', boxSizing: 'border-box', borderBottom: `1px solid ${S.hair}` }}>
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 3, background: iconColor(c.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                    {courseAbbr(c.name).slice(0, 3)}
                  </span>
                  <span style={{ fontSize: 12.5, color: S.link, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                </button>
              ))}
              {courses.length === 0 && <div style={{ padding: '12px', fontSize: 12, color: S.muted }}>No courses.</div>}
            </Panel>

            {/* Center: Recent Activity */}
            <div>
              <Panel title="Recent Activity">
                {feed.length === 0 ? (
                  <div style={{ padding: '16px 14px', fontSize: 13, color: S.muted }}>No recent activity.</div>
                ) : feed.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 11, padding: '13px 14px', borderBottom: i < feed.length - 1 ? `1px solid ${S.hair}` : 'none' }}>
                    <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 3, background: iconColor(f.author), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                      {initials(f.author)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.45 }}>
                        <span style={{ color: S.link, fontWeight: 700 }}>{f.author}</span>
                        {f.kind === 'grade'
                          ? <span style={{ color: S.ink }}> {f.text}</span>
                          : <span style={{ color: S.muted }}>{f.course ? ` to ${f.course}` : ''}</span>}
                      </div>
                      {f.kind === 'post' && <div style={{ fontSize: 13, color: S.ink, marginTop: 4, lineHeight: 1.5 }}>{f.text}</div>}
                      <div style={{ fontSize: 11, color: S.muted, marginTop: 5 }}>{f.time || 'recently'}{f.course && f.kind === 'grade' ? ` · ${f.course}` : ''}</div>
                    </div>
                  </div>
                ))}
              </Panel>
            </div>

            {/* Right: Upcoming + Overdue */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Panel title="Overdue">
                {overdue.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 12.5, color: S.muted }}>Nothing overdue.</div>
                ) : overdue.map((o, i) => (
                  <div key={i} style={{ padding: '9px 14px', borderBottom: i < overdue.length - 1 ? `1px solid ${S.hair}` : 'none' }}>
                    <div style={{ fontSize: 12.5, color: S.link, fontWeight: 700, lineHeight: 1.3 }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: S.red, marginTop: 2 }}>{o.course}{o.due ? ` · due ${formatDueDate(o.due)}` : ''}</div>
                  </div>
                ))}
              </Panel>
              <Panel title="Upcoming">
                {upcoming.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 12.5, color: S.muted }}>Nothing upcoming.</div>
                ) : upcoming.map((u, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 14px', borderBottom: i < upcoming.length - 1 ? `1px solid ${S.hair}` : 'none' }}>
                    <div style={{ flexShrink: 0, textAlign: 'center', width: 34 }}>
                      <div style={{ fontSize: 10, color: S.red, fontWeight: 700, textTransform: 'uppercase' }}>{u.d ? u.d.toLocaleDateString('en-US', { month: 'short' }) : '—'}</div>
                      <div style={{ fontSize: 17, color: S.ink, fontWeight: 700, lineHeight: 1 }}>{u.d ? u.d.getDate() : '·'}</div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: S.link, fontWeight: 700, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{u.course}</div>
                    </div>
                  </div>
                ))}
              </Panel>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 4 }}>
      <div style={{ padding: '9px 14px', borderBottom: `1px solid ${S.border}`, fontSize: 13, fontWeight: 700, color: S.ink, background: '#f7f8f9', borderRadius: '4px 4px 0 0' }}>
        {title}
      </div>
      <div>{children}</div>
    </section>
  );
}

/** Inline Schoology-style course page: blue sub-header, left menu, gradebook. */
function CourseView({ course, onBack }: { course: ScrapedCourse; onBack: () => void }) {
  const { percent, letter } = parseGradeString(course.grade);
  const menu = ['Materials', 'Updates', 'Gradebook', 'Members', 'Course Options'];
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ background: S.headerDark, color: '#fff', padding: '12px 0' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={onBack} style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, opacity: 0.9 }}>← Home</button>
          <span style={{ opacity: 0.5 }}>/</span>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{course.name}</h1>
        </div>
      </div>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '16px 16px 80px', display: 'grid', gridTemplateColumns: 'minmax(160px, 200px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <Panel title={course.name}>
          {menu.map((m) => {
            const on = m === 'Gradebook';
            return (
              <div key={m} style={{ padding: '9px 14px', fontSize: 12.5, borderBottom: `1px solid ${S.hair}`, color: on ? S.ink : S.link, fontWeight: 700, background: on ? '#eaf3fa' : 'transparent', borderLeft: on ? `3px solid ${S.link}` : '3px solid transparent' }}>
                {m}
              </div>
            );
          })}
        </Panel>

        <Panel title={`Grades — ${percent !== null ? `${percent.toFixed(2)}%` : '—'}${letter && letter !== '—' ? ` (${letter})` : ''}`}>
          {course.categories.map((cat, ci) => (
            <div key={ci}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#f7f8f9', borderBottom: `1px solid ${S.hair}`, fontSize: 12.5, fontWeight: 700, color: S.ink }}>
                <span>{cat.name}</span>
                {cat.weight && <span style={{ color: S.muted, fontWeight: 400 }}>{cat.weight}</span>}
              </div>
              {cat.assignments.map((a, ai) => {
                const pct = scorePercent(a.score, a.maxGrade);
                const miss = isMissing(a);
                return (
                  <div key={ai} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: `1px solid ${S.hair}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: S.link, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                      {a.dueDate && <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>Due {formatDueDate(a.dueDate)}</div>}
                    </div>
                    <div style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: miss ? S.red : pct !== null && pct >= 70 ? S.green : S.ink }}>
                      {miss ? 'Missing' : a.score ? `${a.score}${a.maxGrade ? ` ${a.maxGrade}` : ''}` : '—'}
                    </div>
                  </div>
                );
              })}
              {cat.assignments.length === 0 && <div style={{ padding: '10px 14px', fontSize: 12, color: S.muted }}>No assignments.</div>}
            </div>
          ))}
          {course.categories.length === 0 && <div style={{ padding: '14px', fontSize: 13, color: S.muted }}>No gradebook data.</div>}
        </Panel>
      </div>
    </div>
  );
}
