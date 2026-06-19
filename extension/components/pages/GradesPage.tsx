import React, { useState, useEffect } from 'react';
import type { ScrapedCourse, SchoologyData } from '../../lib/schemas';
import { parseGradeString, gradeColor, checkBorderline } from '../../lib/grade-utils';
import { courseColor, courseAbbr, abbrFontSize } from '../../lib/course-colors';
import { CourseGradebook } from '../CourseGradebook';
import { computeSemesterTrend } from '../../lib/grade-history';
import type { GradePoint } from '../../lib/grade-history';
import { T, isLightTheme, isMinimalist } from '../../lib/theme';
import { AT, tileBg, hairline } from '../../lib/apple';
import { appleCardStyle } from '../apple-ui';
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
        fontFamily: AT.font,
        background: T.bg,
      }}
    >
      {/* ── Course list panel ──────────────────────────────────────────── */}
      <nav
        aria-label="Courses"
        style={{
          width: 264,
          flexShrink: 0,
          borderRight: `1px solid ${hairline()}`,
          overflowY: 'auto',
          padding: '20px 12px',
          background: T.panel,
        }}
      >
        {/* GPA Dashboard Card */}
        {gradedClassesCount > 0 && (
          <div
            style={{
              background: tileBg(),
              borderRadius: AT.rTile,
              padding: '16px 18px',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: AT.sub, color: T.muted, letterSpacing: AT.trackBody }}>
                GPA
              </span>
              <span style={{ fontSize: AT.caption, color: T.muted }}>
                {gradedClassesCount} {gradedClassesCount === 1 ? 'class' : 'classes'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 18 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: AT.semibold, color: T.text, lineHeight: 1, letterSpacing: AT.trackHead, fontVariantNumeric: 'tabular-nums' }}>
                  {unweightedGPA !== null ? unweightedGPA.toFixed(2) : '—'}
                </div>
                <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 5 }}>
                  Unweighted
                </div>
              </div>
              <div style={{ flex: 1, borderLeft: `1px solid ${hairline()}`, paddingLeft: 18 }}>
                <div style={{ fontSize: 28, fontWeight: AT.semibold, color: T.primary, lineHeight: 1, letterSpacing: AT.trackHead, fontVariantNumeric: 'tabular-nums' }}>
                  {weightedGPA !== null ? weightedGPA.toFixed(2) : '—'}
                </div>
                <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 5 }}>
                  Weighted
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            fontSize: AT.caption,
            fontWeight: AT.medium,
            color: T.muted,
            letterSpacing: AT.trackBody,
            padding: '0 8px 10px',
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
          padding: 28,
          minWidth: 0,
        }}
      >
        {activeSnapshot && (
          <div
            style={{
              background: `${T.primary}14`,
              borderRadius: AT.rTile,
              padding: '12px 18px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: AT.sub, fontWeight: AT.semibold, color: T.primary, letterSpacing: AT.trackBody }}>Snapshot</span>
              <span style={{ fontSize: AT.sub, color: T.muted }}>{activeSnapshot.name}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveSnapshot(null);
                if (courses[0]) {
                  onCourseSelect(courses[0].name);
                }
              }}
              className="bs-focusable bs-press"
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: AT.caption,
                fontWeight: AT.medium,
                color: T.primary,
                background: T.primary + '1f',
                borderRadius: AT.rPill,
                padding: '7px 16px',
              }}
            >
              Exit snapshot
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
              fontSize: AT.body,
              letterSpacing: AT.trackBody,
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
        gap: 12,
        width: '100%',
        padding: '10px 10px',
        borderRadius: AT.rTile,
        cursor: 'pointer',
        background: isSelected ? tileBg() : 'transparent',
        boxSizing: 'border-box',
        marginBottom: 3,
      }}
    >
      {/* Color band mini badge */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
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
              fontSize: AT.sub,
              fontWeight: isSelected ? AT.semibold : AT.regular,
              letterSpacing: AT.trackBody,
              color: isSelected ? T.text : T.muted,
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
      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <div style={{ fontSize: AT.sub, fontWeight: AT.semibold, color: gradeClr, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {percent !== null ? `${percent.toFixed(1)}%` : '—'}
        </div>
        {borderInfo ? (
          <div
            style={{
              fontSize: AT.micro,
              fontWeight: AT.semibold,
              color: T.amber,
              background: `${T.amber}1f`,
              borderRadius: AT.rPill,
              padding: '2px 8px',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
            }}
            title={`Borderline — close to ${borderInfo.nextLetter}`}
          >
            ↗ {borderInfo.nextLetter}
          </div>
        ) : (
          letter && (
            <div style={{ fontSize: AT.caption, color: T.muted, lineHeight: 1.2 }}>{letter}</div>
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
  const minimal = isMinimalist();

  // Single point → dot (omitted in minimalist mode — line-only graphs)
  if (points.length === 1) {
    if (minimal) return null;
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
      {/* End dot — removed in minimalist mode (line only) */}
      {!minimal && (() => {
        const lastPt = sorted[sorted.length - 1];
        const x = 2 + (sorted.length - 1) * step;
        const y = padY + innerH - ((lastPt.percent - minP) / range) * innerH;
        return <circle cx={x} cy={y} r={2} fill={color} />;
      })()}
    </svg>
  );
}
