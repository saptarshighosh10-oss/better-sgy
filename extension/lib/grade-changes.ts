/**
 * grade-changes.ts — detect and log per-course grade changes between scrapes.
 *
 * The content script diffs each fresh scrape against the previous one; any course
 * whose percent moved is recorded here (capped, newest first) and surfaced in the
 * side panel + a desktop notification. Pure storage — no DOM, so the side panel
 * (an extension page with no Schoology session) just reads it.
 */
import type { SchoologyData } from './schemas';
import { parseGradeString } from './grade-utils';

export interface GradeChange {
  course: string;
  oldPct: number | null;
  newPct: number | null;
  delta: number; // newPct - oldPct
  ts: number;
}

const KEY = 'bs_grade_changes';
const MAX = 50;

/** Courses present in both snapshots whose percent moved (>= 0.01). */
export function detectGradeChanges(prev: SchoologyData | null, next: SchoologyData): GradeChange[] {
  if (!prev) return [];
  const prevPct = new Map(prev.courses.map((c) => [c.name, parseGradeString(c.grade).percent]));
  const now = Date.now();
  const out: GradeChange[] = [];
  for (const c of next.courses) {
    if (!prevPct.has(c.name)) continue; // newly-appeared course isn't a "change"
    const oldPct = prevPct.get(c.name) ?? null;
    const newPct = parseGradeString(c.grade).percent;
    if (oldPct === null || newPct === null) continue;
    if (Math.abs(newPct - oldPct) < 0.01) continue;
    out.push({ course: c.name, oldPct, newPct, delta: newPct - oldPct, ts: now });
  }
  return out;
}

export async function appendGradeChanges(changes: GradeChange[]): Promise<void> {
  if (!changes.length) return;
  const existing = await loadGradeChanges();
  const merged = [...changes, ...existing].slice(0, MAX);
  await browser.storage.local.set({ [KEY]: merged });
}

export async function loadGradeChanges(): Promise<GradeChange[]> {
  const r = await browser.storage.local.get(KEY);
  return Array.isArray(r[KEY]) ? (r[KEY] as GradeChange[]) : [];
}

export async function clearGradeChanges(): Promise<void> {
  await browser.storage.local.remove(KEY);
}
