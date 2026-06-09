import React, { useState } from 'react';
import type { ScrapedCourse } from '../../lib/schemas';
import { courseColor } from '../../lib/course-colors';

const T = {
  text: '#e8eaf0',
  muted: '#7a8ea3',
  faint: '#2a3a52',
  card: '#111827',
  border: '#1e2535',
  rowBorder: '#151d2e',
  primary: '#3b82f6',
  today: '#1a2540',
} as const;

interface GradesState { courses: ScrapedCourse[]; }
interface Props { grades: GradesState; }

interface CalItem {
  name: string;
  courseName: string;
  color: string;
  date: Date;
  status: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Parse Schoology's varied due-date strings into a Date (local midnight). */
function parseDue(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.replace(/\bdue\b/i, '').trim();
  // m/d/yy or m/d/yyyy
  const md = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (md) {
    let [, m, d, y] = md;
    const yr = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    const dt = new Date(yr, parseInt(m, 10) - 1, parseInt(d, 10));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function CalendarPage({ grades }: Props) {
  // Build all dated items once
  const items: CalItem[] = [];
  for (const c of grades.courses) {
    for (const cat of c.categories) {
      for (const a of cat.assignments) {
        const date = parseDue(a.dueDate);
        if (date) items.push({ name: a.name, courseName: c.name, color: courseColor(c.name), date, status: a.status });
      }
    }
  }

  // Start the calendar on the month with the most items near "now", default to
  // current month, but if there's nothing this month jump to the latest item.
  const now = new Date();
  const [cursor, setCursor] = useState(() => {
    const hasThisMonth = items.some((i) => i.date.getFullYear() === now.getFullYear() && i.date.getMonth() === now.getMonth());
    if (hasThisMonth || items.length === 0) return new Date(now.getFullYear(), now.getMonth(), 1);
    const latest = items.reduce((a, b) => (a.date > b.date ? a : b)).date;
    return new Date(latest.getFullYear(), latest.getMonth(), 1);
  });

  const byDay = new Map<string, CalItem[]>();
  for (const it of items) {
    const k = dayKey(it.date);
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(it);
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthCount = items.filter((i) => i.date.getFullYear() === year && i.date.getMonth() === month).length;

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selectedItems = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text }}>Calendar</h1>
        <span style={{ flex: 1 }} />
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={navBtn}>‹</button>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, minWidth: 150, textAlign: 'center' }}>
          {MONTHS[month]} {year}
        </div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={navBtn}>›</button>
        <button onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}
          style={{ ...navBtn, width: 'auto', padding: '0 12px', fontSize: 12 }}>Today</button>
      </div>

      {/* Day-of-week header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
        {DOW.map((d) => (
          <div key={d} style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>{d}</div>
        ))}
      </div>

      {/* Month grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', gap: 6, minHeight: 0 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const isToday = year === now.getFullYear() && month === now.getMonth() && d === now.getDate();
          const cellKey = `${year}-${month}-${d}`;
          const dayItems = byDay.get(cellKey) ?? [];
          const isSelected = selectedDay === cellKey;
          return (
            <div key={i} onClick={() => dayItems.length > 0 && setSelectedDay(isSelected ? null : cellKey)} style={{
              background: isToday ? T.today : T.card,
              border: `1px solid ${isSelected ? T.primary : isToday ? T.primary + '60' : T.border}`,
              borderRadius: 8, padding: '5px 6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0,
              cursor: dayItems.length > 0 ? 'pointer' : 'default',
            }}>
              <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? T.primary : T.muted, marginBottom: 3 }}>{d}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                {dayItems.slice(0, 4).map((it, j) => (
                  <div key={j} title={`${it.name} · ${it.courseName}`} style={{
                    display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#c8d0df',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: it.color, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                  </div>
                ))}
                {dayItems.length > 4 && (
                  <div style={{ fontSize: 9, color: T.faint }}>+{dayItems.length - 4} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected-day detail */}
      {selectedDay && selectedItems.length > 0 && (
        <div style={{ marginTop: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', maxHeight: 200, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
              {(() => { const [y, m, d] = selectedDay.split('-').map(Number); return `${MONTHS[m]} ${d}, ${y}`; })()}
            </span>
            <span style={{ fontSize: 11, color: T.faint, marginLeft: 8 }}>{selectedItems.length} due</span>
            <span style={{ flex: 1 }} />
            <button onClick={() => setSelectedDay(null)} style={{ all: 'unset', cursor: 'pointer', fontSize: 14, color: T.faint }}>×</button>
          </div>
          {selectedItems.map((it, j) => (
            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: j > 0 ? `1px solid ${T.rowBorder}` : 'none' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: it.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: '#c8d0df', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
              <span style={{ fontSize: 10, color: T.faint, flexShrink: 0 }}>{it.courseName}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: T.faint, marginTop: 10 }}>
        {monthCount > 0 ? `${monthCount} due this month` : 'Nothing due this month'} · click a day for details
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', width: 28, height: 28, borderRadius: 7,
  background: '#111827', border: '1px solid #1e2535', color: '#c8d5e8',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600,
};
