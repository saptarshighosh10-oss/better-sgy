/**
 * ForgeCanvasLayout.tsx — the "Forge" edition.
 *
 * A Canvas-LMS-flavoured dashboard: dark left global-nav rail, a light course-card
 * grid with coloured header bands, and a right "To Do" rail. Clicking a card opens
 * an inline Canvas-style gradebook. Self-contained look — it carries its OWN fixed
 * palette (Canvas slate + blue) rather than the Better SGY theme, so it reads as a
 * different product the moment you switch to it.
 */
import React, { useMemo, useState } from 'react';
import type { ScrapedCourse, SchoologyData } from '../../lib/schemas';
import { parseGradeString, scorePercent, isMissing, isUpcoming, formatDueDate } from '../../lib/grade-utils';

// ── Canvas palette (fixed; independent of the theme system) ───────────────────
const C = {
  navBg: '#394B58',
  navText: '#ffffff',
  brand: '#008EE2',
  pageBg: '#f5f5f5',
  card: '#ffffff',
  ink: '#2D3B45',
  muted: '#6B7780',
  border: '#C7CDD1',
  hair: '#E8EAEC',
  green: '#0B874B',
  red: '#E0061F',
  font: "'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;

// Canvas-ish course band colours (saturated, flat).
const BANDS = ['#0E7C7B', '#BF4D8A', '#3C7AB5', '#C06C2E', '#5B6FB5', '#4B9560', '#A23B72', '#2E8B9E'];
function bandColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return BANDS[h % BANDS.length];
}

