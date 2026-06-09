/**
 * CourseGradebook.tsx — Phase 2 + Phase 6 (what-if calculator)
 *
 * Single flat table with category header rows spanning all columns.
 * This guarantees Score / % / Due columns align across every category.
 *
 * Phase 6: added "What-if" toggle. When on, each assignment's score becomes
 * an editable input. The course grade is recomputed live using weighted
 * category averages (or total-points fallback if no weights exist).
 */

import React, { useState, useMemo, useRef } from 'react';
import type { ScrapedCourse, ScrapedCategory, ScrapedAssignment } from '../lib/schemas';
import type { GradePoint } from '../lib/grade-history';
import {
  parseGradeString,
  gradeColor,
  scorePercent,
  formatDueDate,
  parseScore,
  parseMaxGrade,
} from '../lib/grade-utils';

// ── Column widths ─────────────────────────────────────────────────────────────
const COL_SCORE = 110;
const COL_PCT   = 72;
const COL_DUE   = 90;

const T = {
  text: '#e8eaf0',
  muted: '#7a8ea3',
  faint: '#2a3a52',
  card: '#111827',
  border: '#1e2535',
  headerBg: '#0f1117',
  catBg: '#0d111c',
  rowBorder: '#151d2e',
  catBorder: '#1a2035',
  primary: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  inputBg: '#0d1019',
  inputBorder: '#2a3a52',
} as const;

const TH: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 10,
  fontWeight: 700,
  color: '#4a5568',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  borderBottom: `1px solid ${T.border}`,
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

// ── Grade calculator math (ported from components/grades/grade-calculator.tsx) ──

/** Parse weight string like "80%" → 80, "" → 0 */
function parseWeight(w: string): number {
  const n = parseFloat(w);
  return isNaN(n) ? 0 : n;
}

/**
 * Compute a category's average: Σscore / Σmax over assignments that have
 * numeric score AND numeric max. Uses overrideScores when in what-if mode.
 */
function categoryAvg(
  cat: ScrapedCategory,
  overrides: Map<string, number> | null
): { pct: number; sumScore: number; sumMax: number } | null {
  let sumScore = 0;
  let sumMax = 0;

  for (let ai = 0; ai < cat.assignments.length; ai++) {
    const a = cat.assignments[ai];
    const key = `${cat.name}::${ai}`;
    const max = parseMaxGrade(a.maxGrade);
    if (max === null || max === 0) continue;

    let score: number | null;
    if (overrides && overrides.has(key)) {
      score = overrides.get(key)!;
    } else {
      score = parseScore(a.score);
    }
    if (score === null) continue;

    sumScore += score;
    sumMax += max;
  }

  return sumMax > 0 ? { pct: (sumScore / sumMax) * 100, sumScore, sumMax } : null;
}

/**
 * Compute weighted course grade: Σ(catPct × weight) / Σweight
 * Only sums categories that have at least one scored assignment (renormalize).
 * If ALL weights are 0/empty, falls back to total-points (unweighted).
 */
function computeCourseGrade(
  categories: ScrapedCategory[],
  overrides: Map<string, number> | null
): number | null {
  const hasWeights = categories.some((c) => parseWeight(c.weight) > 0);

  if (!hasWeights) {
    // Unweighted fallback: total points across all assignments
    let totalScore = 0;
    let totalMax = 0;
    for (const cat of categories) {
      const avg = categoryAvg(cat, overrides);
      if (avg) {
        totalScore += avg.sumScore;
        totalMax += avg.sumMax;
      }
    }
    return totalMax > 0 ? (totalScore / totalMax) * 100 : null;
  }

  let wSum = 0;
  let wTotal = 0;
  for (const cat of categories) {
    const w = parseWeight(cat.weight);
    if (w === 0) continue;
    const avg = categoryAvg(cat, overrides);
    if (!avg) continue;
    wSum += avg.pct * w;
    wTotal += w;
  }
  return wTotal > 0 ? wSum / wTotal : null;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  course: ScrapedCourse;
  historyPoints?: GradePoint[];
}

