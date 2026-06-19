/**
 * CurrentGradesMiniGraph.tsx — Phase 2
 *
 * Horizontal grade bars for current grades across all courses.
 * No fake historical trends — only current grade percentages.
 * Shows a placeholder note about future trend capability.
 */

import React from 'react';
import type { ScrapedCourse } from '../lib/schemas';
import { parseGradeString, gradeColor } from '../lib/grade-utils';
import { T } from '../lib/theme';

interface Props {
  courses: ScrapedCourse[];
}

export function CurrentGradesMiniGraph({ courses }: Props) {
  const entries = courses
    .map((c) => ({ name: c.name, ...parseGradeString(c.grade) }))
    .filter((c) => c.percent !== null) as Array<{
    name: string;
    letter: string;
    percent: number;
  }>;

  if (entries.length === 0) {
    return (
      <div
        style={{
          background: '#111827',
          border: '1px solid #1e2535',
          borderRadius: 10,
          padding: '16px 18px',
          marginBottom: 16,
          color: '#4a5568',
          fontSize: 12,
          textAlign: 'center',
        }}
      >
        No grade percentages available yet.
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #1e2535',
        borderRadius: 10,
        padding: '16px 18px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: T.muted,
          letterSpacing: '-0.01em',
          marginBottom: 14,
        }}
      >
        Current Grades
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {entries.map((entry, i) => {
          const color = gradeColor(entry.percent);
          const barWidth = `${Math.min(100, Math.max(0, entry.percent))}%`;

          return (
            <div key={i}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 4,
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: '#c8d0df',
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.percent.toFixed(1)}% {entry.letter}
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: '#1e2535',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: barWidth,
                    height: '100%',
                    background: color,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 10,
          color: '#2d3748',
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        Grade trends will appear after more snapshots are collected.
      </div>
    </div>
  );
}
