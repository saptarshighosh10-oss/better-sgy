/**
 * grade-utils.ts — Phase 2
 *
 * Display helpers for parsed grade data.
 * Builds on transform.ts primitives; adds date parsing and assignment categorization.
 */

import type { ScrapedAssignment } from './schemas';
import { parseGrade } from './transform';

import { getActiveTheme, isMono, isLightTheme } from './theme';

// Re-export for components that want a single import point
export { parseGrade };

/** Grade percent → display color. Calm ramp: only D/F read as alarms. */
export function gradeColor(pct: number | null): string {
  const theme = getActiveTheme();
  // Mono / B&W mode: a tonal grayscale ramp (better grades read darkest on light
  // surfaces, lightest on dark) so hierarchy survives without any color.
  if (isMono()) {
    const dark = !isLightTheme();
    if (pct === null) return dark ? '#8e8e93' : '#8a8a8e';
    if (pct >= 90) return dark ? '#f5f5f7' : '#1d1d1f';
    if (pct >= 80) return dark ? '#c7c7cc' : '#3a3a3c';
    if (pct >= 70) return dark ? '#98989d' : '#6e6e73';
    if (pct >= 60) return dark ? '#7c7c81' : '#8a8a8e';
    return dark ? '#636366' : '#a0a0a5';
  }
  if (theme === 'mono-dark') {
    return pct === null ? '#a0a0a0' : '#faf9f6';
  }
  if (theme === 'mono-light') {
    return pct === null ? '#6b6b6b' : '#1a1a1a';
  }
  if (pct === null) return '#8892a4';
  if (pct >= 90) return '#34d399'; // A — emerald
  if (pct >= 80) return '#60a5fa'; // B — calm blue
  if (pct >= 70) return '#fbbf24'; // C — amber
  if (pct >= 60) return '#fb923c'; // D — orange
  return '#f87171';                // F — red
}

/** Parse a grade string, returning displayable letter (never empty). */
export function parseGradeString(grade: string): { letter: string; percent: number | null } {
  const { letter, percent } = parseGrade(grade);
  return { letter: letter || '—', percent };
}

/** Parse score string → number or null. */
export function parseScore(score: string): number | null {
  if (!score) return null;
  const n = parseFloat(score);
  return isNaN(n) ? null : n;
}

/** Parse maxGrade string (e.g. "20", "/ 20") → number or null. */
export function parseMaxGrade(maxGrade: string): number | null {
  if (!maxGrade) return null;
  const cleaned = maxGrade.replace(/^\/\s*/, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/** Compute percentage from score + maxGrade strings. */
export function scorePercent(score: string, maxGrade: string): number | null {
  const s = parseScore(score);
  const m = parseMaxGrade(maxGrade);
  if (s === null || m === null || m === 0) return null;
  return (s / m) * 100;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

/** Parse Schoology due-date string "M/D/YY" → Date or null. */
export function parseDueDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const m = parseInt(parts[0], 10);
  const d = parseInt(parts[1], 10);
  const yy = parseInt(parts[2], 10);
  if (isNaN(m) || isNaN(d) || isNaN(yy)) return null;
  const year = yy < 50 ? 2000 + yy : 1900 + yy;
  const date = new Date(year, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

/** Format due date for display, e.g. "Jan 20" */
export function formatDueDate(dateStr: string): string {
  const d = parseDueDate(dateStr);
  if (!d) return dateStr || '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

export function isDatePast(dateStr: string): boolean {
  const d = parseDueDate(dateStr);
  if (!d) return false;
  return d < startOfToday();
}

export function isDateFuture(dateStr: string): boolean {
  const d = parseDueDate(dateStr);
  if (!d) return false;
  return d >= startOfToday();
}

// ── Assignment categorization ─────────────────────────────────────────────────

/**
 * Missing = either Schoology explicitly flagged it "Missing", or it's unsubmitted and
 * past due. Any other teacher exception (Excused / Incomplete / Absent) is never
 * "missing", and anything detected as submitted/pending is excluded by `status`.
 */
export function isMissing(a: ScrapedAssignment): boolean {
  if (a.exception) return a.exception === 'Missing';
  return a.status === 'unsubmitted' && !!a.dueDate && isDatePast(a.dueDate);
}

/** Unsubmitted + due date in the future (or today), with no exception = upcoming */
export function isUpcoming(a: ScrapedAssignment): boolean {
  if (a.exception) return false;
  return a.status === 'unsubmitted' && !!a.dueDate && isDateFuture(a.dueDate);
}

// ── Borderline checks ─────────────────────────────────────────────────────────

export interface BorderlineInfo {
  currentLetter: string;
  nextLetter: string;
  targetPercent: number;
}

export function checkBorderline(percent: number | null): BorderlineInfo | null {
  if (percent === null) return null;
  const boundaries = [
    { threshold: 93.0, currentLetter: 'A-', nextLetter: 'A' },
    { threshold: 90.0, currentLetter: 'B+', nextLetter: 'A-' },
    { threshold: 87.0, currentLetter: 'B', nextLetter: 'B+' },
    { threshold: 83.0, currentLetter: 'B-', nextLetter: 'B' },
    { threshold: 80.0, currentLetter: 'C+', nextLetter: 'B-' },
    { threshold: 77.0, currentLetter: 'C', nextLetter: 'C+' },
    { threshold: 73.0, currentLetter: 'C-', nextLetter: 'C' },
    { threshold: 70.0, currentLetter: 'D', nextLetter: 'C-' },
    { threshold: 60.0, currentLetter: 'F', nextLetter: 'D' },
  ];
  for (const b of boundaries) {
    if (percent >= b.threshold - 1.0 && percent < b.threshold) {
      return {
        currentLetter: b.currentLetter,
        nextLetter: b.nextLetter,
        targetPercent: b.threshold,
      };
    }
  }
  return null;
}