export function CourseGradebook({ course, historyPoints = [] }: Props) {
  const { letter, percent } = parseGradeString(course.grade);
  const color = gradeColor(percent);

  const filledCategories = course.categories.filter((c) => c.assignments.length > 0);
  const allAssignments = course.categories.flatMap((c) => c.assignments);
  const gradedCount   = allAssignments.filter((a) => a.status === 'graded').length;
  const totalCount    = allAssignments.length;
  const missingCount  = allAssignments.filter((a) => a.status === 'unsubmitted').length;

  // ── What-if state ──────────────────────────────────────────────────────────
  const [whatIfOn, setWhatIfOn] = useState(false);
  // Map<"catName::assignmentIndex", number> for overridden scores
  const [overrides, setOverrides] = useState<Map<string, number>>(new Map());

  const hasOverrides = overrides.size > 0;

  const projectedGrade = useMemo(
    () => computeCourseGrade(course.categories, whatIfOn ? overrides : null),
    [course.categories, whatIfOn, overrides]
  );

  const delta = projectedGrade !== null && percent !== null
    ? projectedGrade - percent
    : null;

  function setOverride(key: string, value: number | null) {
    setOverrides((prev) => {
      const next = new Map(prev);
      if (value === null) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
  }

  function resetAll() {
    setOverrides(new Map());
  }

  // The displayed grade — real or projected
  const displayPercent = whatIfOn && projectedGrade !== null ? projectedGrade : percent;
  const displayColor = gradeColor(displayPercent);

  return (
    <div>
      {/* ── Course header ──────────────────────────────────────────── */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
              {course.name}
            </h2>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>
              {course.teacher && <span>{course.teacher} · </span>}
              <span>{gradedCount}/{totalCount} graded</span>
              {missingCount > 0 && (
                <span style={{ color: T.red, marginLeft: 8 }}>· {missingCount} unsubmitted</span>
              )}
              {filledCategories.length > 0 && (
                <span> · {filledCategories.length} {filledCategories.length === 1 ? 'category' : 'categories'}</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: displayColor, lineHeight: 1 }}>
              {displayPercent !== null ? `${displayPercent.toFixed(2)}%` : '—'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: displayColor, letterSpacing: '0.5px' }}>
                {letter}
              </div>
              {whatIfOn && hasOverrides && delta !== null && Math.abs(delta) >= 0.01 && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: delta > 0 ? T.green : T.red,
                    background: delta > 0 ? '#22c55e18' : '#ef444418',
                    borderRadius: 5,
                    padding: '1px 7px',
                  }}
                >
                  {delta > 0 ? '+' : ''}{delta.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── What-if toggle bar ─────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 12,
            paddingTop: 10,
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <button
            onClick={() => { setWhatIfOn(!whatIfOn); if (whatIfOn) resetAll(); }}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12,
              fontWeight: 600,
              color: whatIfOn ? T.primary : T.muted,
            }}
          >
            <span
              style={{
                width: 34,
                height: 18,
                borderRadius: 9,
                background: whatIfOn ? T.primary : T.faint,
                position: 'relative',
                display: 'inline-block',
                transition: 'background 0.2s',
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 2,
                  left: whatIfOn ? 18 : 2,
                  transition: 'left 0.2s',
                }}
              />
            </span>
            What-if
          </button>
          {whatIfOn && hasOverrides && (
            <button
              onClick={resetAll}
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 11,
                color: T.muted,
                background: T.faint + '40',
                borderRadius: 5,
                padding: '2px 10px',
              }}
            >
              Reset
            </button>
          )}
          {whatIfOn && (
            <span style={{ fontSize: 10, color: T.faint, marginLeft: 'auto' }}>
              Edit scores to see projected grade
            </span>
          )}
        </div>
      </div>

      {/* ── Grade history chart ─────────────────────────────────────── */}
      {historyPoints.length > 0 && (
        <GradeChart points={historyPoints} color={displayColor} />
      )}

      {/* ── Assignment table ────────────────────────────────────────── */}
      {filledCategories.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: T.muted,
            background: T.card,
            borderRadius: 12,
            border: `1px solid ${T.border}`,
            fontSize: 13,
          }}
        >
          No assignment data for this course.
        </div>
      ) : (
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 11,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col />                                          {/* Assignment — auto */}
              <col style={{ width: COL_SCORE }} />
              <col style={{ width: COL_PCT }} />
              <col style={{ width: COL_DUE }} />
            </colgroup>

            {/* Global column headers */}
            <thead>
              <tr style={{ background: T.headerBg }}>
                <th style={{ ...TH, textAlign: 'left', paddingLeft: 16 }}>Assignment</th>
                <th style={{ ...TH, textAlign: 'right' }}>Score</th>
                <th style={{ ...TH, textAlign: 'right' }}>%</th>
                <th style={{ ...TH, textAlign: 'right', paddingRight: 16 }}>Due</th>
              </tr>
            </thead>

            <tbody>
              {filledCategories.flatMap((cat, ci) => {
                const catName = cat.name.replace(/\s*Category\s*$/i, '').trim() || cat.name;
                const catAvg = whatIfOn
                  ? categoryAvg(cat, overrides)
                  : categoryAvg(cat, null);
                const weight = parseWeight(cat.weight);

                return [
                  /* Category section header */
                  <tr key={`cat-${ci}`} style={{ background: T.catBg }}>
                    <td
                      colSpan={4}
                      style={{
                        padding: '7px 16px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#c8d0df',
                        borderTop: ci > 0 ? `2px solid ${T.border}` : undefined,
                        borderBottom: `1px solid ${T.catBorder}`,
                      }}
                    >
                      {catName}
                      {cat.weight && (
                        <span style={{ fontWeight: 400, color: T.muted, marginLeft: 8 }}>
                          {cat.weight}
                        </span>
                      )}
                      {whatIfOn && catAvg && (
                        <span style={{ fontWeight: 600, color: gradeColor(catAvg.pct), marginLeft: 12, fontSize: 10 }}>
                          {catAvg.pct.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>,
                  /* Assignment rows */
                  ...cat.assignments.map((a, ai) => (
                    <AssignmentRow
                      key={`a-${ci}-${ai}`}
                      assignment={a}
                      overrideKey={`${cat.name}::${ai}`}
                      whatIfOn={whatIfOn}
                      overrideValue={overrides.get(`${cat.name}::${ai}`) ?? null}
                      onOverride={setOverride}
                      isLast={ai === cat.assignments.length - 1 && ci === filledCategories.length - 1}
                    />
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Assignment row ────────────────────────────────────────────────────────────

function AssignmentRow({
  assignment,
  overrideKey,
  whatIfOn,
  overrideValue,
  onOverride,
  isLast,
}: {
  assignment: ScrapedAssignment;
  overrideKey: string;
  whatIfOn: boolean;
  overrideValue: number | null;
  onOverride: (key: string, value: number | null) => void;
  isLast: boolean;
}) {
  const realScore = parseScore(assignment.score);
  const maxNum = parseMaxGrade(assignment.maxGrade);
  const displayScore = overrideValue !== null ? overrideValue : realScore;

  const pct = displayScore !== null && maxNum !== null && maxNum > 0
    ? (displayScore / maxNum) * 100
    : scorePercent(assignment.score, assignment.maxGrade);

  const color  = pct !== null ? gradeColor(pct) : assignment.status === 'unsubmitted' ? T.red : T.muted;

  const maxDisplay = maxNum !== null
    ? `/${maxNum.toFixed(maxNum % 1 === 0 ? 0 : 2).replace(/\.?0+$/, '')}`
    : '';

  const statusBadge =
    assignment.status === 'submitted' ? (
      <span style={{ fontSize: 9, background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f630', borderRadius: 3, padding: '1px 5px', marginLeft: 6 }}>
        submitted
      </span>
    ) : assignment.status === 'unsubmitted' && !assignment.score ? (
      <span style={{ fontSize: 9, background: '#ef444420', color: T.red, border: '1px solid #ef444430', borderRadius: 3, padding: '1px 5px', marginLeft: 6 }}>
        missing
      </span>
    ) : null;

  const isModified = overrideValue !== null;

  return (
    <tr style={{ borderBottom: isLast ? 'none' : `1px solid ${T.rowBorder}` }}>
      <td
        style={{
          padding: '8px 16px',
          fontSize: 12,
          color: '#c8d0df',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {assignment.name}
        {statusBadge}
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, color, fontWeight: 500, whiteSpace: 'nowrap' }}>
        {whatIfOn ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
            <input
              type="number"
              step="any"
              min={0}
              value={overrideValue !== null ? overrideValue : (realScore !== null ? realScore : '')}
              placeholder="—"
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || val === '-') {
                  // If clearing, remove override (fall back to original)
                  onOverride(overrideKey, null);
                } else {
                  const n = parseFloat(val);
                  if (!isNaN(n)) onOverride(overrideKey, n);
                }
              }}
              style={{
                width: 52,
                background: isModified ? T.primary + '15' : T.inputBg,
                border: `1px solid ${isModified ? T.primary + '50' : T.inputBorder}`,
                borderRadius: 4,
                color: isModified ? T.primary : color,
                fontSize: 12,
                fontWeight: 500,
                padding: '2px 5px',
                textAlign: 'right',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <span style={{ color: T.muted, fontSize: 11 }}>{maxDisplay}</span>
          </span>
        ) : (
          <>
            {displayScore !== null
              ? displayScore.toFixed(displayScore % 1 === 0 ? 0 : 2).replace(/\.?0+$/, '')
              : '—'}
            {maxDisplay}
          </>
        )}
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, color, fontWeight: 500 }}>
        {pct !== null ? `${pct.toFixed(1)}%` : '—'}
      </td>
      <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }}>
        {formatDueDate(assignment.dueDate)}
      </td>
    </tr>
  );
}

// ── Grade history chart ───────────────────────────────────────────────────────

const CHART_W = 600;
const CHART_H = 160;
const PAD = { top: 20, right: 16, bottom: 28, left: 44 };

function GradeChart({ points, color }: { points: GradePoint[]; color: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...points].sort((a, b) => a.ts - b.ts),
    [points]
  );

  if (sorted.length === 0) return null;

  const percents = sorted.map((p) => p.percent);
  const rawMin = Math.min(...percents);
  const rawMax = Math.max(...percents);
  // Give some vertical breathing room
  const minP = Math.max(0, Math.floor(rawMin - 2));
  const maxP = Math.min(100, Math.ceil(rawMax + 2));
  const range = maxP - minP || 1;

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;

  function xPos(i: number): number {
    if (sorted.length === 1) return PAD.left + innerW / 2;
    return PAD.left + (i / (sorted.length - 1)) * innerW;
  }
  function yPos(pct: number): number {
    return PAD.top + innerH - ((pct - minP) / range) * innerH;
  }

  // Build polyline points
  const polyPoints = sorted.map((p, i) => `${xPos(i).toFixed(1)},${yPos(p.percent).toFixed(1)}`).join(' ');

  // Build gradient fill area (closed polygon)
  const areaPoints =
    `${xPos(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} ` +
    polyPoints +
    ` ${xPos(sorted.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)}`;

  // Grid lines (horizontal)
  const gridLines: number[] = [];
  const step = range <= 5 ? 1 : range <= 15 ? 2 : 5;
  for (let v = Math.ceil(minP / step) * step; v <= maxP; v += step) {
    gridLines.push(v);
  }

  // Date labels
  const firstDate = new Date(sorted[0].ts);
  const lastDate = new Date(sorted[sorted.length - 1].ts);
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Hover handling
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || sorted.length < 2) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * CHART_W;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const dist = Math.abs(xPos(i) - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    setHoverIdx(closest);
  }

  const hoverPoint = hoverIdx !== null ? sorted[hoverIdx] : null;

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 11,
        padding: '12px 16px',
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Grade History
        </span>
        <span style={{ fontSize: 10, color: T.faint }}>
          {sorted.length === 1
            ? fmtDate(firstDate)
            : `${fmtDate(firstDate)} — ${fmtDate(lastDate)}`}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        width="100%"
        style={{ display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Grid lines */}
        {gridLines.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              y1={yPos(v)}
              x2={CHART_W - PAD.right}
              y2={yPos(v)}
              stroke={T.border}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={yPos(v) + 3.5}
              fill={T.faint}
              fontSize={9}
              textAnchor="end"
              fontFamily="inherit"
            >
              {v}%
            </text>
          </g>
        ))}

        {/* Gradient fill under line */}
        <defs>
          <linearGradient id="gradeAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {sorted.length >= 2 && (
          <polygon
            points={areaPoints}
            fill="url(#gradeAreaGrad)"
          />
        )}

        {/* Line */}
        {sorted.length >= 2 ? (
          <polyline
            points={polyPoints}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <circle cx={xPos(0)} cy={yPos(sorted[0].percent)} r={4} fill={color} />
        )}

        {/* Data point dots */}
        {sorted.map((p, i) => (
          <circle
            key={i}
            cx={xPos(i)}
            cy={yPos(p.percent)}
            r={hoverIdx === i ? 5 : 2.5}
            fill={hoverIdx === i ? '#fff' : color}
            stroke={hoverIdx === i ? color : 'none'}
            strokeWidth={2}
          />
        ))}

        {/* Date axis labels */}
        {sorted.length >= 2 && (
          <>
            <text
              x={PAD.left}
              y={CHART_H - 4}
              fill={T.faint}
              fontSize={9}
              textAnchor="start"
              fontFamily="inherit"
            >
              {fmtDate(firstDate)}
            </text>
            <text
              x={CHART_W - PAD.right}
              y={CHART_H - 4}
              fill={T.faint}
              fontSize={9}
              textAnchor="end"
              fontFamily="inherit"
            >
              {fmtDate(lastDate)}
            </text>
          </>
        )}

        {/* Hover tooltip */}
        {hoverPoint && hoverIdx !== null && (
          <g>
            {/* Vertical guide line */}
            <line
              x1={xPos(hoverIdx)}
              y1={PAD.top}
              x2={xPos(hoverIdx)}
              y2={PAD.top + innerH}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.4}
            />
            {/* Tooltip background */}
            <rect
              x={xPos(hoverIdx) - 42}
              y={yPos(hoverPoint.percent) - 30}
              width={84}
              height={22}
              rx={5}
              fill="#0d1019"
              stroke={T.border}
              strokeWidth={1}
            />
            {/* Tooltip text */}
            <text
              x={xPos(hoverIdx)}
              y={yPos(hoverPoint.percent) - 15}
              fill={color}
              fontSize={11}
              fontWeight={700}
              textAnchor="middle"
              fontFamily="inherit"
            >
              {hoverPoint.percent.toFixed(2)}% · {new Date(hoverPoint.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
