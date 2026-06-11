/**
 * grade-changes.ts — "what changed since the last scrape" feed.
 *
 * Every successful scrape already loads the PREVIOUS snapshot (for the safety
 * guards) right before saving the new one — this module diffs the two at that
 * moment and appends compact change events to chrome.storage.local:
 *   - course overall % moved          ("Biology 96.7% → 97.1%")
 *   - an assignment got graded        ("Pig Quiz 2 graded · 100%")
 *   - an assignment was flagged Missing
 * All local; nothing is fetched or transmitted.
 */

import type { SchoologyData, ScrapedCourse } from './schemas';
import { parseGradeString, scorePercent } from './grade-utils';

const EVENTS_KEY = 'bs-grade-changes';
const SEEN_KEY = 'bs-grade-changes-seen';
const MAX_EVENTS = 80;

export interface ChangeEvent {
  ts: number;
  kind: 'course' | 'graded' | 'missing';
  course: string;
  /** assignment name for 'graded' / 'missing' */
  name?: string;
  fromPct?: number;
  toPct?: number;
  /** assignment score percent for 'graded' */
  scorePct?: number;
}

function coursePct(c: ScrapedCourse): number | null {
  return parseGradeString(c.grade).percent;
}

type AsgState = { status: string; score: string; max: string; exception: string };

function assignmentMap(c: ScrapedCourse): Map<string, AsgState> {
  const m = new Map<string, AsgState>();
  for (const cat of c.categories) {
    for (const a of cat.assignments) {
      m.set(`${cat.name}|${a.name}`, {
        status: a.status, score: a.score, max: a.maxGrade, exception: a.exception ?? '',
      });
    }
  }
  return m;
}

/** Pure diff — exported for testability. */
export function computeChanges(prev: SchoologyData, next: SchoologyData, now = Date.now()): ChangeEvent[] {
  const events: ChangeEvent[] = [];
  const prevByName = new Map(prev.courses.map((c) => [c.name, c]));

  for (const course of next.courses) {
    const before = prevByName.get(course.name);
    if (!before) continue; // brand-new course — nothing meaningful to diff yet

    // 1. Course overall percent moved (≥ 0.05 to skip float noise)
    const p0 = coursePct(before);
    const p1 = coursePct(course);
    if (p0 !== null && p1 !== null && Math.abs(p1 - p0) >= 0.05) {
      events.push({ ts: now, kind: 'course', course: course.name, fromPct: p0, toPct: p1 });
    }

    // 2. Assignment-level: newly graded / newly missing
    const prevAsg = assignmentMap(before);
    for (const cat of course.categories) {
      for (const a of cat.assignments) {
        const key = `${cat.name}|${a.name}`;
        const old = prevAsg.get(key);
        const wasGraded = old?.status === 'graded' && old.score.trim() !== '';
        const isGraded = a.status === 'graded' && a.score.trim() !== '';
        if (isGraded && old && !wasGraded) {
          const pct = scorePercent(a.score, a.maxGrade);
          events.push({
            ts: now, kind: 'graded', course: course.name, name: a.name,
            ...(pct !== null ? { scorePct: pct } : {}),
          });
        }
        const wasMissing = old?.exception === 'Missing';
        if (a.exception === 'Missing' && old && !wasMissing) {
          events.push({ ts: now, kind: 'missing', course: course.name, name: a.name });
        }
      }
    }
  }
  return events;
}

/**
 * Diff + persist. Call right before saving a new validated snapshot.
 * Returns the fresh events so callers can e.g. fire an OS notification.
 */
export async function recordChanges(prev: SchoologyData | null, next: SchoologyData): Promise<ChangeEvent[]> {
  if (!prev) return [];
  try {
    const fresh = computeChanges(prev, next);
    if (fresh.length === 0) return [];
    const result = await browser.storage.local.get(EVENTS_KEY);
    const existing = (result[EVENTS_KEY] as ChangeEvent[] | undefined) ?? [];
    const all = [...existing, ...fresh].slice(-MAX_EVENTS);
    await browser.storage.local.set({ [EVENTS_KEY]: all });
    return fresh;
  } catch (e) {
    console.error('[BS] recordChanges failed:', e);
    return [];
  }
}

/** One-line human summary for a change event (used by the OS notification). */
export function describeChange(e: ChangeEvent): string {
  if (e.kind === 'course' && e.fromPct !== undefined && e.toPct !== undefined) {
    return `${e.course}: ${e.fromPct.toFixed(1)}% → ${e.toPct.toFixed(1)}%`;
  }
  if (e.kind === 'graded') {
    return `${e.name} graded${e.scorePct !== undefined ? ` · ${e.scorePct.toFixed(0)}%` : ''} (${e.course})`;
  }
  return `${e.name} marked Missing (${e.course})`;
}

export async function loadChanges(): Promise<ChangeEvent[]> {
  try {
    const result = await browser.storage.local.get(EVENTS_KEY);
    return ((result[EVENTS_KEY] as ChangeEvent[] | undefined) ?? []).slice().reverse(); // newest first
  } catch {
    return [];
  }
}

export function getLastSeen(): number {
  try { return Number(localStorage.getItem(SEEN_KEY) || 0); } catch { return 0; }
}

export function markChangesSeen(): void {
  try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch { /* blocked */ }
}