function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const NAV_ITEMS = [
  { label: 'Account', d: 'M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-7 2-7 5v1h14v-1c0-3-3-5-7-5z' },
  { label: 'Dashboard', d: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { label: 'Courses', d: 'M4 5h16M4 5v14M4 5l8 3 8-3M20 5v14M4 19l8-3 8 3' },
  { label: 'Calendar', d: 'M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z' },
  { label: 'Inbox', d: 'M4 13h4l2 3h4l2-3h4M4 13l2-8h12l2 8M4 13v6h16v-6' },
  { label: 'History', d: 'M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Help', d: 'M12 17h.01M9.5 9a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 4M12 21a9 9 0 100-18 9 9 0 000 18z' },
];

interface GradesState {
  courses: ScrapedCourse[];
  data: SchoologyData | null;
}

interface Props {
  grades: GradesState;
}

export function ForgeCanvasLayout({ grades }: Props) {
  const { courses } = grades;
  const [active, setActive] = useState('Dashboard');
  const [openCourse, setOpenCourse] = useState<ScrapedCourse | null>(null);

  // To-Do = missing first, then upcoming, across all courses.
  const todo = useMemo(() => {
    const out: Array<{ course: string; name: string; due: string; missing: boolean }> = [];
    for (const c of courses) {
      for (const cat of c.categories) {
        for (const a of cat.assignments) {
          if (isMissing(a)) out.push({ course: c.name, name: a.name, due: a.dueDate, missing: true });
          else if (isUpcoming(a)) out.push({ course: c.name, name: a.name, due: a.dueDate, missing: false });
        }
      }
    }
    return out.sort((x, y) => Number(y.missing) - Number(x.missing)).slice(0, 8);
  }, [courses]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', background: C.pageBg, fontFamily: C.font, color: C.ink, overflow: 'hidden' }}>
      {/* ── Global nav rail ─────────────────────────────────────── */}
      <nav style={{ width: 84, flexShrink: 0, background: C.navBg, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14, gap: 4, overflowY: 'auto' }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', color: C.navBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17, marginBottom: 10 }}>
          ME
        </div>
        {NAV_ITEMS.slice(1).map((it) => {
          const on = active === it.label;
          return (
            <button key={it.label} type="button"
              onClick={() => { setActive(it.label); setOpenCourse(null); }}
              style={{
                all: 'unset', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 0',
                color: on ? C.navBg : C.navText, background: on ? '#fff' : 'transparent',
              }}>
              <Icon d={it.d} size={22} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.02em' }}>{it.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Main column ─────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {openCourse ? (
          <CourseView course={openCourse} onBack={() => setOpenCourse(null)} />
        ) : (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Dashboard cards */}
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 28px 80px' }}>
              <h1 style={{ margin: '4px 0 22px', fontSize: 28, fontWeight: 400, color: C.ink }}>Dashboard</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                {courses.map((c) => (
                  <CanvasCard key={c.name} course={c} onClick={() => setOpenCourse(c)} />
                ))}
              </div>
            </div>

            {/* To-Do rail */}
            <aside style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${C.hair}`, background: '#fff', padding: '24px 18px', overflowY: 'auto', display: window.innerWidth < 900 ? 'none' : 'block' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: C.ink }}>To Do</h2>
              {todo.length === 0 ? (
                <p style={{ fontSize: 13, color: C.muted }}>Nothing to do. Nice.</p>
              ) : todo.map((t, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${C.hair}`, display: 'flex', gap: 9 }}>
                  <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', marginTop: 6, background: t.missing ? C.red : C.brand }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.brand, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                      {t.course}{t.due ? ` · ${t.missing ? 'was due ' : 'due '}${formatDueDate(t.due)}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function CanvasCard({ course, onClick }: { course: ScrapedCourse; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const band = bandColor(course.name);
  const { percent } = parseGradeString(course.grade);
  const links = [
    { label: 'Announcements', d: 'M3 11l18-5v12L3 14v-3zM11 18.5a2 2 0 11-4 0' },
    { label: 'Assignments', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 104 0M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { label: 'Discussions', d: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z' },
    { label: 'Files', d: 'M4 7v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H6a2 2 0 00-2 2z' },
  ];
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: 'pointer', background: C.card, borderRadius: 8, overflow: 'hidden',
        border: `1px solid ${C.hair}`,
        boxShadow: hover ? '0 4px 14px rgba(0,0,0,0.16)' : '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'box-shadow 120ms ease',
      }}
    >
      <div style={{ height: 142, background: band, position: 'relative' }}>
        {percent !== null && (
          <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.92)', color: C.ink, fontSize: 13, fontWeight: 700, borderRadius: 4, padding: '2px 8px' }}>
            {percent.toFixed(1)}%
          </span>
        )}
      </div>
      <div style={{ padding: '12px 14px 6px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: band, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {course.name}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {course.teacher || ' '}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2, padding: '8px 10px', borderTop: `1px solid ${C.hair}`, color: C.muted }}>
        {links.map((l) => (
          <span key={l.label} title={l.label} style={{ flex: 1, display: 'flex', justifyContent: 'center', color: hover ? C.brand : '#AEB6BB' }}>
            <Icon d={l.d} size={18} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Inline Canvas-style course page: coloured header, left course menu, grades table. */
function CourseView({ course, onBack }: { course: ScrapedCourse; onBack: () => void }) {
  const band = bandColor(course.name);
  const { percent, letter } = parseGradeString(course.grade);
  const menu = ['Home', 'Announcements', 'Assignments', 'Grades', 'People', 'Files', 'Syllabus'];
  const rows = course.categories.flatMap((cat) =>
    cat.assignments.map((a) => ({ cat: cat.name, ...a })),
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: band, color: '#fff', padding: '16px 28px' }}>
        <button type="button" onClick={onBack}
          style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, opacity: 0.92, letterSpacing: '0.03em' }}>
          ← Dashboard
        </button>
        <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700 }}>{course.name}</h1>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>{course.teacher}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <nav style={{ width: 170, flexShrink: 0, borderRight: `1px solid ${C.hair}`, padding: '14px 0', background: '#fff', display: window.innerWidth < 760 ? 'none' : 'block' }}>
          {menu.map((m) => {
            const on = m === 'Grades';
            return (
              <div key={m} style={{
                padding: '8px 16px', fontSize: 13.5, cursor: 'default',
                color: on ? C.brand : C.ink, fontWeight: on ? 700 : 400,
                borderLeft: on ? `3px solid ${C.brand}` : '3px solid transparent',
                background: on ? '#fff' : 'transparent',
              }}>{m}</div>
            );
          })}
        </nav>
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '22px 28px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 400 }}>Grades</h2>
            <div style={{ fontSize: 14, color: C.ink }}>
              Total: <strong style={{ color: band }}>{percent !== null ? `${percent.toFixed(2)}%` : '—'}</strong>
              {letter && letter !== '—' && <span style={{ color: C.muted }}> ({letter})</span>}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: C.muted, borderBottom: `2px solid ${C.border}` }}>
                <th style={{ padding: '8px 8px', fontWeight: 700 }}>Name</th>
                <th style={{ padding: '8px 8px', fontWeight: 700, width: 110 }}>Due</th>
                <th style={{ padding: '8px 8px', fontWeight: 700, width: 90, textAlign: 'right' }}>Score</th>
                <th style={{ padding: '8px 8px', fontWeight: 700, width: 80, textAlign: 'right' }}>Out of</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => {
                const pct = scorePercent(a.score, a.maxGrade);
                const miss = isMissing(a);
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.hair}` }}>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ color: C.brand, fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{a.cat}</div>
                    </td>
                    <td style={{ padding: '10px 8px', color: C.muted }}>{a.dueDate ? formatDueDate(a.dueDate) : '—'}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: miss ? C.red : pct !== null && pct >= 70 ? C.green : C.ink, fontVariantNumeric: 'tabular-nums' }}>
                      {miss ? 'Missing' : a.score || '—'}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                      {a.maxGrade ? a.maxGrade.replace(/^\/\s*/, '') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p style={{ color: C.muted, fontSize: 13, marginTop: 16 }}>No assignments in this course yet.</p>}
        </div>
      </div>
    </div>
  );
}
