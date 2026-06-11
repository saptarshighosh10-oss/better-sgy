/**
 * DueSoon.tsx — "due in the next 72 hours" nudge strip (Overview).
 *
 * Pure read of already-scraped data; no network. Follows v2 language:
 * card surface + 1px border, label row, amber due pills.
 */

import React from 'react';
import type { ScrapedCourse } from '../lib/schemas';
import { parseDueDate } from '../lib/grade-utils';
import { T } from '../lib/theme';

interface DueItem {
  course: string;
  name: string;
  due: Date;
}

function collectDueSoon(courses: ScrapedCourse[], hours = 72): DueItem[] {
  const now = Date.now();
  const horizon = now + hours * 3_600_000;
  const items: DueItem[] = [];
  for (const c of courses) {
    for (const cat of c.categories) {
      for (const a of cat.assignments) {
        if (a.status === 'graded' || a.status === 'submitted') continue;
        if (a.exception) continue; // excused/incomplete — not actionable here
        const d = parseDueDate(a.dueDate);
        if (!d) continue;
        // include things due today (even if the clock already passed midnight)
        const t = d.getTime() + 23 * 3_600_000; // end of due day
        if (t >= now && d.getTime() <= horizon) items.push({ course: c.name, name: a.name, due: d });
      }
    }
  }
  items.sort((a, b) => a.due.getTime() - b.due.getTime());
  return items.slice(0, 5);
}

function dueLabel(d: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(d); that.setHours(0, 0, 0, 0);
  const diff = Math.round((that.getTime() - today.getTime()) / 86_400_000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

export function DueSoon({ courses }: { courses: ScrapedCourse[] }) {
  const items = collectDueSoon(courses);
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Due soon"
      style={{
        background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12,
        overflow: 'hidden', marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 20px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Due soon</span>
        <span style={{ fontSize: 11.5, color: T.muted }}>next 3 days · {items.length} item{items.length > 1 ? 's' : ''}</span>
      </div>
      {items.map((it, i) => (
        <div key={`${it.course}-${it.name}-${i}`} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
          borderBottom: i < items.length - 1 ? `1px solid ${T.rowBorder}` : 'none',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {it.name}
            </div>
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 3 }}>{it.course}</div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700,
            padding: '4px 10px', borderRadius: 999, color: T.amber, background: `${T.amber}21`,
            flexShrink: 0,
          }}>
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: T.amber }} />
            {dueLabel(it.due)}
          </span>
        </div>
      ))}
    </section>
  );
}
