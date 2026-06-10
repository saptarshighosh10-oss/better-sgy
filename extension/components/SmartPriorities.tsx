import React, { useState, useMemo } from 'react';
import type { ScrapedCourse } from '../lib/schemas';
import { isMissing, parseMaxGrade, parseScore, formatDueDate } from '../lib/grade-utils';
import { T } from '../lib/theme';

interface Priority {
  id: string;
  assignmentName: string;
  courseName: string;
  categoryName: string;
  categoryWeight: number;
  pointsPossible: number;
  status: string;
  dueDate: string;
  impact: number;
  deltaAt: (pct: number) => number;
}

function buildPriorities(courses: ScrapedCourse[]): Priority[] {
  const result: Priority[] = [];

  for (const course of courses) {
    for (const cat of course.categories) {
      const weight = parseFloat(cat.weight) || 0;
      if (weight === 0) continue;

      const allPts = cat.assignments.reduce((s, a) => s + (parseMaxGrade(a.maxGrade) ?? 0), 0);
      if (allPts === 0) continue;

      const scored = cat.assignments.filter((a) => a.status === 'graded');
      const scoredPts = scored.reduce((s, a) => s + (parseMaxGrade(a.maxGrade) ?? 0), 0);
      const scoredScore = scored.reduce((s, a) => s + (parseScore(a.score) ?? 0), 0);
      const catAvg = scoredPts > 0 ? scoredScore / scoredPts : null;

      for (const a of cat.assignments) {
        if (!isMissing(a)) continue;

        const pp = parseMaxGrade(a.maxGrade) ?? 10;
        const impact = (pp / allPts) * weight;
        const wtInCat = pp / allPts;
        const deltaAt = (pct: number) => (pct / 100 - (catAvg ?? 0)) * wtInCat * weight;

        result.push({
          id: `${course.name}|${cat.name}|${a.name}`,
          assignmentName: a.name,
          courseName: course.name,
          categoryName: cat.name,
          categoryWeight: weight,
          pointsPossible: pp,
          status: 'missing',
          dueDate: a.dueDate,
          impact,
          deltaAt,
        });
      }
    }
  }

  return result.sort((a, b) => b.impact - a.impact);
}

const SCORES = [70, 80, 90, 100] as const;
type ScoreOpt = typeof SCORES[number];

export function SmartPriorities({ courses }: { courses: ScrapedCourse[] }) {
  const [assumed, setAssumed] = useState<ScoreOpt>(80);

  const items = useMemo(() => buildPriorities(courses), [courses]);
  const maxImpact = items[0]?.impact ?? 1;

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 20, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: T.text }}>Smart Priorities</h2>
          <span style={{ fontSize: 10, color: T.muted, opacity: 0.8 }}>ranked by grade weight</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} role="group" aria-label="Assumed score if submitted">
          <span style={{ fontSize: 10, color: T.muted, opacity: 0.8 }}>if submitted at</span>
          <div style={{ display: 'flex' }}>
            {SCORES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setAssumed(s)}
                aria-pressed={assumed === s}
                className="bs-focusable"
                style={{
                  all: 'unset',
                  padding: '6px 8px',
                  fontSize: 10,
                  fontWeight: assumed === s ? 700 : 500,
                  cursor: 'pointer',
                  color: assumed === s ? T.text : T.muted,
                  borderBottom: `2px solid ${assumed === s ? T.primary : 'transparent'}`,
                  transition: 'color 0.1s, border-color 0.1s',
                }}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rows */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.slice(0, 8).map((item, i) => {
          const delta = item.deltaAt(assumed);
          const barW = Math.round((item.impact / maxImpact) * 100);
          const dateStr = item.dueDate ? formatDueDate(item.dueDate) : null;
          const sign = delta >= 0 ? '+' : '';

          return (
            <li key={item.id} style={{ borderBottom: i < Math.min(items.length, 8) - 1 ? `1px solid ${T.rowBorder}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                <span style={{ width: 12, flexShrink: 0, fontSize: 10, color: T.muted, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.assignmentName}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                      {sign}{delta.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ marginTop: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, fontSize: 10, color: T.muted }}>
                    <span>{item.courseName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.categoryName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.pointsPossible} pts</span>
                    {dateStr && <><span aria-hidden="true">·</span><span>due {dateStr}</span></>}
                    <span style={{ marginLeft: 2, borderRadius: 4, border: `1px solid ${T.failed}40`, background: `${T.failed}12`, padding: '1px 5px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: T.failed }}>
                      missing
                    </span>
                  </div>
                  {/* Weight bar — scaleX, not width, so it never triggers layout */}
                  <div style={{ marginTop: 6, height: 1, width: '100%', background: T.border, overflow: 'hidden' }}>
                    <div
                      className="bs-motion"
                      style={{
                        height: 1, width: '100%', background: 'rgba(255,255,255,0.25)',
                        transform: `scaleX(${barW / 100})`, transformOrigin: 'left center',
                        transition: 'transform 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div style={{ padding: '8px 16px', borderTop: `1px solid ${T.rowBorder}` }}>
        <p style={{ fontSize: 10, color: T.muted, opacity: 0.85, margin: 0 }}>
          {assumed < 90
            ? `At ${assumed}%, scores below your category avg still pull grades down — better than a zero.`
            : 'Priority order is by category weight, not due date.'}
        </p>
      </div>
    </div>
  );
}
