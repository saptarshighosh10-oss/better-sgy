/**
 * grade-utils.ts — Phase 2
 *
 * Display helpers for parsed grade data.
 * Builds on transform.ts primitives; adds date parsing and assignment categorization.
 */

import type { ScrapedAssignment } from './schemas';
import { parseGrade } from './transform';

// Re-export for components that want a single import point
export { parseGrade };

/** Grade percent → display color */
export function gradeColor(pct: number | null): string {
  if (pct === null) return '#8892a4';
  if (pct >= 93) return '#22c55e';
  if (pct >= 90) return '#4ade80';
  if (pct >= 87) return '#a3e635';
  if (pct >= 83) return '#f59e0b';
  if (pct >= 80) return '#f97316';
  return '#ef4444';
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

/** Unsubmitted + due date in the past = missing */
export function isMissing(a: ScrapedAssignment): boolean {
  return a.status === 'unsubmitted' && !!a.dueDate && isDatePast(a.dueDate);
}

/** Unsubmitted + due date in the future (or today) = upcoming */
export function isUpcoming(a: ScrapedAssignment): boolean {
  return a.status === 'unsubmitted' && !!a.dueDate && isDateFuture(a.dueDate);
}
