import React, { useState, useRef } from 'react';
import type { ScrapedCourse, SchoologyData } from '../../lib/schemas';
import { parseGradeString, isMissing, scorePercent, gradeColor } from '../../lib/grade-utils';
import { courseColor, courseAbbr, abbrFontSize } from '../../lib/course-colors';
import { SmartPriorities } from '../SmartPriorities';
import { DueSoon } from '../DueSoon';
import { FocusTimer } from '../FocusTimer';
import { T, isLightTheme } from '../../lib/theme';

const CARD_W     = 252;
const SPREAD     = 274;
const ROT_Y      = 16;
const SCALE_STEP = 0.07;
const OPA_STEP   = 0.18;
const MAX_VIS    = 2;

export const FLY_VARIANTS = 4;

/**
 * Per-card entrance: each card flies in from its own off-screen spot and lands
 * in its carousel position. Outer cards (bigger |offset|) lead; inner/center
 * cards follow with a slight stagger. Four variations keep it fresh each open.
 * Returns the wrapper style (position + 3D context + z-order + CSS vars the
 * bsCardFly keyframe reads). zIndex mirrors the card's so the fan overlaps right.
 */
function flyStyle(variant: number, offset: number, i: number): React.CSSProperties {
  const absOff = Math.abs(offset);
  // Outermost first (delay 0), center last — "outside ones come in first".
  const delay = Math.max(0, MAX_VIS + 1 - absOff) * 75;
  const sign = offset === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(offset);
  let fx = '0px', fy = '120%', fr = '0deg', fs = '0.7';
  switch (variant) {
    case 0: // rise up from the bottom
      fx = `${offset * 22}px`; fy = '128%'; fr = `${offset * 4}deg`; fs = '0.74';
      break;
    case 1: // fan out from the sides (center drops up from below)
      fx = absOff === 0 ? '0%' : `${sign * 78}%`;
      fy = absOff === 0 ? '96%' : '8%';
      fr = `${offset * 12}deg`; fs = '0.7';
      break;
    case 2: // scatter from the four corners (alternating by index)
      fx = `${sign * 122}%`;
      fy = `${(i % 2 === 0 ? -1 : 1) * 118}%`;
      fr = `${sign * 18}deg`; fs = '0.66';
      break;
    case 3: // drop and spin from the top
    default:
      fx = `${offset * -18}px`; fy = '-128%'; fr = `${offset * 16}deg`; fs = '0.64';
      break;
  }
  return {
    position: 'absolute',
    inset: 0,
    transformStyle: 'preserve-3d',
    zIndex: 20 - absOff,
    animationDelay: `${delay}ms`,
    ['--fx']: fx,
    ['--fy']: fy,
    ['--fr']: fr,
    ['--fs']: fs,
  } as React.CSSProperties;
}

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

function wrappedOffset(i: number, active: number, n: number): number {
  let off = i - active;
  if (off > n / 2)  off -= n;
  if (off < -n / 2) off += n;
  return off;
}

function recentGraded(course: ScrapedCourse, limit = 5) {
  return course.categories
    .flatMap((cat) => cat.assignments)
    .filter((a) => a.status === 'graded')
    .slice(-limit)
    .reverse();
}

