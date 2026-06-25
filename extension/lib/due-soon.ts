/**
 * due-soon.ts — proactive deadline reminders. Run after each grade poll: find
 * unsubmitted assignments due today or tomorrow and fire a desktop notification
 * once per assignment. Respects the user's settings (toggle + muted courses).
 */
import type { ScrapedCourse } from './schemas';
import { parseDueDate } from './grade-utils';
import { loadSettings } from './settings';

const NOTIFIED_KEY = 'bs_due_notified';
const DAY = 86_400_000;

function startOfToday(): number {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t.getTime();
}

interface DueItem { id: string; name: string; course: string; whenLabel: string; }

/** Unsubmitted assignments due today or tomorrow. */
function collectDueSoon(courses: ScrapedCourse[], mutedCourses: string[]): DueItem[] {
  const today = startOfToday();
  const tomorrow = today + DAY;
  const out: DueItem[] = [];
  for (const course of courses) {
    if (mutedCourses.includes(course.name)) continue;
    for (const cat of course.categories) {
      for (const a of cat.assignments) {
        if (a.status !== 'unsubmitted') continue;
        const due = parseDueDate(a.dueDate);
        if (!due) continue;
        const t = due.getTime();
        if (t !== today && t !== tomorrow) continue;
        out.push({
          id: `${course.name}|${a.name}|${a.dueDate}`,
          name: a.name,
          course: course.name,
          whenLabel: t === today ? 'due today' : 'due tomorrow',
        });
      }
    }
  }
  return out;
}

async function loadNotified(): Promise<Record<string, number>> {
  try {
    const r = await browser.storage.local.get(NOTIFIED_KEY);
    return (r[NOTIFIED_KEY] as Record<string, number>) ?? {};
  } catch {
    return {};
  }
}

export async function runDueSoonCheck(courses: ScrapedCourse[]): Promise<void> {
  const settings = await loadSettings();
  if (!settings.dueSoonReminders) return;

  const items = collectDueSoon(courses, settings.mutedCourses);
  const notified = await loadNotified();

  const fresh = items.filter((it) => !(it.id in notified));
  if (fresh.length) {
    const title = fresh.length === 1 ? 'Assignment due soon' : `${fresh.length} assignments due soon`;
    const message = fresh.slice(0, 4)
      .map((it) => `• ${it.name} — ${it.whenLabel} (${it.course})`)
      .join('\n');
    void browser.notifications.create(`bs-due-${Date.now()}`, {
      type: 'basic',
      iconUrl: (browser.runtime.getURL as (p: string) => string)('/icon/128.png'),
      title,
      message,
      priority: 2,
    });
  }

  // Record what we've now notified, and prune anything whose due day has passed
  // (keys older than 2 days) so the map can't grow unbounded.
  const now = Date.now();
  const next: Record<string, number> = {};
  for (const [id, ts] of Object.entries(notified)) {
    if (now - ts < 2 * DAY) next[id] = ts;
  }
  for (const it of fresh) next[it.id] = now;
  await browser.storage.local.set({ [NOTIFIED_KEY]: next });
}
