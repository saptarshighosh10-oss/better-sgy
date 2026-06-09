import React from 'react';
import type { ScrapedCourse } from '../../lib/schemas';
import { isMissing, isUpcoming, formatDueDate, gradeColor, scorePercent } from '../../lib/grade-utils';
import { courseColor } from '../../lib/course-colors';

const T = {
  text: '#e8eaf0',
  muted: '#7a8ea3',
  faint: '#2a3a52',
  card: '#111827',
  border: '#1e2535',
  fresh: '#22c55e',
  stale: '#f59e0b',
  failed: '#ef4444',
} as const;

interface GradesState {
  courses: ScrapedCourse[];
}

interface Props {
  grades: GradesState;
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

export function AssignmentsPage({ grades }: Props) {
  const all: FlatAssignment[] = grades.courses.flatMap((c) =>
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
    });
  const recent = all
    .filter((a) => a.status === 'graded')
    .slice()
    .reverse()
    .slice(0, 30);

  return (
    <div style={{ padding: 24 }}>
      <h1
        style={{
          margin: '0 0 20px',
          fontSize: 20,
          fontWeight: 700,
          color: T.text,
          lineHeight: 1.3,
        }}
      >
        Assignments
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {missing.length > 0 && (
          <Group
            title="Missing / Issues"
            accentColor={T.failed}
            items={missing}
            showScore={false}
          />
        )}
        {upcoming.length > 0 && (
          <Group
            title="Upcoming"
            accentColor={T.stale}
            items={upcoming}
            showScore={false}
          />
        )}
        {recent.length > 0 && (
          <Group
            title="Recently Graded"
            accentColor={T.fresh}
            items={recent}
            showScore={true}
          />
        )}
        {missing.length === 0 && upcoming.length === 0 && recent.length === 0 && (
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
            No assignment data to display.
          </div>
        )}
      </div>
    </div>
  );
}

function Group({
  title,
  accentColor,
  items,
  showScore,
}: {
  title: string;
  accentColor: string;
  items: FlatAssignment[];
  showScore: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: accentColor,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accentColor,
          }}
        />
        {title}
        <span style={{ color: T.faint, fontWeight: 400 }}>({items.length})</span>
      </div>
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {items.map((a, i) => (
          <Row
            key={i}
            item={a}
            showScore={showScore}
            isLast={i === items.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  item,
  showScore,
  isLast,
}: {
  item: FlatAssignment;
  showScore: boolean;
  isLast: boolean;
}) {
  const pct = scorePercent(item.score, item.maxGrade);
  const color = pct !== null ? gradeColor(pct) : T.muted;
  const clr = item.courseColor;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 14px',
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
          {item.name}
        </div>
        <div style={{ fontSize: 10, color: T.faint, marginTop: 1 }}>{item.courseName}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
        {showScore && item.score ? (
          <span style={{ fontSize: 12, fontWeight: 600, color }}>
            {item.score}
            {item.maxGrade ? `/${item.maxGrade.replace(/^\/\s*/, '').trim()}` : ''}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: T.faint }}>
            {formatDueDate(item.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}
