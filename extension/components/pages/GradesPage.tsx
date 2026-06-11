import React, { useState, useEffect } from 'react';
import type { ScrapedCourse, SchoologyData } from '../../lib/schemas';
import { parseGradeString, gradeColor, checkBorderline } from '../../lib/grade-utils';
import { courseAbbr } from '../../lib/course-colors';
import { CourseGradebook } from '../CourseGradebook';
import { GradeCalculator } from '../GradeCalculator';
import { computeSemesterTrend } from '../../lib/grade-history';
import type { GradePoint } from '../../lib/grade-history';
import { T, inkOnAccent } from '../../lib/theme';
import type { GradeSnapshot } from '../../lib/storage';
import { downloadGradesCsv } from '../../lib/export-csv';
import { GpaPlanner } from '../GpaPlanner';

function getGPAPointsForCourse(gradeStr: string): number | null {
  const { letter, percent } = parseGradeString(gradeStr);
  const cleanLetter = letter.toUpperCase().trim();

  if (cleanLetter === 'A+' || cleanLetter === 'A') return 4.0;
  if (cleanLetter === 'A-') return 3.7;
  if (cleanLetter === 'B+') return 3.3;
  if (cleanLetter === 'B') return 3.0;
  if (cleanLetter === 'B-') return 2.7;
  if (cleanLetter === 'C+') return 2.3;
  if (cleanLetter === 'C') return 2.0;
  if (cleanLetter === 'C-') return 1.7;
  if (cleanLetter === 'D+' || cleanLetter === 'D' || cleanLetter === 'D-') return 1.0;
  if (cleanLetter === 'F') return 0.0;

  if (percent !== null) {
    if (percent >= 93) return 4.0;
    if (percent >= 90) return 3.7;
    if (percent >= 87) return 3.3;
    if (percent >= 83) return 3.0;
    if (percent >= 80) return 2.7;
    if (percent >= 77) return 2.3;
    if (percent >= 73) return 2.0;
    if (percent >= 70) return 1.7;
    if (percent >= 60) return 1.0;
    return 0.0;
  }

  return null;
}

function isWeightedCourse(courseName: string, nickname?: string): boolean {
  const pattern = /\b(ap|honors?|ib|h)\b/i;
  return pattern.test(courseName) || (nickname ? pattern.test(nickname) : false);
}

interface GradesState {
  courses: ScrapedCourse[];
  data: SchoologyData | null;
}

interface Props {
  grades: GradesState;
  selectedCourseName: string | null;
  onCourseSelect: (name: string) => void;
  activeSnapshot: GradeSnapshot | null;
  setActiveSnapshot: (snap: GradeSnapshot | null) => void;
}

