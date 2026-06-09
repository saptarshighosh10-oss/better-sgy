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
  parseDueDate,
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

// ── Dynamic timeline calculations (replicates the Next.js app graph builder) ──

interface TimelinePoint {
  date: Date;
  origPercent: number;
  whatIfPercent: number;
  assignmentName: string;
  categoryName: string;
  assignmentKey: string;
}

function categoryAvgWithAllowed(
  cat: ScrapedCategory,
  overrides: Map<string, number> | null,
  allowedKeys: Set<string>
): { pct: number; sumScore: number; sumMax: number } | null {
  let sumScore = 0;
  let sumMax = 0;

  for (let ai = 0; ai < cat.assignments.length; ai++) {
    const a = cat.assignments[ai];
    const key = `${cat.name}::${ai}`;
    if (!allowedKeys.has(key)) continue;

    const max = parseMaxGrade(a.maxGrade);
    if (max === null || max === 0) continue;

    let score: number | null = null;
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

function computeCourseGradeWithAllowed(
  categories: ScrapedCategory[],
  overrides: Map<string, number> | null,
  allowedKeys: Set<string>
): number | null {
  const hasWeights = categories.some((c) => parseWeight(c.weight) > 0);

  if (!hasWeights) {
    let totalScore = 0;
    let totalMax = 0;
    for (const cat of categories) {
      const avg = categoryAvgWithAllowed(cat, overrides, allowedKeys);
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
    const avg = categoryAvgWithAllowed(cat, overrides, allowedKeys);
    if (!avg) continue;
    wSum += avg.pct * w;
    wTotal += w;
  }
  return wTotal > 0 ? wSum / wTotal : null;
}

function buildGradeTimeline(
  categories: ScrapedCategory[],
  overrides: Map<string, number> | null
): TimelinePoint[] {
  const graded: Array<{
    assignment: ScrapedAssignment;
    catName: string;
    overrideKey: string;
    dueDate: Date | null;
  }> = [];

  for (const cat of categories) {
    for (let ai = 0; ai < cat.assignments.length; ai++) {
      const a = cat.assignments[ai];
      const max = parseMaxGrade(a.maxGrade);
      if (max === null || max === 0) continue;

      const score = parseScore(a.score);
      const hasOverride = overrides && overrides.has(`${cat.name}::${ai}`);
      if (score === null && !hasOverride) continue;

      const due = parseDueDate(a.dueDate);
      graded.push({
        assignment: a,
        catName: cat.name,
        overrideKey: `${cat.name}::${ai}`,
        dueDate: due,
      });
    }
  }

  if (graded.length === 0) return [];

  // Dated assignments in date order; undated ones keep gradebook order at the end
  const dated = graded.filter((g) => g.dueDate !== null) as Array<{
    assignment: ScrapedAssignment;
    catName: string;
    overrideKey: string;
    dueDate: Date;
  }>;
  dated.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const undated = graded.filter((g) => g.dueDate === null);
  const lastTime = dated.length > 0 ? dated[dated.length - 1].dueDate.getTime() : Date.now();

  const ordered: Array<{
    assignment: ScrapedAssignment;
    catName: string;
    overrideKey: string;
    dueDate: Date;
  }> = [
    ...dated,
    ...undated.map((g, idx) => ({
      ...g,
      dueDate: new Date(lastTime + (idx + 1) * 86400000), // sequential fallback dates
    })),
  ];

  const points: TimelinePoint[] = [];
  const allowedKeys = new Set<string>();

  for (const item of ordered) {
    allowedKeys.add(item.overrideKey);
    const origGrade = computeCourseGradeWithAllowed(categories, null, allowedKeys);
    const whatIfGrade = computeCourseGradeWithAllowed(categories, overrides, allowedKeys);
    if (origGrade === null) continue;
    points.push({
      date: item.dueDate,
      origPercent: origGrade,
      whatIfPercent: whatIfGrade !== null ? whatIfGrade : origGrade,
      assignmentName: item.assignment.name,
      categoryName: item.catName,
      assignmentKey: item.overrideKey,
    });
  }

  return points;
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

  const timelinePoints = useMemo(() => {
    return buildGradeTimeline(course.categories, whatIfOn ? overrides : null);
  }, [course.categories, whatIfOn, overrides]);

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
      <GradeChart
        points={timelinePoints}
        color={displayColor}
        hasOverrides={whatIfOn && overrides.size > 0}
      />

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

const buttonStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  height: 24,
  width: 24,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  border: `1px solid ${T.border}`,
  background: T.inputBg,
  color: T.muted,
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.3 : 1,
  outline: 'none',
  padding: 0,
  transition: 'background 0.2s, color 0.2s',
});

interface GradeChartProps {
  points: TimelinePoint[];
  color: string;
  hasOverrides: boolean;
}

function GradeChart({ points, color, hasOverrides }: GradeChartProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '40px 20px',
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 11,
          marginBottom: 12,
        }}
      >
        <svg viewBox="0 0 44 26" width="44" height="26" fill="none" aria-hidden="true">
          <polyline
            points="2,22 11,14 20,17 29,8 38,11"
            stroke={T.border}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {([2, 11, 20, 29, 38] as number[]).map((ptx, idx) => (
            <circle
              key={ptx}
              cx={ptx}
              cy={([22, 14, 17, 8, 11])[idx]}
              r="2"
              fill={T.border}
            />
          ))}
        </svg>
        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
          No graded assignments yet.
        </p>
      </div>
    );
  }

  const windowSize = Math.max(4, Math.ceil(points.length / zoom));
  const maxOffset = Math.max(0, points.length - windowSize);
  const safeOffset = Math.min(offset, maxOffset);
  const visible = points.slice(safeOffset, safeOffset + windowSize);

  const VH = 180;
  const PAD = { top: 20, right: 16, bottom: 28, left: 44 };
  const PH = VH - PAD.top - PAD.bottom;
  const pxPerPt = Math.max(48, 800 / Math.max(visible.length - 1, 1));
  const VW = PAD.left + PAD.right + pxPerPt * Math.max(visible.length - 1, 1);

  const allPercents = visible.flatMap((p) => [p.origPercent, p.whatIfPercent]);
  const rawMin = Math.min(...allPercents);
  const rawMax = Math.max(...allPercents);
  const yMin = Math.max(0, Math.floor((rawMin - 8) / 5) * 5);
  const yMax = Math.min(102, Math.ceil((rawMax + 5) / 5) * 5);
  const yRange = yMax - yMin || 1;

  const cx = (i: number) => PAD.left + i * pxPerPt;
  const cy = (v: number) => PAD.top + (1 - (v - yMin) / yRange) * PH;

  const gridY: number[] = [];
  for (let y = Math.ceil(yMin / 5) * 5; y <= yMax; y += 5) {
    gridY.push(y);
  }

  function buildPath(pts: Array<{ x: number; y: number | null }>) {
    let d = '';
    let penDown = false;
    for (const pt of pts) {
      if (pt.y === null) {
        penDown = false;
        continue;
      }
      const coord = `${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      d += penDown ? ` L${coord}` : `M${coord}`;
      penDown = true;
    }
    return d;
  }

  const origPath = buildPath(visible.map((p, i) => ({ x: cx(i), y: cy(p.origPercent) })));
  const whatIfPath = hasOverrides
    ? buildPath(visible.map((p, i) => ({ x: cx(i), y: cy(p.whatIfPercent) })))
    : null;

  function zoomIn() {
    setZoom((z) => Math.min(z * 2, 8));
    setOffset(safeOffset);
  }
  function zoomOut() {
    setZoom((z) => Math.max(z / 2, 1));
    setOffset(0);
  }
  function pan(dir: -1 | 1) {
    setOffset((o) =>
      Math.min(maxOffset, Math.max(0, o + dir * Math.max(1, Math.floor(windowSize / 4))))
    );
  }

  const firstDate = visible[0].date;
  const lastDate = visible[visible.length - 1].date;
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || visible.length < 2) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * VW;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < visible.length; i++) {
      const dist = Math.abs(cx(i) - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    setHoverIdx(closest);
  }

  const hoverPoint = hoverIdx !== null ? visible[hoverIdx] : null;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Grade History
          </span>
          <span style={{ fontSize: 10, color: T.muted, opacity: 0.6 }}>
            {zoom > 1 ? `Showing ${visible.length} of ${points.length}` : `${points.length} assignments`}
          </span>
          {hasOverrides && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 9999,
                border: '1px solid rgba(59, 130, 246, 0.25)',
                background: 'rgba(59, 130, 246, 0.08)',
                padding: '1px 8px',
                fontSize: 10,
                fontWeight: 500,
                color: T.primary,
              }}
            >
              <svg viewBox="0 0 8 8" width="6" height="6" aria-hidden="true" style={{ display: 'block' }}>
                <line x1="0" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1.5"/>
              </svg>
              what-if active
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {zoom > 1 && (
            <>
              <button
                type="button"
                onClick={() => pan(-1)}
                disabled={safeOffset === 0}
                style={buttonStyle(safeOffset === 0)}
                title="Pan left"
              >
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => pan(1)}
                disabled={safeOffset >= maxOffset}
                style={buttonStyle(safeOffset >= maxOffset)}
                title="Pan right"
              >
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= 8}
            style={buttonStyle(zoom >= 8)}
            title="Zoom in"
          >
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= 1}
            style={buttonStyle(zoom <= 1)}
            title="Zoom out"
          >
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, background: '#0d1019' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          width={VW}
          height={VH}
          style={{ minWidth: VW, display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Grid lines */}
          {gridY.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                y1={cy(v)}
                x2={VW - PAD.right}
                y2={cy(v)}
                stroke={T.border}
                strokeWidth={0.5}
                strokeDasharray={v % 10 === 0 ? undefined : '3 4'}
                opacity={v % 10 === 0 ? 0.3 : 0.15}
              />
              <text
                x={PAD.left - 6}
                y={cy(v) + 3.5}
                fill={T.muted}
                fontSize={8.5}
                textAnchor="end"
                fontFamily="inherit"
                opacity={0.65}
              >
                {v}%
              </text>
            </g>
          ))}

          {/* Gradient area */}
          <defs>
            <linearGradient id="gradeAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {visible.length >= 2 && !hasOverrides && (
            <polygon
              points={
                `${cx(0).toFixed(1)},${(PAD.top + PH).toFixed(1)} ` +
                visible.map((p, i) => `${cx(i).toFixed(1)},${cy(p.origPercent).toFixed(1)}`).join(' ') +
                ` ${cx(visible.length - 1).toFixed(1)},${(PAD.top + PH).toFixed(1)}`
              }
              fill="url(#gradeAreaGrad)"
            />
          )}

          {/* Original line */}
          {visible.length >= 2 && (
            <path
              d={origPath}
              fill="none"
              stroke={hasOverrides ? '#ffffff' : color}
              strokeWidth={hasOverrides ? 1.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={hasOverrides ? 0.35 : 1}
              strokeDasharray={hasOverrides ? '4 3' : undefined}
            />
          )}

          {/* What-if line */}
          {hasOverrides && whatIfPath && visible.length >= 2 && (
            <path
              d={whatIfPath}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          )}

          {/* Dots */}
          {visible.map((p, i) => {
            const x = cx(i);
            const origY = cy(p.origPercent);
            const whatIfY = cy(p.whatIfPercent);
            const isTip = hoverIdx === i;

            return (
              <g key={i}>
                <rect
                  x={x - 14}
                  y={PAD.top - 4}
                  width={28}
                  height={PH + 8}
                  fill="rgba(0,0,0,0)"
                  style={{ cursor: 'pointer' }}
                />

                <circle
                  cx={x}
                  cy={origY}
                  r={hasOverrides ? 2 : isTip ? 5 : 3.5}
                  fill={isTip && !hasOverrides ? '#ffffff' : color}
                  stroke={isTip && !hasOverrides ? color : 'none'}
                  strokeWidth={isTip ? 2 : 0}
                  opacity={hasOverrides ? 0.3 : 1}
                />

                {hasOverrides && (
                  <circle
                    cx={x}
                    cy={whatIfY}
                    r={isTip ? 5 : 3.5}
                    fill={isTip ? '#ffffff' : color}
                    stroke={isTip ? color : 'none'}
                    strokeWidth={isTip ? 2 : 0}
                  />
                )}

                {(visible.length <= 8 || i % Math.ceil(visible.length / 8) === 0) && (
                  <text
                    x={x}
                    y={PAD.top + PH + 14}
                    textAnchor="middle"
                    fontSize={7.5}
                    fill={T.muted}
                    opacity={0.65}
                  >
                    {p.date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                  </text>
                )}
              </g>
            );
          })}

          {/* Tooltip */}
          {hoverPoint && hoverIdx !== null && (() => {
            const x = cx(hoverIdx);
            const origY = cy(hoverPoint.origPercent);
            const whatIfY = cy(hoverPoint.whatIfPercent);
            const activeY = hasOverrides ? whatIfY : origY;
            
            const tipW = 144;
            const tipH = hasOverrides ? 66 : 44;
            
            const tipX = Math.min(Math.max(x, PAD.left + tipW / 2), VW - PAD.right - tipW / 2);
            const tipY = Math.max(PAD.top, activeY - tipH - 8);

            const gradeDiff = hoverPoint.whatIfPercent - hoverPoint.origPercent;

            return (
              <g style={{ pointerEvents: 'none' }}>
                <line
                  x1={x}
                  y1={PAD.top}
                  x2={x}
                  y2={PAD.top + PH}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.4}
                />

                <rect
                  x={tipX - tipW / 2}
                  y={tipY}
                  width={tipW}
                  height={tipH}
                  rx={5}
                  fill="#0d1019"
                  stroke={T.border}
                  strokeWidth={1}
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}
                />

                {hasOverrides ? (
                  <>
                    <text x={tipX} y={tipY + 13} textAnchor="middle" fontSize={9.5} fontWeight="700" fill={T.text}>
                      {hoverPoint.whatIfPercent.toFixed(2)}%
                    </text>
                    <text x={tipX} y={tipY + 24} textAnchor="middle" fontSize={7.5} fill={T.muted}>
                      was {hoverPoint.origPercent.toFixed(2)}% before
                    </text>
                    <text x={tipX} y={tipY + 36} textAnchor="middle" fontSize={8} fill={T.text}>
                      {hoverPoint.assignmentName.length > 22 ? hoverPoint.assignmentName.slice(0, 22) + '…' : hoverPoint.assignmentName}
                    </text>
                    <text x={tipX} y={tipY + 47} textAnchor="middle" fontSize={7.5} fill={color}>
                      {hoverPoint.categoryName}
                    </text>
                    <text x={tipX} y={tipY + 58} textAnchor="middle" fontSize={7.5} fill={gradeDiff >= 0 ? T.green : T.red} fontWeight="600">
                      {gradeDiff >= 0 ? '+' : ''}{gradeDiff.toFixed(2)}% delta
                    </text>
                  </>
                ) : (
                  <>
                    <text x={tipX} y={tipY + 13} textAnchor="middle" fontSize={9.5} fontWeight="700" fill={T.text}>
                      {hoverPoint.origPercent.toFixed(2)}%
                    </text>
                    <text x={tipX} y={tipY + 26} textAnchor="middle" fontSize={8} fill={T.text}>
                      {hoverPoint.assignmentName.length > 22 ? hoverPoint.assignmentName.slice(0, 22) + '…' : hoverPoint.assignmentName}
                    </text>
                    <text x={tipX} y={tipY + 37} textAnchor="middle" fontSize={7.5} fill={color}>
                      {hoverPoint.categoryName}
                    </text>
                  </>
                )}
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
