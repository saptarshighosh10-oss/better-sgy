/**
 * CourseGradebook.tsx — Phase 2
 *
 * Single flat table with category header rows spanning all columns.
 * This guarantees Score / % / Due columns align across every category.
 */

import React from 'react';
import type { ScrapedCourse, ScrapedAssignment } from '../lib/schemas';
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

const TH: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 10,
  fontWeight: 700,
  color: '#4a5568',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  borderBottom: '1px solid #1e2535',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  course: ScrapedCourse;
}

export function CourseGradebook({ course }: Props) {
  const { letter, percent } = parseGradeString(course.grade);
  const color = gradeColor(percent);

  const filledCategories = course.categories.filter((c) => c.assignments.length > 0);
  const allAssignments = course.categories.flatMap((c) => c.assignments);
  const gradedCount   = allAssignments.filter((a) => a.status === 'graded').length;
  const totalCount    = allAssignments.length;
  const missingCount  = allAssignments.filter((a) => a.status === 'unsubmitted').length;

  return (
    <div>
      {/* ── Course header ──────────────────────────────────────────── */}
      <div
        style={{
          background: '#111827',
          border: '1px solid #1e2535',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>
              {course.name}
            </h2>
            <div style={{ fontSize: 12, color: '#8892a4', marginTop: 5 }}>
              {course.teacher && <span>{course.teacher} · </span>}
              <span>{gradedCount}/{totalCount} graded</span>
              {missingCount > 0 && (
                <span style={{ color: '#ef4444', marginLeft: 8 }}>· {missingCount} unsubmitted</span>
              )}
              {filledCategories.length > 0 && (
                <span> · {filledCategories.length} {filledCategories.length === 1 ? 'category' : 'categories'}</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 34, fontWeight: 800, color, lineHeight: 1 }}>
              {percent !== null ? `${percent.toFixed(2)}%` : '—'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color, marginTop: 4, letterSpacing: '0.5px' }}>
              {letter}
            </div>
          </div>
        </div>
      </div>

      {/* ── Assignment table ────────────────────────────────────────── */}
      {filledCategories.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: '#8892a4',
            background: '#111827',
            borderRadius: 12,
            border: '1px solid #1e2535',
            fontSize: 13,
          }}
        >
          No assignment data for this course.
        </div>
      ) : (
        <div
          style={{
            background: '#111827',
            border: '1px solid #1e2535',
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
              <tr style={{ background: '#0f1117' }}>
                <th style={{ ...TH, textAlign: 'left', paddingLeft: 16 }}>Assignment</th>
                <th style={{ ...TH, textAlign: 'right' }}>Score</th>
                <th style={{ ...TH, textAlign: 'right' }}>%</th>
                <th style={{ ...TH, textAlign: 'right', paddingRight: 16 }}>Due</th>
              </tr>
            </thead>

            <tbody>
              {filledCategories.flatMap((cat, ci) => {
                const catName = cat.name.replace(/\s*Category\s*$/i, '').trim() || cat.name;
                return [
                  /* Category section header */
                  <tr key={`cat-${ci}`} style={{ background: '#0d111c' }}>
                    <td
                      colSpan={4}
                      style={{
                        padding: '7px 16px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#c8d0df',
                        borderTop: ci > 0 ? '2px solid #1e2535' : undefined,
                        borderBottom: '1px solid #1a2035',
                      }}
                    >
                      {catName}
                      {cat.weight && (
                        <span style={{ fontWeight: 400, color: '#8892a4', marginLeft: 8 }}>
                          {cat.weight}
                        </span>
                      )}
                    </td>
                  </tr>,
                  /* Assignment rows */
                  ...cat.assignments.map((a, ai) => (
                    <AssignmentRow
                      key={`a-${ci}-${ai}`}
                      assignment={a}
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
  isLast,
}: {
  assignment: ScrapedAssignment;
  isLast: boolean;
}) {
  const pct    = scorePercent(assignment.score, assignment.maxGrade);
  const color  = pct !== null ? gradeColor(pct) : assignment.status === 'unsubmitted' ? '#ef4444' : '#8892a4';

  const scoreNum = parseScore(assignment.score);
  const maxNum   = parseMaxGrade(assignment.maxGrade);

  const scoreDisplay = scoreNum !== null
    ? scoreNum.toFixed(scoreNum % 1 === 0 ? 0 : 2).replace(/\.?0+$/, '')
    : assignment.status === 'submitted' ? '—' : '—';

  const maxDisplay = maxNum !== null
    ? `/${maxNum.toFixed(maxNum % 1 === 0 ? 0 : 2).replace(/\.?0+$/, '')}`
    : '';

  const statusBadge =
    assignment.status === 'submitted' ? (
      <span style={{ fontSize: 9, background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f630', borderRadius: 3, padding: '1px 5px', marginLeft: 6 }}>
        submitted
      </span>
    ) : assignment.status === 'unsubmitted' && !assignment.score ? (
      <span style={{ fontSize: 9, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 3, padding: '1px 5px', marginLeft: 6 }}>
        missing
      </span>
    ) : null;

  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid #151d2e' }}>
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
        {scoreDisplay}{maxDisplay}
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, color, fontWeight: 500 }}>
        {pct !== null ? `${pct.toFixed(1)}%` : '—'}
      </td>
      <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11, color: '#8892a4', whiteSpace: 'nowrap' }}>
        {formatDueDate(assignment.dueDate)}
      </td>
    </tr>
  );
}