export function GradesPage({ grades, selectedCourseName, onCourseSelect, activeSnapshot, setActiveSnapshot }: Props) {
  const { courses } = grades;
  const [nicknames, setNicknames] = useState<Record<string, string>>({});

  useEffect(() => {
    browser.storage.local.get(['bs_course_nicknames']).then((result) => {
      if (result.bs_course_nicknames) {
        setNicknames(result.bs_course_nicknames as Record<string, string>);
      }
    }).catch(() => {});
  }, []);

  const saveNickname = (courseName: string, nickname: string) => {
    const next = { ...nicknames };
    if (nickname.trim()) {
      next[courseName] = nickname.trim();
    } else {
      delete next[courseName];
    }
    setNicknames(next);
    browser.storage.local.set({ bs_course_nicknames: next }).catch(() => {});
  };

  const effectiveCourses = activeSnapshot ? activeSnapshot.courses : courses;

  // GPA calculation
  let totalUnweightedGPA = 0;
  let totalWeightedGPA = 0;
  let gradedClassesCount = 0;

  effectiveCourses.forEach((c) => {
    const pts = getGPAPointsForCourse(c.grade);
    if (pts !== null) {
      gradedClassesCount++;
      totalUnweightedGPA += pts;

      const nick = nicknames[c.name];
      const isW = isWeightedCourse(c.name, nick);
      totalWeightedGPA += pts + (isW ? 1.0 : 0.0);
    }
  });

  const unweightedGPA = gradedClassesCount > 0 ? totalUnweightedGPA / gradedClassesCount : null;
  const weightedGPA = gradedClassesCount > 0 ? totalWeightedGPA / gradedClassesCount : null;

  const effectiveCourse =
    effectiveCourses.find((c) => c.name === selectedCourseName) ?? effectiveCourses[0] ?? null;

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
      <nav
        aria-label="Courses"
        style={{
          width: 236,
          flexShrink: 0,
          borderRight: `1px solid ${T.border}`,
          overflowY: 'auto',
          padding: '12px 8px',
          background: T.panel,
        }}
      >
        {/* GPA Dashboard — v2: two equal cells split by a hairline (gpa-dash) */}
        {gradedClassesCount > 0 && (
          <div
            role="group"
            aria-label="GPA dashboard"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1,
              background: T.border,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 14,
            }}
          >
            <div style={{ background: T.card, padding: '13px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                {unweightedGPA !== null ? unweightedGPA.toFixed(2) : '—'}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, marginTop: 2 }}>Unweighted</div>
            </div>
            <div style={{ background: T.card, padding: '13px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.primary, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                {weightedGPA !== null ? weightedGPA.toFixed(2) : '—'}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, marginTop: 2 }}>Weighted</div>
            </div>
          </div>
        )}

        {/* Target GPA planner — collapsible */}
        <GpaPlanner courses={effectiveCourses} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 8px 10px',
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Courses
          </span>
          {/* Export grades → CSV (on-device; built from the already-scraped data) */}
          <button
            type="button"
            className="bs-focusable"
            title="Export all grades as a CSV file (stays on your device)"
            onClick={() => downloadGradesCsv(effectiveCourses)}
            style={{
              all: 'unset', cursor: 'pointer', fontSize: 10.5, fontWeight: 700,
              color: T.primary, padding: '2px 4px', borderRadius: 6,
            }}
          >
            Export CSV
          </button>
        </div>
        {effectiveCourses.map((course) => (
          <CourseListRow
            key={course.name}
            course={course}
            isSelected={course.name === effectiveCourse?.name}
            onClick={() => onCourseSelect(course.name)}
            sparklinePoints={computeSemesterTrend(course)}
            nickname={nicknames[course.name]}
            onSaveNickname={saveNickname}
          />
        ))}

      </nav>

      {/* ── Gradebook panel ────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          minWidth: 0,
        }}
      >
        {activeSnapshot && (
          <div
            style={{
              background: `${T.primary}12`,
              border: `1px solid ${T.primary}40`,
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.primary }}>Snapshot Mode</span>
              <span style={{ fontSize: 12, color: T.text }}>— {activeSnapshot.name}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveSnapshot(null);
                if (courses[0]) {
                  onCourseSelect(courses[0].name);
                }
              }}
              className="bs-focusable"
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                color: T.primary,
                border: `1px solid ${T.primary}50`,
                borderRadius: 6,
                padding: '6px 12px',
                background: 'transparent',
              }}
            >
              Exit Snapshot
            </button>
          </div>
        )}

        {effectiveCourse ? (
          <>
            <CourseGradebook
              course={effectiveCourse}
              historyPoints={computeSemesterTrend(effectiveCourse)}
              nickname={nicknames[effectiveCourse.name]}
            />
            <GradeCalculator
              courseName={effectiveCourse.name}
              currentPercent={parseGradeString(effectiveCourse.grade).percent}
            />
          </>
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
  nickname,
  onSaveNickname,
}: {
  course: ScrapedCourse;
  isSelected: boolean;
  onClick: () => void;
  sparklinePoints: GradePoint[];
  nickname?: string;
  onSaveNickname: (name: string, nickname: string) => void;
}) {
  const abbr = courseAbbr(course.name);
  const { percent, letter } = parseGradeString(course.grade);
  const gradeClr = gradeColor(percent);

  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(nickname ?? '');

  useEffect(() => {
    setEditVal(nickname ?? '');
  }, [nickname]);

  const borderInfo = checkBorderline(percent);

  if (isEditing) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          padding: '9px 8px',
          borderRadius: 8,
          background: T.activeBg,
          border: `1px solid ${T.activeBorder}60`,
          boxSizing: 'border-box',
          marginBottom: 2,
        }}
      >
        <input
          type="text"
          value={editVal}
          aria-label={`Nickname for ${course.name}`}
          placeholder="Nickname"
          onChange={(e) => setEditVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSaveNickname(course.name, editVal);
              setIsEditing(false);
            } else if (e.key === 'Escape') {
              setIsEditing(false);
            }
          }}
          autoFocus
          className="bs-focusable"
          style={{
            flex: 1,
            minWidth: 0,
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            color: T.text,
            fontSize: 11,
            padding: '4px 6px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => {
            onSaveNickname(course.name, editVal);
            setIsEditing(false);
          }}
          className="bs-focusable"
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontSize: 10,
            color: T.primary,
            fontWeight: 600,
            padding: '4px 6px',
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="bs-focusable"
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontSize: 10,
            color: T.muted,
            padding: '4px 6px',
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  /* ── v2 row (csr): % leads at 15/800, letter is a quiet sub-label, sparkline
     sits muted under the course name. Borderline = inset amber edge tick + tiny
     pill — present ONLY when actually borderline, so it earns attention. */
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isSelected ? 'true' : undefined}
      className="bs-focusable"
      style={{
        all: 'unset',
        display: 'grid',
        gridTemplateColumns: '34px 1fr auto',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '11px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        background: isSelected ? T.activeBg : 'transparent',
        boxShadow: isSelected
          ? `inset 2px 0 0 ${T.primary}${borderInfo ? `, inset -3px 0 0 ${T.amber}` : ''}`
          : borderInfo ? `inset -3px 0 0 ${T.amber}` : 'none',
        boxSizing: 'border-box',
        marginBottom: 2,
      }}
    >
      {/* Abbreviation chip — accent-filled when active */}
      <div
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: isSelected ? T.primary : T.panel,
          border: `1px solid ${isSelected ? T.primary : T.border}`,
          color: isSelected ? inkOnAccent() : T.muted,
          display: 'grid',
          placeItems: 'center',
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.02em',
          textAlign: 'center',
          lineHeight: 1.1,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {abbr}
      </div>

      {/* Name + quiet sparkline */}
      <div style={{ minWidth: 0 }}>
        <div
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          title="Press the name to rename"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: isSelected ? T.text : T.muted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
            cursor: 'text',
          }}
        >
          {nickname || course.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, opacity: 0.85 }}>
          <Sparkline points={sparklinePoints} color={T.muted} />
          {borderInfo && (
            <span
              title={`Borderline — close to ${borderInfo.nextLetter}`}
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: T.amber,
                background: `${T.amber}24`,
                border: `1px solid ${T.amber}52`,
                borderRadius: 999,
                padding: '2px 7px',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              ↗ {borderInfo.nextLetter}
            </span>
          )}
        </div>
      </div>

      {/* Grade — % leads, letter quiet */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {percent !== null ? `${percent.toFixed(1)}%` : '—'}
        </div>
        {letter && (
          <div style={{ fontSize: 10, fontWeight: 700, color: gradeClr, lineHeight: 1.2, marginTop: 3 }}>{letter}</div>
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
