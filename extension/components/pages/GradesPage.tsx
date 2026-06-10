import React, { useState, useEffect } from 'react';
import type { ScrapedCourse, SchoologyData } from '../../lib/schemas';
import { parseGradeString, gradeColor, checkBorderline } from '../../lib/grade-utils';
import { courseColor, courseAbbr, abbrFontSize } from '../../lib/course-colors';
import { CourseGradebook } from '../CourseGradebook';
import { computeSemesterTrend } from '../../lib/grade-history';
import type { GradePoint } from '../../lib/grade-history';
import { T, isLightTheme } from '../../lib/theme';
import type { GradeSnapshot } from '../../lib/storage';

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
        {/* GPA Dashboard Card */}
        {gradedClassesCount > 0 && (
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                GPA Dashboard
              </span>
              <span style={{ fontSize: 9, color: T.primary, fontWeight: 600 }}>
                {gradedClassesCount} {gradedClassesCount === 1 ? 'Class' : 'Classes'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1.1 }}>
                  {unweightedGPA !== null ? unweightedGPA.toFixed(2) : '—'}
                </div>
                <div style={{ fontSize: 9, color: T.muted, fontWeight: 500, marginTop: 2 }}>
                  Unweighted
                </div>
              </div>
              <div style={{ flex: 1, borderLeft: `1px solid ${T.border}`, paddingLeft: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.primary, lineHeight: 1.1 }}>
                  {weightedGPA !== null ? weightedGPA.toFixed(2) : '—'}
                </div>
                <div style={{ fontSize: 9, color: T.muted, fontWeight: 500, marginTop: 2 }}>
                  Weighted
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '0 6px 8px',
          }}
        >
          Courses
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
          <CourseGradebook
            course={effectiveCourse}
            historyPoints={computeSemesterTrend(effectiveCourse)}
            nickname={nicknames[effectiveCourse.name]}
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
  const color = courseColor(course.name, false);
  const abbr = courseAbbr(course.name);
  const fontSize = abbrFontSize(abbr);
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

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isSelected ? 'true' : undefined}
      className="bs-focusable"
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
            color: isLightTheme() ? 'rgba(26,26,26,0.35)' : 'rgba(255,255,255,0.25)',
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
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            width: '100%',
          }}
        >
          <div
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            title="Press the name to rename"
            style={{
              fontSize: 12,
              fontWeight: isSelected ? 600 : 400,
              color: isSelected ? T.text : '#a0aec0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
              flex: 1,
              cursor: 'text',
            }}
          >
            {nickname || course.name}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Sparkline points={sparklinePoints} color={gradeClr} />
        </div>
      </div>

      {/* Grade */}
      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: gradeClr, lineHeight: 1 }}>
          {percent !== null ? `${percent.toFixed(1)}%` : '—'}
        </div>
        {borderInfo ? (
          <div
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              color: '#fbbf24',
              background: 'rgba(251, 191, 36, 0.12)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: 4,
              padding: '1px 4px',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
            title={`Borderline! Close to ${borderInfo.nextLetter}`}
          >
            ↗ {borderInfo.nextLetter}
          </div>
        ) : (
          letter && (
            <div style={{ fontSize: 10, color: gradeClr, lineHeight: 1.2 }}>{letter}</div>
          )
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
