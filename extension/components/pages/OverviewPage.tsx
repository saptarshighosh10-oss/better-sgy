import React from 'react';
import type { ScrapedCourse, SchoologyData } from '../../lib/schemas';
import { parseGradeString, isMissing, scorePercent } from '../../lib/grade-utils';
import { SmartPriorities } from '../SmartPriorities';
import { T, isMinimalist } from '../../lib/theme';
import { AT, tileBg, hairline, cardShadow } from '../../lib/halo';
import { HaloButton, FeatureTile, SectionHeader, Eyebrow, haloCardStyle } from '../halo-ui';

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

function recentGraded(course: ScrapedCourse, limit = 7) {
  return course.categories
    .flatMap((cat) => cat.assignments)
    .filter((a) => a.status === 'graded')
    .slice(-limit);
}

/** Build a tiny sparkline polyline (chronological) from recent graded work. */
function sparkPoints(course: ScrapedCourse): string | null {
  const pts = recentGraded(course)
    .map((a) => scorePercent(a.score, a.maxGrade))
    .filter((p): p is number => p !== null);
  if (pts.length < 2) return null;
  const W = 220, H = 44, pad = 4;
  const min = Math.min(...pts, 60);
  const max = Math.max(...pts, 100);
  const span = max - min || 1;
  return pts
    .map((p, i) => {
      const x = pad + (i / (pts.length - 1)) * (W - pad * 2);
      const y = pad + (1 - (p - min) / span) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
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
  let dt: Date;
  if (md) {
    const [, m, d, y] = md;
    const yr = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    dt = new Date(yr, parseInt(m, 10) - 1, parseInt(d, 10));
  } else {
    dt = new Date(s);
  }
  if (isNaN(dt.getTime())) return false;
  const today = new Date();
  return dt.getFullYear() === today.getFullYear() &&
         dt.getMonth() === today.getMonth() &&
         dt.getDate() === today.getDate();
}

function CourseCard({ course, index, onClick }: {
  course: ScrapedCourse;
  index: number;
  onClick: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  const { percent, letter } = parseGradeString(course.grade);
  const missCt = course.categories.flatMap((c) => c.assignments).filter(isMissing).length;
  const spark = sparkPoints(course);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="bs-focusable bs-halo-card bs-halo-in"
      aria-label={`${course.name}${percent !== null ? `, ${percent.toFixed(1)} percent` : ''}${missCt > 0 ? `, ${missCt} missing` : ''} — open gradebook`}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: AT.rCardLg,
        background: T.card,
        border: `1px solid ${hairline()}`,
        boxShadow: cardShadow(hover),
        transform: hover ? 'translateY(-3px)' : 'none',
        animationDelay: `${index * 60}ms`,
        fontFamily: AT.font,
      }}
    >
      <div style={{ padding: '22px 24px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: AT.h3, fontWeight: AT.semibold, letterSpacing: AT.trackHead, color: T.text, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {course.name}
        </div>
        {course.teacher && (
          <div style={{ marginTop: 5, fontSize: AT.sub, color: T.muted, letterSpacing: AT.trackBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {course.teacher}
          </div>
        )}
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 46, fontWeight: AT.semibold, letterSpacing: AT.trackTight, lineHeight: 1, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
            {percent !== null ? percent.toFixed(1) : '—'}
          </span>
          {percent !== null && (
            <span style={{ fontSize: AT.h3, fontWeight: AT.semibold, color: T.muted, letterSpacing: AT.trackHead }}>%</span>
          )}
          {letter && letter !== '—' && (
            <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: AT.body, fontWeight: AT.semibold, color: T.muted, background: tileBg(), borderRadius: AT.rPill, padding: '4px 14px' }}>
              {letter}
            </span>
          )}
        </div>
        {spark && (
          <svg viewBox="0 0 220 44" preserveAspectRatio="none" aria-hidden="true" style={{ height: 44, width: '100%', marginTop: 16 }}>
            <polyline fill="none" stroke={T.text} strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={spark} />
          </svg>
        )}
      </div>
      <div style={{ marginTop: 'auto', padding: '14px 24px', borderTop: `1px solid ${hairline()}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: AT.sub, color: T.primary, letterSpacing: AT.trackBody, display: 'inline-flex', gap: 3 }}>
          View grades <span aria-hidden="true">›</span>
        </span>
        {missCt > 0 ? (
          <span style={{ fontSize: AT.caption, fontWeight: AT.semibold, color: T.failed }}>{missCt} missing</span>
        ) : (
          <span style={{ fontSize: AT.caption, color: T.muted, opacity: 0.85 }}>No missing work</span>
        )}
      </div>
    </button>
  );
}

export function OverviewPage({ grades, onCourseSelect }: Props) {
  const { courses } = grades;
  const minimal = isMinimalist();

  const gradedCourses = courses.filter((c) => parseGradeString(c.grade).percent !== null);
  const avg = gradedCourses.length
    ? gradedCourses.reduce((s, c) => s + (parseGradeString(c.grade).percent ?? 0), 0) / gradedCourses.length
    : null;

  const gpas = gradedCourses
    .map((c) => parseGradeString(c.grade).percent)
    .filter((p): p is number => p !== null)
    .map(percentToGpa);
  const gpaEstimate = gpas.length ? gpas.reduce((s, g) => s + g, 0) / gpas.length : null;

  const allAssignments = courses.flatMap((c) => c.categories.flatMap((cat) => cat.assignments));
  const dueTodayCount = allAssignments.filter((a) => a.dueDate && isDueToday(a.dueDate)).length;
  const missingTotal = allAssignments.filter(isMissing).length;

  const best = gradedCourses.reduce<{ name: string; pct: number } | null>((acc, c) => {
    const p = parseGradeString(c.grade).percent ?? -1;
    return !acc || p > acc.pct ? { name: c.name, pct: p } : acc;
  }, null);

  const period = (grades.data?.gradingPeriod ?? '').replace(/\s*grading\s+period\s*/gi, '').trim();
  const eyebrowText = period || 'Current semester';

  const scrapedAt = grades.data?.scrapedAt ?? null;
  const ageMs = scrapedAt ? Date.now() - scrapedAt : null;
  const ageLabel = ageMs === null ? null
    : ageMs < 60_000 ? 'just now'
    : ageMs < 3_600_000 ? `${Math.floor(ageMs / 60_000)}m ago`
    : ageMs < 86_400_000 ? `${Math.floor(ageMs / 3_600_000)}h ago`
    : `${Math.floor(ageMs / 86_400_000)}d ago`;
  const isStaleData = ageMs !== null && ageMs > 24 * 60 * 60 * 1000;

  const status = avg === null ? '' : avg >= 90 ? "You're on track." : avg >= 80 ? 'Keep it going.' : "Let's bring these up.";

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: AT.font }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '48px clamp(20px, 4vw, 40px) 96px' }}>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="bs-halo-in">
          <Eyebrow>{eyebrowText}</Eyebrow>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ fontSize: AT.hero, fontWeight: AT.semibold, letterSpacing: AT.trackTight, lineHeight: 0.95, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                  {avg !== null ? avg.toFixed(1) : '—'}
                </span>
                {avg !== null && (
                  <span style={{ fontSize: 40, fontWeight: AT.semibold, color: T.muted, letterSpacing: AT.trackHead, marginTop: 6, marginLeft: 3 }}>%</span>
                )}
              </div>
              <div style={{ marginTop: 14, fontSize: AT.h3, color: T.muted, letterSpacing: AT.trackBody }}>
                Overall average across {courses.length} course{courses.length === 1 ? '' : 's'}.
                {status && <span style={{ color: T.text, fontWeight: AT.medium }}> {status}</span>}
              </div>
              {ageLabel && (
                <div style={{ marginTop: 8, fontSize: AT.caption, color: isStaleData ? T.amber : T.muted, opacity: isStaleData ? 1 : 0.8 }}>
                  Updated {ageLabel}{isStaleData ? ' — open the Grades page on Schoology to refresh' : ''}
                </div>
              )}
            </div>
            {courses.length > 0 && (
              <HaloButton onClick={() => onCourseSelect(courses[0].name)}>View all grades</HaloButton>
            )}
          </div>
        </div>

        {/* ── Feature tiles ────────────────────────────────────── */}
        {!minimal && (
          <div style={{ marginTop: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18 }}>
            <FeatureTile label="GPA estimate" value={gpaEstimate !== null ? gpaEstimate.toFixed(2) : '—'} note="Weighted · 4.0 scale" />
            <FeatureTile label="Due today" value={String(dueTodayCount)} note="Assignments" />
            <FeatureTile label="Missing" value={missingTotal === 0 ? 'None' : String(missingTotal)} note={missingTotal > 0 ? 'Worth a look' : 'All caught up'} valueColor={missingTotal > 0 ? T.failed : undefined} />
            <FeatureTile label="Best class" value={best ? best.name : '—'} valueSize={AT.h3} note={best && best.pct >= 0 ? `${best.pct.toFixed(1)}% average` : undefined} />
          </div>
        )}

        {/* ── Course gallery ───────────────────────────────────── */}
        <div style={{ marginTop: 60 }}>
          <SectionHeader title="Your courses" meta={`${courses.length} course${courses.length === 1 ? '' : 's'}`} />
          {courses.length === 0 ? (
            <div style={{ marginTop: 24, padding: '48px 24px', textAlign: 'center', color: T.muted, fontSize: AT.body, ...haloCardStyle() }}>
              <div>No courses found in the last scrape.</div>
              <div style={{ marginTop: 8, fontSize: AT.sub, opacity: 0.8 }}>
                Open <span style={{ color: T.primary, fontWeight: AT.medium }}>{location.host}/grades/grades</span> to re-read your grades.
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {courses.map((course, i) => (
                <CourseCard key={course.name} course={course} index={i} onClick={() => onCourseSelect(course.name)} />
              ))}
            </div>
          )}
        </div>

        {/* ── Smart priorities (kept; hidden in minimalist) ────── */}
        {!minimal && (
          <div style={{ marginTop: 64 }}>
            <SmartPriorities courses={courses} />
          </div>
        )}
      </div>
    </div>
  );
}
