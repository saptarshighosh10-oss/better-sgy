/**
 * grade-history.ts — Phase 6
 *
 * Tracks per-course grade percentage over time.
 * Stored in chrome.storage.local under key 'bs-grade-history'.
 *
 * Shape: Record<courseName, Array<{ ts: number; percent: number }>>
 *
 * - Appends today's percent per course (parsed from ScrapedCourse.grade).
 * - Replaces any existing entry from the same calendar day (no dupes).
 * - Caps at 60 entries per course.
 */

import type { ScrapedCourse } from './schemas';

const HISTORY_KEY = 'bs-grade-history';
const MAX_ENTRIES = 60;

export interface GradePoint {
  ts: number;
  percent: number;
}

export type GradeHistory = Record<string, GradePoint[]>;

/** Parse percent from strings like "A (97.44%)" or "B+ (89.12%)" */
function extractPercent(grade: string): number | null {
  if (!grade) return null;
  const m = grade.match(/(\d+\.?\d*)%/);
  return m ? parseFloat(m[1]) : null;
}

/** Calendar-day key for dedup: "YYYY-MM-DD" in local time */
function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Read current grade history from storage.
 */
export async function loadGradeHistory(): Promise<GradeHistory> {
  const result = await browser.storage.local.get(HISTORY_KEY);
  return (result[HISTORY_KEY] as GradeHistory) ?? {};
}

/**
 * Append today's grade percentages for all courses.
 * Call this AFTER a successful validated scrape save.
 *
 * - Replaces any existing entry from the same calendar day.
 * - Caps each course at MAX_ENTRIES (60).
 */
export async function appendGradeHistory(courses: ScrapedCourse[]): Promise<void> {
  const history = await loadGradeHistory();
  const now = Date.now();
  const todayKey = dayKey(now);

  for (const course of courses) {
    const percent = extractPercent(course.grade);
    if (percent === null) continue;

    const points = history[course.name] ?? [];

    // Remove existing entry from the same calendar day
    const filtered = points.filter((p) => dayKey(p.ts) !== todayKey);

    // Append new point
    filtered.push({ ts: now, percent });

    // Cap at MAX_ENTRIES (keep most recent)
    if (filtered.length > MAX_ENTRIES) {
      filtered.splice(0, filtered.length - MAX_ENTRIES);
    }

    history[course.name] = filtered;
  }

  await browser.storage.local.set({ [HISTORY_KEY]: history });
  console.log('[BS] Grade history updated:', Object.keys(history).length, 'courses');
}

// ── Derived semester trend (Desmos-style, no stored history needed) ──────────

/**
 * Replay the semester: sort graded assignments by due date and recompute the
 * cumulative grade (running Σscore/Σmax) after each one — the same approach
 * as the main app's trendData, but one point PER graded assignment so the
 * line visibly steps up/down as each grade lands. ts = assignment due date
 * (fallback: even spacing) so the x-axis is real time.
 */
export function computeSemesterTrend(course: ScrapedCourse): GradePoint[] {
  interface G { score: number; max: number; ts: number | null }
  const graded: G[] = [];
  for (const cat of course.categories) {
    for (const a of cat.assignments) {
      const score = parseFloat(a.score);
      const max = parseFloat((a.maxGrade ?? '').replace(/[^\d.]/g, ''));
      if (isNaN(score) || isNaN(max) || max <= 0) continue;
      const md = (a.dueDate ?? '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      let ts: number | null = null;
      if (md) {
        const y = md[3].length === 2 ? 2000 + parseInt(md[3], 10) : parseInt(md[3], 10);
        ts = new Date(y, parseInt(md[1], 10) - 1, parseInt(md[2], 10)).getTime();
      }
      graded.push({ score, max, ts });
    }
  }
  if (graded.length === 0) return [];
  // Dated assignments in date order; undated ones keep gradebook order at the end
  const dated = graded.filter((g) => g.ts !== null).sort((a, b) => a.ts! - b.ts!);
  const undated = graded.filter((g) => g.ts === null);
  const ordered = [...dated, ...undated];
  const lastTs = dated.length > 0 ? dated[dated.length - 1].ts! : Date.now();

  const points: GradePoint[] = [];
  let tot = 0, max = 0;
  ordered.forEach((g, i) => {
    tot += g.score; max += g.max;
    points.push({
      ts: g.ts ?? lastTs + (i + 1) * 86400000,
      percent: Math.round((tot / max) * 1000) / 10,
    });
  });
  return points;
}
