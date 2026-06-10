/**
 * AssignmentsPreview.tsx — Phase 2
 *
 * Shows important assignments across all courses grouped as:
 *   Missing / Issues → Upcoming → Recently Graded
 */

import React from 'react';
import type { ScrapedCourse, ScrapedAssignment } from '../lib/schemas';
import { isMissing, isUpcoming, formatDueDate, gradeColor, scorePercent } from '../lib/grade-utils';

interface AssignmentWithCourse extends ScrapedAssignment {
  courseName: string;
}

interface Props {
  courses: ScrapedCourse[];
}

export function AssignmentsPreview({ courses }: Props) {
  const all: AssignmentWithCourse[] = courses.flatMap((c) =>
    c.categories.flatMap((cat) =>
      cat.assignments.map((a) => ({ ...a, courseName: c.name }))
    )
  );

  const missing = all.filter(isMissing);
  const upcoming = all.filter(isUpcoming).slice(0, 20);
  const recent = all
    .filter((a) => a.status === 'graded')
    .slice()
    .reverse()
    .slice(0, 20);

  if (missing.length === 0 && upcoming.length === 0 && recent.length === 0) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#4a5568',
          fontSize: 12,
          textAlign: 'center',
          background: '#111827',
          borderRadius: 10,
          border: '1px solid #1e2535',
        }}
      >
        No assignment data to display.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {missing.length > 0 && (
        <AssignmentGroup
          title="Missing / Issues"
          accentColor="#ef4444"
          items={missing}
          showScore={false}
        />
      )}
      {upcoming.length > 0 && (
        <AssignmentGroup
          title="Upcoming"
          accentColor="#f59e0b"
          items={upcoming}
          showScore={false}
        />
      )}
      {recent.length > 0 && (
        <AssignmentGroup
          title="Recently Graded"
          accentColor="#22c55e"
          items={recent}
          showScore={true}
        />
      )}
    </div>
  );
}

function AssignmentGroup({
  title,
  accentColor,
  items,
  showScore,
}: {
  title: string;
  accentColor: string;
  items: AssignmentWithCourse[];
  showScore: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: accentColor,
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
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
            flexShrink: 0,
          }}
        />
        {title}
        <span style={{ color: '#4a5568', fontWeight: 400 }}>({items.length})</span>
      </div>
      <div
        style={{
          background: '#111827',
          border: '1px solid #1e2535',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {items.map((a, i) => (
          <AssignmentRow
            key={i}
            assignment={a}
            showScore={showScore}
            isLast={i === items.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function AssignmentRow({
  assignment,
  showScore,
  isLast,
}: {
  assignment: AssignmentWithCourse;
  showScore: boolean;
  isLast: boolean;
}) {
  const pct = scorePercent(assignment.score, assignment.maxGrade);
  const color = pct !== null ? gradeColor(pct) : '#8892a4';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '9px 14px',
        borderBottom: isLast ? 'none' : '1px solid #151d2e',
      }}
    >
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
          {assignment.name}
        </div>
        <div style={{ fontSize: 10, color: '#4a5568', marginTop: 1 }}>
          {assignment.courseName}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
        {showScore && assignment.score ? (
          <span style={{ fontSize: 12, fontWeight: 600, color }}>
            {assignment.score}
            {assignment.maxGrade
              ? `/${assignment.maxGrade.replace(/^\/\s*/, '').trim()}`
              : ''}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#4a5568' }}>
            {formatDueDate(assignment.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}
