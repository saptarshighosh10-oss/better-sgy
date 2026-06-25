import React, { useState, useMemo } from 'react';
import type { ScrapedCourse } from '../lib/schemas';
import { isMissing, parseMaxGrade, parseScore, formatDueDate } from '../lib/grade-utils';
import { T } from '../lib/theme';
import { AT, tileBg, hairline } from '../lib/halo';
import { haloCardStyle } from './halo-ui';

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
    <div style={{ ...haloCardStyle(), overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '18px 24px', borderBottom: `1px solid ${hairline()}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: AT.h3, fontWeight: AT.semibold, letterSpacing: AT.trackHead, color: T.text }}>Smart priorities</h2>
          <span style={{ fontSize: AT.caption, color: T.muted, opacity: 0.85 }}>ranked by grade weight</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} role="group" aria-label="Assumed score if submitted">
          <span style={{ fontSize: AT.caption, color: T.muted, opacity: 0.85 }}>if submitted at</span>
          <div style={{ display: 'flex', gap: 2, background: tileBg(), borderRadius: AT.rPill, padding: 3 }}>
            {SCORES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setAssumed(s)}
                aria-pressed={assumed === s}
                className="bs-focusable bs-press"
                style={{
                  all: 'unset',
                  padding: '5px 12px',
                  fontSize: AT.caption,
                  fontWeight: AT.medium,
                  cursor: 'pointer',
                  borderRadius: AT.rPill,
                  color: assumed === s ? T.text : T.muted,
                  background: assumed === s ? T.card : 'transparent',
                  boxShadow: assumed === s ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                  transition: 'color 0.15s, background 0.15s',
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
            <li key={item.id} style={{ borderBottom: i < Math.min(items.length, 8) - 1 ? `1px solid ${hairline()}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px' }}>
                <span style={{ width: 14, flexShrink: 0, fontSize: AT.caption, color: T.muted, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text, letterSpacing: AT.trackBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.assignmentName}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: AT.sub, fontWeight: AT.semibold, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                      {sign}{delta.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, fontSize: AT.caption, color: T.muted }}>
                    <span>{item.courseName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.categoryName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.pointsPossible} pts</span>
                    {dateStr && <><span aria-hidden="true">·</span><span>due {dateStr}</span></>}
                    <span style={{ marginLeft: 4, borderRadius: AT.rPill, background: `${T.failed}1f`, padding: '2px 9px', fontSize: AT.micro, fontWeight: AT.semibold, color: T.failed }}>
                      Missing
                    </span>
                  </div>
                  {/* Weight bar — scaleX, not width, so it never triggers layout */}
                  <div style={{ marginTop: 9, height: 3, width: '100%', background: hairline(), borderRadius: AT.rPill, overflow: 'hidden' }}>
                    <div
                      className="bs-motion"
                      style={{
                        height: 3, width: '100%', background: T.primary, opacity: 0.55, borderRadius: AT.rPill,
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
      <div style={{ padding: '12px 24px', borderTop: `1px solid ${hairline()}` }}>
        <p style={{ fontSize: AT.caption, color: T.muted, opacity: 0.85, margin: 0, letterSpacing: AT.trackBody }}>
          {assumed < 90
            ? `At ${assumed}%, scores below your category avg still pull grades down — better than a zero.`
            : 'Priority order is by category weight, not due date.'}
        </p>
      </div>
    </div>
  );
}
