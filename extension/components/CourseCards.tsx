/**
 * CourseCards.tsx — Phase 2
 *
 * Sidebar list of course cards. Each card shows name, teacher, grade, and missing count.
 */

import React from 'react';
import type { ScrapedCourse } from '../lib/schemas';
import { parseGradeString, gradeColor, isMissing } from '../lib/grade-utils';

interface Props {
  courses: ScrapedCourse[];
  selectedCourseName: string | null;
  onSelect: (name: string) => void;
}

export function CourseCards({ courses, selectedCourseName, onSelect }: Props) {
  if (courses.length === 0) {
    return (
      <div style={{ padding: '20px 12px', textAlign: 'center', color: '#8892a4', fontSize: 13 }}>
        No courses found.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {courses.map((course) => (
        <CourseCard
          key={course.name}
          course={course}
          selected={course.name === selectedCourseName}
          onClick={() => onSelect(course.name)}
        />
      ))}
    </div>
  );
}

function CourseCard({
  course,
  selected,
  onClick,
}: {
  course: ScrapedCourse;
  selected: boolean;
  onClick: () => void;
}) {
  const { letter, percent } = parseGradeString(course.grade);
  const color = gradeColor(percent);

  const allAssignments = course.categories.flatMap((c) => c.assignments);
  const missingCount = allAssignments.filter(isMissing).length;
  const totalCount = allAssignments.length;

  return (
    <button
      onClick={onClick}
      style={{
        all: 'unset',
        display: 'block',
        cursor: 'pointer',
        padding: '11px 13px',
        borderRadius: 9,
        background: selected ? '#1a2540' : '#111827',
        border: `1px solid ${selected ? '#3b82f6' : '#1e2535'}`,
        width: '100%',
        boxSizing: 'border-box',
        textAlign: 'left',
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      {/* Name + grade */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#e2e8f0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}
          >
            {course.name}
          </div>
          <div style={{ fontSize: 11, color: '#8892a4', marginTop: 2 }}>
            {course.teacher || 'Unknown teacher'}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color, lineHeight: 1.1 }}>
            {percent !== null ? `${percent.toFixed(1)}%` : '—'}
          </div>
          <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 1 }}>{letter}</div>
        </div>
      </div>

      {/* Counts */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#4a5568' }}>{totalCount} assignments</span>
        {missingCount > 0 && (
          <span
            style={{
              fontSize: 10,
              background: '#ef444420',
              color: '#ef4444',
              border: '1px solid #ef444440',
              borderRadius: 4,
              padding: '1px 6px',
              fontWeight: 600,
            }}
          >
            {missingCount} missing
          </span>
        )}
      </div>
    </button>
  );
}
