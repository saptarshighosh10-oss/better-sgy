import React from 'react';
import type { ScrapedCourse, SchoologyData } from '../../lib/schemas';
import { parseGradeString, isMissing, isUpcoming, formatDueDate, gradeColor } from '../../lib/grade-utils';
import { courseColor } from '../../lib/course-colors';
import { ExtCourseCard } from '../ExtCourseCard';

const T = {
  text: '#e8eaf0',
  muted: '#7a8ea3',
  faint: '#2a3a52',
  card: '#111827',
  border: '#1e2535',
  primary: '#3b82f6',
  fresh: '#22c55e',
  failed: '#ef4444',
  stale: '#f59e0b',
} as const;

interface GradesState {
  courses: ScrapedCourse[];
  data: SchoologyData | null;
  courseCount: number;
  assignmentCount: number;
}

interface Props {
  grades: GradesState;
  onCourseSelect: (name: string) => void;
}

interface FlatAssignment {
  name: string;
  status: string;
  dueDate: string;
  score: string;
  maxGrade: string;
  courseName: string;
  courseColor: string;
}

export function OverviewPage({ grades, onCourseSelect }: Props) {
  const { courses } = grades;

  const all: FlatAssignment[] = courses.flatMap((c) =>
    c.categories.flatMap((cat) =>
      cat.assignments.map((a) => ({
        ...a,
        courseName: c.name,
        courseColor: courseColor(c.name),
      })),
    ),
  );

  const missing = all.filter(isMissing as (a: FlatAssignment) => boolean);
  const upcoming = all
    .filter(isUpcoming as (a: FlatAssignment) => boolean)
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 12);

  const gradedCourses = courses.filter(
    (c) => parseGradeString(c.grade).percent !== null,
  );
  const avgGrade =
    gradedCourses.length > 0
      ? gradedCourses.reduce((s, c) => s + (parseGradeString(c.grade).percent ?? 0), 0) /
        gradedCourses.length
      : null;

  const period = (grades.data?.gradingPeriod ?? '')
    .replace(/\s*grading\s+period\s*/gi, '')
    .trim();

  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        padding: 24,
        minHeight: '100%',
        boxSizing: 'border-box',
        alignItems: 'flex-start',
      }}
    >
      {/* ── Left: header + stats + course grid ─────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Page header */}
        <div style={{ marginBottom: 16 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: T.text,
              lineHeight: 1.3,
            }}
          >
            Course Dashboard
            {period && (
              <span style={{ fontWeight: 400, color: T.muted, marginLeft: 8 }}>
                · {period}
              </span>
            )}
          </h1>
        </div>

        {/* Stats strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          <StatCell
            label="Avg Grade"
            value={avgGrade !== null ? `${avgGrade.toFixed(2)}%` : '—'}
            accent={avgGrade !== null ? gradeColor(avgGrade) : T.muted}
          />
          <StatCell
            label="Courses"
            value={String(grades.courseCount)}
            accent={T.text}
          />
          <StatCell
            label="Assignments"
            value={String(grades.assignmentCount)}
            accent={T.text}
          />
          <StatCell
            label="Missing"
            value={missing.length === 0 ? 'None' : String(missing.length)}
            accent={missing.length === 0 ? T.fresh : T.failed}
          />
        </div>

        {/* Course grid */}
        {courses.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: T.muted,
              fontSize: 13,
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
            }}
          >
            No courses found.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 14,
            }}
          >
            {courses.map((course) => (
              <ExtCourseCard
                key={course.name}
                course={course}
                onClick={() => onCourseSelect(course.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Right panel: missing + upcoming ─────────────────────────────── */}
      <div style={{ width: 296, flexShrink: 0 }}>
        {/* Missing */}
        <div style={{ marginBottom: 16 }}>
          <SectionHeader
            label="To Do"
            count={missing.length}
            countColor={missing.length > 0 ? T.failed : undefined}
          />
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            {missing.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: T.fresh,
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                All assignments submitted
              </div>
            ) : (
              missing.slice(0, 10).map((a, i) => (
                <AssignmentListRow
                  key={i}
                  name={a.name}
                  courseName={a.courseName}
                  courseColor={a.courseColor}
                  right={formatDueDate(a.dueDate)}
                  rightColor={T.failed}
                  isLast={i === Math.min(missing.length, 10) - 1}
                />
              ))
            )}
          </div>
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <SectionHeader label="Upcoming" count={upcoming.length} countColor={T.stale} />
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {upcoming.map((a, i) => (
                <AssignmentListRow
                  key={i}
                  name={a.name}
                  courseName={a.courseName}
                  courseColor={a.courseColor}
                  right={formatDueDate(a.dueDate)}
                  rightColor={T.muted}
                  isLast={i === upcoming.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div style={{ padding: '12px 16px', borderRight: `1px solid ${T.border}` }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: T.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: accent,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionHeader({
  label,
  count,
  countColor,
}: {
  label: string;
  count: number;
  countColor?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: T.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </span>
      {count > 0 && countColor && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            background: countColor + '20',
            color: countColor,
            borderRadius: 9,
            padding: '1px 6px',
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function AssignmentListRow({
  name,
  courseName,
  courseColor: clr,
  right,
  rightColor,
  isLast,
}: {
  name: string;
  courseName: string;
  courseColor: string;
  right: string;
  rightColor: string;
  isLast: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderBottom: isLast ? 'none' : '1px solid #151d2e',
      }}
    >
      <div
        style={{
          width: 3,
          height: 28,
          borderRadius: 2,
          background: clr,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            color: '#c8d0df',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 10,
            color: T.faint,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {courseName}
        </div>
      </div>
      <span style={{ fontSize: 10, color: rightColor, flexShrink: 0 }}>{right}</span>
    </div>
  );
}