function CourseCard({
  course, offset, isActive, onClick,
}: {
  course: ScrapedCourse;
  offset: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const absOff   = Math.abs(offset);
  const colorBg  = courseColor(course.name, false);
  const colorText = courseColor(course.name, true);
  const abbr     = courseAbbr(course.name);
  const abbFS    = abbrFontSize(abbr);
  const { percent, letter } = parseGradeString(course.grade);
  const recent   = recentGraded(course, 5);
  const missCt   = course.categories.flatMap((c) => c.assignments).filter(isMissing).length;
  const light    = isLightTheme();
  const bandInk  = light ? '#1a1a1a' : '#fff';
  const bandInkSoft = light ? 'rgba(26,26,26,0.65)' : 'rgba(255,255,255,0.65)';

  const scale  = 1 - absOff * SCALE_STEP;
  // Light theme: faded cards wash out on white, keep them more opaque
  const opa    = Math.max(light ? 0.55 : 0.28, 1 - absOff * (light ? 0.12 : OPA_STEP));
  const rotY   = -offset * ROT_Y;
  const tx     = offset * SPREAD;
  const hidden = absOff > MAX_VIS;

  return (
    <button
      type="button"
      onClick={onClick}
      className="bs-focusable bs-motion"
      tabIndex={isActive ? 0 : -1}
      aria-label={`${course.name}${percent !== null ? `, ${percent.toFixed(1)}%` : ''}${missCt > 0 ? `, ${missCt} missing` : ''} — open gradebook`}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: CARD_W,
        height: '92%',
        marginLeft: -(CARD_W / 2),
        borderRadius: 22,
        overflow: 'hidden',
        background: T.card,
        border: `1px solid ${isActive ? colorText + '55' : T.border}`,
        boxShadow: isActive
          ? `0 24px 72px rgba(0,0,0,0.7), 0 0 0 1px ${colorText}22`
          : `0 6px 24px rgba(0,0,0,0.4)`,
        cursor: 'pointer',
        transform: `translateX(${tx}px) translateY(-50%) rotateY(${rotY}deg) scale(${scale})`,
        opacity: hidden ? 0 : opa,
        pointerEvents: hidden ? 'none' : 'auto',
        transition: 'transform 0.52s cubic-bezier(0.22,1,0.36,1), opacity 0.38s ease, border-color 0.3s, box-shadow 0.4s',
        zIndex: 20 - absOff,
        userSelect: 'none',
        willChange: 'transform',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Color header — 40% of card ────────────────────────── */}
      <div style={{ height: '40%', background: colorBg, position: 'relative', flexShrink: 0, overflow: 'hidden', width: '100%' }}>
        {/* Watermark */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: abbFS, fontWeight: 900,
          // Ink-black watermark on the light theme (the 0.07 grey was barely there);
          // keep the subtle white watermark on dark themes.
          color: light ? 'rgba(0,0,0,0.82)' : 'rgba(255,255,255,0.09)', letterSpacing: '-1px', lineHeight: 1,
        }}>
          {abbr}
        </div>
        {/* Grade — top right */}
        <div style={{ position: 'absolute', top: 12, right: 14, textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: bandInk, lineHeight: 1, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
            {percent !== null ? `${percent.toFixed(1)}%` : '—'}
          </div>
          {letter && (
            <div style={{ fontSize: 14, fontWeight: 700, color: bandInkSoft, marginTop: 2 }}>{letter}</div>
          )}
        </div>
        {/* Missing badge — top left */}
        {missCt > 0 && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            fontSize: 9, fontWeight: 700,
            color: light ? '#faf9f6' : '#fecaca',
            background: light ? 'rgba(26,26,26,0.85)' : 'rgba(127,29,29,0.75)',
            border: light ? '1px solid rgba(26,26,26,0.85)' : '1px solid rgba(239,68,68,0.5)',
            borderRadius: 6, padding: '3px 7px',
          }}>
            {missCt} missing
          </div>
        )}
        {/* Course name — flat legibility band */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '10px 14px 9px',
          background: light ? 'rgba(255,255,255,0.6)' : 'rgba(10, 13, 20, 0.55)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: bandInk, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {course.name}
          </div>
          {course.teacher && (
            <div style={{ fontSize: 10, color: bandInkSoft, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {course.teacher}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent assignments — fills rest ───────────────────── */}
      <div style={{ flex: 1, padding: '14px 14px 12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Recent
        </div>
        {recent.length === 0 ? (
          <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>No graded work yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {recent.map((a, idx) => {
              const pct    = scorePercent(a.score, a.maxGrade);
              const pctClr = gradeColor(pct);
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 0',
                    borderBottom: idx < recent.length - 1 ? `1px solid ${T.rowBorder}` : 'none',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: pctClr ?? T.faint, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.name}
                  </div>
                  {pct !== null && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: pctClr, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {pct.toFixed(0)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Tap to open hint */}
        {isActive && (
          <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: colorText + '18', borderRadius: 9, padding: '7px 12px' }}>
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke={colorText} strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: colorText }}>Tap to open grades</span>
          </div>
        )}
      </div>
    </button>
  );
}


function percentToGpa(p: number): number {
  if (p >= 93) return 4.0;
  if (p >= 90) return 3.7;
  if (p >= 87) return 3.3;
  if (p >= 83) return 3.0;
  if (p >= 80) return 2.7;
  if (p >= 77) return 2.3;
  if (p >= 73) return 2.0;
  if (p >= 70) return 1.7;
  if (p >= 60) return 1.0;
  return 0.0;
}

function isDueToday(rawDateString: string): boolean {
  if (!rawDateString) return false;
  const s = rawDateString.replace(/\bdue\b/i, '').trim();
  const md = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (md) {
    let [, m, d, y] = md;
    const yr = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    const dt = new Date(yr, parseInt(m, 10) - 1, parseInt(d, 10));
    const today = new Date();
    return dt.getFullYear() === today.getFullYear() &&
           dt.getMonth() === today.getMonth() &&
           dt.getDate() === today.getDate();
  }
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return false;
  const today = new Date();
  return dt.getFullYear() === today.getFullYear() &&
         dt.getMonth() === today.getMonth() &&
         dt.getDate() === today.getDate();
}

function StatCard({ label, value, subText, accent, borderAccent }: {
  label: string;
  value: string;
  subText?: string;
  accent?: string;
  borderAccent?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.card,
        border: `1px solid ${hovered && borderAccent ? borderAccent : T.border}`,
        borderRadius: 14,
        padding: '12px 18px',
        minWidth: 106,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        boxShadow: hovered ? '0 8px 16px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.1)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease-out, border-color 0.2s ease-out',
      }}
      className="bs-motion"
    >
      <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent ?? T.text, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {subText && (
        <div style={{ fontSize: 9, color: T.muted, opacity: 0.8, marginTop: 4, fontWeight: 500 }}>
          {subText}
        </div>
      )}
    </div>
  );
}

export function OverviewPage({ grades, onCourseSelect }: Props) {
  const { courses } = grades;
  const N = courses.length;
  const [activeIdx, setActiveIdx] = useState(0);
  const dragRef = useRef({ x0: 0, on: false, moved: false });
  // Pick a fly-in variation once per mount → unique each time the overview opens.
  const flyVariant = useRef(Math.floor(Math.random() * FLY_VARIANTS)).current;

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { x0: e.clientX, on: true, moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.on) return;
    if (Math.abs(e.clientX - dragRef.current.x0) > 12) dragRef.current.moved = true;
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragRef.current.on) return;
    const dx = e.clientX - dragRef.current.x0;
    dragRef.current.on = false;
    if (Math.abs(dx) > 40) {
      if (dx < 0) setActiveIdx((p) => (p + 1) % N);
      else        setActiveIdx((p) => (p - 1 + N) % N);
    }
  }

  function onCarouselKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation(); // keep page-level ←/→ tab cycling out of course browsing
      setActiveIdx((p) => (p + 1) % N);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      setActiveIdx((p) => (p - 1 + N) % N);
    }
  }


  const gradedCourses = courses.filter((c) => parseGradeString(c.grade).percent !== null);
  const avg = gradedCourses.length
    ? gradedCourses.reduce((s, c) => s + (parseGradeString(c.grade).percent ?? 0), 0) / gradedCourses.length
    : null;
  const gpas = gradedCourses.map((c) => {
    const { percent } = parseGradeString(c.grade);
    return percent !== null ? percentToGpa(percent) : null;
  }).filter((g) => g !== null) as number[];
  const gpaEstimate = gpas.length
    ? gpas.reduce((s, g) => s + g, 0) / gpas.length
    : null;

  const dueTodayCount = courses
    .flatMap((c) => c.categories.flatMap((cat) => cat.assignments))
    .filter((a) => a.dueDate && isDueToday(a.dueDate)).length;

  const missingTotal = courses.flatMap((c) => c.categories.flatMap((cat) => cat.assignments)).filter(isMissing).length;
  const period = (grades.data?.gradingPeriod ?? '').replace(/\s*grading\s+period\s*/gi, '').trim();

  // Honest data-freshness line — students should know when grades were last read
  const scrapedAt = grades.data?.scrapedAt ?? null;
  const ageMs = scrapedAt ? Date.now() - scrapedAt : null;
  const isStaleData = ageMs !== null && ageMs > 24 * 60 * 60 * 1000;
  const ageLabel = ageMs === null ? null
    : ageMs < 60_000 ? 'just now'
    : ageMs < 3_600_000 ? `${Math.floor(ageMs / 60_000)}m ago`
    : ageMs < 86_400_000 ? `${Math.floor(ageMs / 3_600_000)}h ago`
    : `${Math.floor(ageMs / 86_400_000)}d ago`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: T.bg }}>

      {/* ── Header strip ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28, padding: '20px 28px 14px', flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {period || 'Current Semester'}
          </h1>
          {/* v2: hero number is neutral text — color is reserved for status, not scale */}
          <div style={{ fontSize: 64, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', margin: '6px 0 8px' }}>
            {avg !== null ? `${avg.toFixed(2)}%` : '—'}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
            Overall Average
            {ageLabel && (
              <span style={{ color: isStaleData ? T.amber : T.muted, opacity: isStaleData ? 1 : 0.75 }}>
                {' '}· updated {ageLabel}{isStaleData ? ' — open the Grades page on Schoology to refresh' : ''}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginLeft: 8 }}>
          <StatCard
            label="GPA Estimate"
            value={gpaEstimate !== null ? gpaEstimate.toFixed(2) : '—'}
            subText="Weighted 4.0 Scale"
            accent={T.primary}
            borderAccent={T.primary}
          />
          <StatCard
            label="Due Today"
            value={String(dueTodayCount)}
            subText="Assignments"
            accent={dueTodayCount > 0 ? T.amber : T.fresh}
            borderAccent={dueTodayCount > 0 ? T.amber : T.fresh}
          />
          <StatCard
            label="Missing"
            value={missingTotal === 0 ? 'None' : String(missingTotal)}
            subText="Action Required"
            accent={missingTotal > 0 ? T.failed : T.text}
            borderAccent={missingTotal > 0 ? T.failed : undefined}
          />
        </div>
      </div>

      {/* ── Carousel — grows to fill viewport ─────────────────────── */}
      {courses.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: T.muted, fontSize: 14 }}>
          <span>No courses found in the last scrape.</span>
          <span style={{ fontSize: 12, color: T.muted, opacity: 0.75 }}>
            Open <span style={{ color: T.primary, fontWeight: 600 }}>{location.host}/grades/grades</span> to re-read your grades.
          </span>
        </div>
      ) : (
        <div
          role="group"
          aria-roledescription="carousel"
          aria-label={`Courses, ${activeIdx + 1} of ${N} selected. Use left and right arrow keys to browse.`}
          tabIndex={0}
          className="bs-focusable"
          style={{
            flex: 1,
            minHeight: 420,
            position: 'relative',
            perspective: '1400px',
            cursor: 'grab',
            overflow: 'visible',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onCarouselKeyDown}
        >
          {/* Each card flies in from its own spot and lands in position (staggered,
              outer cards first). Per-card wrapper carries the entrance; the inner
              CourseCard keeps its carousel transform. */}
          {courses.map((course, i) => {
            const offset = wrappedOffset(i, activeIdx, N);
            return (
              <div key={course.name} className="bs-card-fly" style={flyStyle(flyVariant, offset, i)}>
                <CourseCard
                  course={course}
                  offset={offset}
                  isActive={offset === 0}
                  onClick={() => {
                    if (dragRef.current.moved) return;
                    if (offset === 0) onCourseSelect(course.name);
                    else setActiveIdx(i);
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dots ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 2, padding: '6px 0 4px', flexShrink: 0 }}>
        {courses.map((course, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIdx(i)}
            aria-label={`Show ${course.name}`}
            aria-current={i === activeIdx ? 'true' : undefined}
            className="bs-focusable bs-motion"
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '10px 5px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              aria-hidden="true"
              className="bs-motion"
              style={{
                width: i === activeIdx ? 22 : 7,
                height: 7,
                borderRadius: 4,
                background: i === activeIdx ? T.primary : T.faint,
                transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1), background 0.3s',
                display: 'block',
              }}
            />
          </button>
        ))}
      </div>

      {/* ── Due soon + focus timer ────────────────────────────────── */}
      <div style={{ padding: '4px 28px 0', flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        <DueSoon courses={courses} />
        <FocusTimer />
      </div>

      {/* ── Smart Priorities — below the fold ─────────────────────── */}
      <div style={{ padding: '16px 28px 32px', flexShrink: 0 }}>
        <SmartPriorities courses={courses} />
      </div>

    </div>
  );
}
