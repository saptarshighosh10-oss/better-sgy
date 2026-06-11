/**
 * CurrentGradesMiniGraph.tsx — horizontal current-grade bars, one per course.
 *
 * Used by the summer/archive views ('gradeOnly' / 'graphOnly' modes): when
 * Schoology has wiped the per-assignment gradebook, this shows what survives —
 * the overall course grades. Token-driven (recolors with theme/accent).
 */

import React from 'react';
import type { ScrapedCourse } from '../lib/schemas';
import { parseGradeString, gradeColor } from '../lib/grade-utils';
import { T } from '../lib/theme';

interface Props {
  courses: ScrapedCourse[];
}

export function CurrentGradesMiniGraph({ courses }: Props) {
  const entries = courses
    .map((c) => ({ name: c.name, ...parseGradeString(c.grade) }))
    .filter((c) => c.percent !== null) as Array<{
    name: string;
    letter: string;
    percent: number;
  }>;

  if (entries.length === 0) return null;

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: '16px 18px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: T.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 14,
        }}
      >
        Current Grades
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {entries.map((entry, i) => {
          const color = gradeColor(entry.percent);
          const barWidth = `${Math.min(100, Math.max(0, entry.percent))}%`;
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {entry.name}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: T.text, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {entry.percent.toFixed(1)}%
                  {entry.letter && <span style={{ fontSize: 10.5, fontWeight: 700, color: color, marginLeft: 6 }}>{entry.letter}</span>}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: T.faint, overflow: 'hidden' }} aria-hidden="true">
                <div style={{ height: '100%', width: barWidth, background: T.primary, borderRadius: 999 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
