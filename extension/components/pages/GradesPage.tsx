import React, { useState, useEffect } from 'react';
import type { ScrapedCourse } from '../../lib/schemas';
import { parseGradeString, gradeColor, isMissing } from '../../lib/grade-utils';
import { courseColor, courseAbbr, abbrFontSize } from '../../lib/course-colors';
import { CourseGradebook } from '../CourseGradebook';
import { loadGradeHistory, computeSemesterTrend } from '../../lib/grade-history';
import type { GradePoint } from '../../lib/grade-history';

const T = {
  text: '#e8eaf0',
  muted: '#7a8ea3',
  faint: '#2a3a52',
  card: '#111827',
  border: '#1e2535',
  activeBg: '#1a2540',
  activeBorder: '#3b82f6',
  primary: '#3b82f6',
  failed: '#ef4444',
} as const;

interface GradesState {
  courses: ScrapedCourse[];
}

interface Props {
  grades: GradesState;
  selectedCourseName: string | null;
  onCourseSelect: (name: string) => void;
}

export function GradesPage({ grades, selectedCourseName, onCourseSelect }: Props) {
  const { courses } = grades;
  const [history, setHistory] = useState<Record<string, GradePoint[]>>({});

  useEffect(() => {
    loadGradeHistory().then(setHistory).catch(() => {});
  }, []);

  const effectiveCourse =
    courses.find((c) => c.name === selectedCourseName) ?? courses[0] ?? null;

  return (
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      {/* ── Course list panel ──────────────────────────────────────────── */}
      <div
        style={{
          width: 236,
          flexShrink: 0,
          borderRight: `1px solid ${T.border}`,
          overflowY: 'auto',
          padding: '12px 8px',
          background: '#0d1019',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.faint,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '0 6px 8px',
          }}
        >
          Courses
        </div>
        {courses.map((course) => (
          <CourseListRow
            key={course.name}
            course={course}
            isSelected={course.name === effectiveCourse?.name}
            onClick={() => onCourseSelect(course.name)}
            sparklinePoints={computeSemesterTrend(course)}
          />
        ))}
      </div>

      {/* ── Gradebook panel ────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          minWidth: 0,
        }}
      >
        {effectiveCourse ? (
          <CourseGradebook
            course={effectiveCourse}
            historyPoints={computeSemesterTrend(effectiveCourse)}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 200,
              color: T.muted,
              fontSize: 13,
            }}
          >
            Select a course to view its gradebook.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Course list row ───────────────────────────────────────────────────────────

function CourseListRow({
  course,
  isSelected,
  onClick,
  sparklinePoints,
}: {
  course: ScrapedCourse;
  isSelected: boolean;
  onClick: () => void;
  sparklinePoints: GradePoint[];
}) {
  const color = courseColor(course.name);
  const abbr = courseAbbr(course.name);
  const fontSize = abbrFontSize(abbr);
  const { percent, letter } = parseGradeString(course.grade);
  const gradeClr = gradeColor(percent);

  const allAssignments = course.categories.flatMap((c) => c.assignments);
  const missingCount = allAssignments.filter(isMissing).length;

  return (
    <button
      onClick={onClick}
      style={{
        all: 'unset',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 8px',
        borderRadius: 8,
        cursor: 'pointer',
        background: isSelected ? T.activeBg : 'transparent',
        border: `1px solid ${isSelected ? T.activeBorder + '60' : 'transparent'}`,
        boxSizing: 'border-box',
        marginBottom: 2,
      }}
    >
      {/* Color band mini badge */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: color,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            fontSize: Math.round(fontSize * 0.45),
            fontWeight: 900,
            color: 'rgba(255,255,255,0.25)',
            userSelect: 'none',
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          {abbr}
        </span>
      </div>

      {/* Name + sparkline */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: isSelected ? 600 : 400,
            color: isSelected ? T.text : '#a0aec0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}
        >
          {course.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Sparkline points={sparklinePoints} color={gradeClr} />
        </div>
      </div>

      {/* Grade */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: gradeClr, lineHeight: 1 }}>
          {percent !== null ? `${percent.toFixed(1)}%` : '—'}
        </div>
        {letter && (
          <div style={{ fontSize: 10, color: gradeClr, lineHeight: 1.2 }}>{letter}</div>
        )}
      </div>
    </button>
  );
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────

const SPARK_W = 80;
const SPARK_H = 24;

function Sparkline({ points, color }: { points: GradePoint[]; color: string }) {
  if (points.length === 0) return null;

  // Single point → dot
  if (points.length === 1) {
    return (
      <svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} style={{ flexShrink: 0 }}>
        <circle cx={SPARK_W / 2} cy={SPARK_H / 2} r={2.5} fill={color} />
      </svg>
    );
  }

  // Multiple points → polyline
  const sorted = [...points].sort((a, b) => a.ts - b.ts);
  const percents = sorted.map((p) => p.percent);
  const minP = Math.min(...percents);
  const maxP = Math.max(...percents);
  const range = maxP - minP || 1; // avoid divide by zero

  const padY = 3;
  const innerH = SPARK_H - padY * 2;
  const step = (SPARK_W - 4) / (sorted.length - 1);

  const pts = sorted.map((p, i) => {
    const x = 2 + i * step;
    const y = padY + innerH - ((p.percent - minP) / range) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} style={{ flexShrink: 0 }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {(() => {
        const lastPt = sorted[sorted.length - 1];
        const x = 2 + (sorted.length - 1) * step;
        const y = padY + innerH - ((lastPt.percent - minP) / range) * innerH;
        return <circle cx={x} cy={y} r={2} fill={color} />;
      })()}
    </svg>
  );
}
