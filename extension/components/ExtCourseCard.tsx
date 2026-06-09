import React, { useState } from 'react';
import type { ScrapedCourse } from '../lib/schemas';
import { parseGradeString, gradeColor, isMissing } from '../lib/grade-utils';
import { courseColor, courseAbbr, abbrFontSize } from '../lib/course-colors';

interface Props {
  course: ScrapedCourse;
  onClick: () => void;
}

export function ExtCourseCard({ course, onClick }: Props) {
  const [hovered, setHovered] = useState(false);
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        all: 'unset',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        width: '100%',
        height: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#111827',
        border: `1px solid ${hovered ? '#2a3a58' : '#1e2535'}`,
        boxSizing: 'border-box',
        transform: hovered ? 'translateY(-1px)' : 'none',
        transition: 'border-color 0.15s, transform 0.1s',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      {/* Color band */}
      <div
        style={{
          height: 80,
          flexShrink: 0,
          background: color,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize,
            color: 'rgba(255,255,255,0.13)',
            letterSpacing: '-1px',
            userSelect: 'none',
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          {abbr}
        </div>
      </div>

      {/* Card body — flex column so grade stays near bottom */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 14px 14px',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#e2e8f0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 2,
            lineHeight: 1.3,
          }}
        >
          {course.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#4d5f7a',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minHeight: 16,
          }}
        >
          {course.teacher}
        </div>

        {/* Spacer pushes grade + badge to consistent bottom position */}
        <div style={{ flex: 1, minHeight: 8 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            marginBottom: missingCount > 0 ? 8 : 0,
          }}
        >
          <span style={{ fontSize: 26, fontWeight: 800, color: gradeClr, lineHeight: 1 }}>
            {percent !== null ? `${percent.toFixed(2)}%` : '—'}
          </span>
          {letter && (
            <span style={{ fontSize: 14, fontWeight: 700, color: gradeClr }}>{letter}</span>
          )}
        </div>
        {missingCount > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: '#ef4444',
              background: '#ef444415',
              border: '1px solid #ef444430',
              borderRadius: 6,
              padding: '2px 7px',
            }}
          >
            {missingCount} missing
          </div>
        )}
      </div>
    </button>
  );
}
