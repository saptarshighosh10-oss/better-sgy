import React, { useState } from 'react';
import type { ScrapedCourse } from '../../lib/schemas';
import { courseColor, courseAbbr } from '../../lib/course-colors';
import { T } from '../../lib/theme';
import { AT, tileBg, hairline } from '../../lib/apple';
import { appleCardStyle } from '../apple-ui';

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

// Unsubmitted work whose due date has passed = overdue (shown in red)
function isOverdue(it: CalItem, now: Date): boolean {
  return it.status === 'unsubmitted' && it.date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function CalendarPage({ grades }: Props) {
  const [filteredCourses, setFilteredCourses] = useState<Set<string>>(() => new Set(grades.courses.map((c) => c.name)));
  const missingRed = T.red;

  // Build all dated items once
  const items: CalItem[] = [];
  for (const c of grades.courses) {
    if (!filteredCourses.has(c.name)) continue;
    for (const cat of c.categories) {
      for (const a of cat.assignments) {
        const date = parseDue(a.dueDate);
        if (date) items.push({ name: a.name, courseName: c.name, color: courseColor(c.name, true), date, status: a.status });
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

  // First day of the current month
  const firstDay = new Date(year, month, 1);
  const firstDow = firstDay.getDay(); // 0 (Sun) to 6 (Sat)

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  interface CalCell {
    day: number;
    monthOffset: number; // -1 = prev, 0 = current, 1 = next
    date: Date;
  }

  const cells: CalCell[] = [];

  // Previous month trailing days
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      day: d,
      monthOffset: -1,
      date: new Date(year, month - 1, d),
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      monthOffset: 0,
      date: new Date(year, month, d),
    });
  }

  // Next month leading days (fill up to exactly 42 cells, i.e. 6 full rows of 7 days)
  let nextMonthDay = 1;
  while (cells.length < 42) {
    cells.push({
      day: nextMonthDay,
      monthOffset: 1,
      date: new Date(year, month + 1, nextMonthDay),
    });
    nextMonthDay++;
  }

  const monthCount = items.filter((i) => i.date.getFullYear() === year && i.date.getMonth() === month).length;

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selectedItems = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <div style={{ padding: '40px clamp(20px, 4vw, 40px)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', background: T.bg, fontFamily: AT.font }}>
      <style>{`
        .cal-nav-btn {
          all: unset;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: ${AT.rChip}px;
          background: ${tileBg()};
          color: ${T.text};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cal-nav-btn:hover { filter: brightness(1.08); }
        .cal-nav-btn:active { transform: scale(0.95); }
        .cal-select {
          background: ${tileBg()};
          border: none;
          color: ${T.text};
          border-radius: ${AT.rChip}px;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: -0.01em;
          padding: 6px 10px;
          cursor: pointer;
          outline: none;
          transition: all 0.18s ease;
          font-family: inherit;
        }
        .cal-select:hover { filter: brightness(1.08); }
        .cal-cell {
          background: transparent;
          border: 1px solid ${hairline()};
          border-radius: ${AT.rChip}px;
          padding: 7px 9px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 0;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cal-cell:hover {
          background: ${tileBg()};
          transform: translateY(-1px);
        }
        .cal-cell-active {
          border-color: ${T.primary} !important;
          box-shadow: 0 0 0 1px ${T.primary}55;
        }
        .cal-close-btn {
          all: unset;
          cursor: pointer;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: ${T.muted};
          font-size: 18px;
          transition: all 0.15s ease;
        }
        .cal-close-btn:hover {
          background: ${tileBg()};
          color: ${T.text};
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: AT.h1, fontWeight: AT.semibold, color: T.text, letterSpacing: AT.trackHead }}>Calendar</h1>
        <span style={{ flex: 1 }} />
        
        {/* Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Previous Year */}
          <button onClick={() => setCursor(new Date(year - 1, month, 1))} className="cal-nav-btn" title="Previous Year">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
          {/* Previous Month */}
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="cal-nav-btn" title="Previous Month">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          
          {/* Direct Dropdown Pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 4px' }}>
            <select
              value={month}
              onChange={(e) => setCursor(new Date(year, parseInt(e.target.value, 10), 1))}
              className="cal-select"
              aria-label="Select Month"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx} style={{ background: T.card, color: T.text }}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setCursor(new Date(parseInt(e.target.value, 10), month, 1))}
              className="cal-select"
              aria-label="Select Year"
            >
              {Array.from({ length: 8 }, (_, idx) => now.getFullYear() - 4 + idx).map((y) => (
                <option key={y} value={y} style={{ background: T.card, color: T.text }}>{y}</option>
              ))}
            </select>
          </div>

          {/* Next Month */}
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="cal-nav-btn" title="Next Month">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          {/* Next Year */}
          <button onClick={() => setCursor(new Date(year + 1, month, 1))} className="cal-nav-btn" title="Next Year">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          </button>
        </div>

        <button onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}
          className="cal-nav-btn" style={{ width: 'auto', padding: '0 12px', fontSize: 12, fontWeight: 600, marginLeft: 8 }}>Today</button>
      </div>

      {/* Course Filter Capsules */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {grades.courses.map((c) => {
          const isActive = filteredCourses.has(c.name);
          const color = courseColor(c.name, true);
          const abbr = courseAbbr(c.name);
          return (
            <button
              key={c.name}
              onClick={() => {
                setFilteredCourses((prev) => {
                  const next = new Set(prev);
                  if (next.has(c.name)) {
                    if (next.size > 1) next.delete(c.name);
                  } else {
                    next.add(c.name);
                  }
                  return next;
                });
              }}
              className="bs-press"
              style={{
                all: 'unset',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 14px',
                borderRadius: AT.rPill,
                fontSize: AT.caption,
                fontWeight: AT.medium,
                cursor: 'pointer',
                background: isActive ? `${color}1f` : tileBg(),
                color: isActive ? color : T.muted,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? color : T.muted, opacity: isActive ? 1 : 0.5 }} />
              {abbr}
            </button>
          );
        })}
      </div>

      {/* Day-of-week header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 6,
        marginBottom: 8,
        padding: '6px 0',
        borderBottom: `1px solid ${hairline()}`,
      }}>
        {DOW.map((d) => (
          <div key={d} style={{ fontSize: AT.caption, fontWeight: AT.medium, color: T.muted, letterSpacing: AT.trackBody, textAlign: 'center' }}>{d}</div>
        ))}
      </div>

      {/* Month grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: 6, minHeight: 0 }}>
        {cells.map((cell, i) => {
          const isToday = cell.date.getFullYear() === now.getFullYear() &&
                          cell.date.getMonth() === now.getMonth() &&
                          cell.date.getDate() === now.getDate();
          const cellKey = dayKey(cell.date);
          const dayItems = byDay.get(cellKey) ?? [];
          const isSelected = selectedDay === cellKey;
          const isCurrentMonth = cell.monthOffset === 0;

          return (
            <div
              key={i}
              className={`cal-cell ${isSelected ? 'cal-cell-active' : ''}`}
              onClick={() => {
                if (cell.monthOffset !== 0) {
                  setCursor(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                  setSelectedDay(cellKey);
                } else {
                  setSelectedDay(isSelected ? null : cellKey);
                }
              }}
              style={{
                background: isToday ? T.today : undefined,
                border: isToday ? `1px solid ${T.primary}80` : undefined,
                opacity: isCurrentMonth ? 1 : 0.42,
              }}
            >
              <div style={{
                fontSize: 11,
                fontWeight: isToday ? 800 : 500,
                color: isToday ? T.primary : isCurrentMonth ? T.text : T.muted,
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>{cell.day}</span>
                {isToday && (
                  <span style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: T.primary,
                    boxShadow: `0 0 4px ${T.primary}`,
                  }} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden', flex: 1 }}>
                {dayItems.slice(0, 3).map((it, j) => {
                  const overdue = isOverdue(it, now);
                  const itemColor = overdue ? missingRed : it.color;
                  return (
                    <div
                      key={j}
                      title={`${it.name} · ${it.courseName}${overdue ? ' · overdue' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 5px',
                        borderRadius: 4,
                        background: `${itemColor}15`,
                        border: `1px solid ${itemColor}30`,
                        color: overdue ? missingRed : T.text,
                        fontSize: 9,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: itemColor, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                    </div>
                  );
                })}
                {dayItems.length > 3 && (
                  <div style={{ fontSize: 9, color: T.faint, fontWeight: 600, paddingLeft: 4 }}>
                    +{dayItems.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected-day detail */}
      {selectedDay && selectedItems.length > 0 && (
        <div style={{
          ...appleCardStyle(true),
          marginTop: 14,
          borderRadius: AT.rTile,
          padding: '16px 18px',
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: AT.h3, fontWeight: AT.semibold, color: T.text, letterSpacing: AT.trackHead }}>
              {(() => { const [y, m, d] = selectedDay.split('-').map(Number); return `${MONTHS[m]} ${d}, ${y}`; })()}
            </span>
            <span style={{ fontSize: AT.caption, color: T.muted, marginLeft: 10 }}>{selectedItems.length} due</span>
            <span style={{ flex: 1 }} />
            <button onClick={() => setSelectedDay(null)} className="cal-close-btn" aria-label="Close details">×</button>
          </div>
          {selectedItems.map((it, j) => (
            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: j > 0 ? `1px solid ${hairline()}` : 'none' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOverdue(it, now) ? missingRed : it.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: AT.sub, color: T.text, letterSpacing: AT.trackBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
              {isOverdue(it, now) && (
                <span style={{
                  fontSize: AT.micro,
                  fontWeight: AT.semibold,
                  color: missingRed,
                  background: `${missingRed}1f`,
                  borderRadius: AT.rPill,
                  padding: '2px 9px',
                  flexShrink: 0,
                }}>
                  Overdue
                </span>
              )}
              <span style={{ fontSize: AT.caption, color: T.muted, flexShrink: 0 }}>{it.courseName}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: AT.caption, color: T.muted, opacity: 0.8, marginTop: 12 }}>
        {monthCount > 0 ? `${monthCount} due this month` : 'Nothing due this month'} · click a day for details
      </div>
    </div>
  );
}
