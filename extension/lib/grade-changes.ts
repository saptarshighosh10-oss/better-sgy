/**
 * grade-changes.ts — detect and log activity between scrapes: overall grade moves,
 * new assignments, and newly-graded work. The content script (in-tab) and the
 * service worker (closed-tab) both diff each fresh scrape against the previous one;
 * events are stored newest-first and surfaced in the side panel + notifications.
 *
 * Pure storage — no DOM — so the side panel (no Schoology session) just reads it.
 */
import type { SchoologyData, ScrapedCourse, ScrapedAssignment } from './schemas';
import { parseGradeString, scorePercent } from './grade-utils';

export type ChangeEvent =
  | { kind: 'grade'; course: string; oldPct: number | null; newPct: number | null; delta: number; ts: number }
  | { kind: 'new-assignment'; course: string; name: string; ts: number }
  | { kind: 'graded'; course: string; name: string; pct: number | null; score: string; max: string; ts: number };

const KEY = 'bs_grade_changes';
const MAX = 60;
const MAX_NEW_PER_COURSE = 6; // avoid flooding when a whole category first appears

function byName(c: ScrapedCourse): Map<string, ScrapedAssignment> {
  const m = new Map<string, ScrapedAssignment>();
  for (const cat of c.categories) for (const a of cat.assignments) m.set(a.name, a);
  return m;
}

/** Grade moves, new assignments, and newly-graded work for courses in both snapshots. */
export function detectChanges(prev: SchoologyData | null, next: SchoologyData): ChangeEvent[] {
  if (!prev) return [];
  const ts = Date.now();
  const prevByCourse = new Map(prev.courses.map((c) => [c.name, c]));
  const out: ChangeEvent[] = [];

  for (const c of next.courses) {
    const pc = prevByCourse.get(c.name);
    if (!pc) continue; // newly-appeared course isn't "activity"

    // Overall grade %
    const oldPct = parseGradeString(pc.grade).percent;
    const newPct = parseGradeString(c.grade).percent;
    if (oldPct !== null && newPct !== null && Math.abs(newPct - oldPct) >= 0.01) {
      out.push({ kind: 'grade', course: c.name, oldPct, newPct, delta: newPct - oldPct, ts });
    }

    // Assignment-level activity
    const prevA = byName(pc);
    let newCount = 0;
    for (const cat of c.categories) {
      for (const a of cat.assignments) {
        const before = prevA.get(a.name);
        if (!before) {
          if (newCount < MAX_NEW_PER_COURSE) out.push({ kind: 'new-assignment', course: c.name, name: a.name, ts });
          newCount++;
        } else if (
          (before.status !== 'graded' && a.status === 'graded') ||
          (before.status === 'graded' && a.status === 'graded' && before.score !== a.score && !!a.score)
        ) {
          out.push({ kind: 'graded', course: c.name, name: a.name, pct: scorePercent(a.score, a.maxGrade), score: a.score, max: a.maxGrade, ts });
        }
      }
    }
  }
  return out;
}

export async function appendChanges(events: ChangeEvent[]): Promise<void> {
  if (!events.length) return;
  const existing = await loadChanges();
  const merged = [...events, ...existing].slice(0, MAX);
  await browser.storage.local.set({ [KEY]: merged });
}

export async function loadChanges(): Promise<ChangeEvent[]> {
  const r = await browser.storage.local.get(KEY);
  const raw = Array.isArray(r[KEY]) ? r[KEY] : [];
  // Back-compat: older entries were grade-only with no `kind`.
  return raw.map((e: Record<string, unknown>) =>
    'kind' in e ? (e as ChangeEvent) : ({ kind: 'grade', ...(e as object) } as ChangeEvent),
  );
}

export async function clearChanges(): Promise<void> {
  await browser.storage.local.remove(KEY);
}

const SEEN_KEY = 'bs_changes_seen';

export function getLastSeen(): number {
  try { return parseInt(localStorage.getItem(SEEN_KEY) ?? '0', 10) || 0; } catch { return 0; }
}

export function markChangesSeen(): void {
  try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch {}
}

/**
 * Collapse near-identical events (same kind + course/name within a 60s window)
 * that can pile up when a scrape re-runs. Shared by the side panel + floating widget.
 */
export function dedupeChanges(events: ChangeEvent[], limit = 8): ChangeEvent[] {
  const key = (e: ChangeEvent) =>
    `${e.kind}|${'course' in e ? e.course : ''}|${'name' in e ? e.name : ''}`;
  const seen = new Map<string, number>();
  const out: ChangeEvent[] = [];
  for (const e of events) {
    const k = key(e);
    const last = seen.get(k);
    if (last !== undefined && Math.abs(last - e.ts) < 60_000) continue;
    seen.set(k, e.ts);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}
