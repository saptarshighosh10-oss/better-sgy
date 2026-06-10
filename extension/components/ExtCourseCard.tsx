import React, { useRef, useState } from 'react';
import type { ScrapedCourse } from '../lib/schemas';
import { parseGradeString, gradeColor, isMissing } from '../lib/grade-utils';
import { courseColor, courseAbbr, abbrFontSize } from '../lib/course-colors';
import { computeSemesterTrend } from '../lib/grade-history';
import type { GradePoint } from '../lib/grade-history';
import { T, isLightTheme } from '../lib/theme';

interface Props {
  course: ScrapedCourse;
  onClick: () => void;
}

const SPARK_W = 110;
const SPARK_H = 26;

function Sparkline({ points, color }: { points: GradePoint[]; color: string }) {
  if (points.length < 2) return null;

  const sorted = [...points].sort((a, b) => a.ts - b.ts);
  const percents = sorted.map((p) => p.percent);
  const minP = Math.min(...percents);
  const maxP = Math.max(...percents);
  const range = maxP - minP || 1;

  const padY = 2;
  const innerH = SPARK_H - padY * 2;
  const step = (SPARK_W - 4) / (sorted.length - 1);

  const pts = sorted
    .map((p, i) => {
      const x = 2 + i * step;
      const y = padY + innerH - ((p.percent - minP) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastPt = sorted[sorted.length - 1];
  const lastX = 2 + (sorted.length - 1) * step;
  const lastY = padY + innerH - ((lastPt.percent - minP) / range) * innerH;

  return (
    <svg
      width={SPARK_W}
      height={SPARK_H}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      style={{ flexShrink: 0, overflow: 'visible' }}
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

export function ExtCourseCard({ course, onClick }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const colorBg = courseColor(course.name, false);
  const colorText = courseColor(course.name, true);
  const abbr = courseAbbr(course.name);
  const fontSize = abbrFontSize(abbr);
  const { percent, letter } = parseGradeString(course.grade);
  const gradeClr = gradeColor(percent);
  const spark = computeSemesterTrend(course);

  const allAssignments = course.categories.flatMap((c) => c.assignments);
  const missingCount = allAssignments.filter(isMissing).length;

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!cardRef.current) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const el = cardRef.current;
    el.style.transition = 'transform 120ms ease-out';
    el.style.transform = `rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg)`;
  }

  function handleMouseLeave() {
    setHovered(false);
    if (!cardRef.current) return;
    const el = cardRef.current;
    el.style.transition = 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)';
    el.style.transform = 'rotateX(0deg) rotateY(0deg)';
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      style={{
        all: 'unset',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        width: '100%',
        height: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        background: T.card,
        border: `1px solid ${hovered ? colorText + '66' : T.border}`,
        boxSizing: 'border-box',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.35)' : '0 1px 4px rgba(0,0,0,0.15)',
        transition: 'border-color 0.15s, box-shadow 0.2s',
        perspective: '900px',
        textAlign: 'left',
      }}
    >
      <div ref={cardRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', transition: 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {/* Color band */}
        <div
          style={{
            height: 80,
            flexShrink: 0,
            background: colorBg,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Abbreviation watermark */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize,
              // Ink-black watermark on the light theme (white is invisible there);
              // keep the subtle white watermark on dark themes.
              color: isLightTheme() ? 'rgba(0,0,0,0.82)' : 'rgba(255,255,255,0.09)',
              letterSpacing: '-1px',
              userSelect: 'none',
              lineHeight: 1,
            }}
            aria-hidden="true"
          >
            {abbr}
          </div>
          {/* Missing badge top-right in band */}
          {missingCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 9,
                fontWeight: 700,
                color: '#fca5a5',
                background: 'rgba(239,68,68,0.25)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 6,
                padding: '2px 6px',
                backdropFilter: 'blur(4px)',
              }}
            >
              {missingCount} missing
            </div>
          )}
        </div>

        {/* Card body */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 14px 14px',
          }}
        >
          {/* Name + grade row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 2 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}
              >
                {course.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.muted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: 2,
                }}
              >
                {course.teacher || ' '}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: gradeClr, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                {percent !== null ? `${percent.toFixed(2)}%` : '—'}
              </div>
              {letter && (
                <div style={{ fontSize: 11, fontWeight: 600, color: gradeClr, lineHeight: 1.2 }}>
                  {letter}
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 6 }} />

          {/* Sparkline + View hint */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
            <Sparkline points={spark} color={gradeClr} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                opacity: hovered ? 1 : 0.35,
                transition: 'opacity 0.15s',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 600, color: T.accent }}>View grades</span>
              <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke={T.accent}
                strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
