/**
 * announcement-cache.ts — content-script-only cache of teacher announcements/updates
 * so the side panel (an extension page with no Schoology session) can show them.
 *
 * The fetchers use SGY_ORIGIN + cookies, which only exist in the content script, so
 * we fetch here on the scrape poll and stash a trimmed list in storage. Best-effort:
 * any failure just leaves the previous cache in place.
 */
import type { ScrapedCourse } from './schemas';
import { fetchAnnouncements, fetchCourseUpdates, type Announcement, type CourseRef } from './fetch-announcements';

const KEY = 'bs_announcements_cache';
const MAX = 30;

export async function loadCachedAnnouncements(): Promise<Announcement[]> {
  const r = await browser.storage.local.get(KEY);
  return Array.isArray(r[KEY]) ? (r[KEY] as Announcement[]) : [];
}

export async function cacheAnnouncements(courses: ScrapedCourse[]): Promise<void> {
  try {
    const refs: CourseRef[] = courses.map((c) => ({ name: c.name, href: c.href }));
    const results = await Promise.allSettled([fetchAnnouncements(), fetchCourseUpdates(refs)]);
    const items: Announcement[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.success) items.push(...r.value.items);
    }
    if (!items.length) return;
    // De-dup by id, newest first, capped.
    const seen = new Set<string>();
    const merged = items
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
      .slice(0, MAX);
    await browser.storage.local.set({ [KEY]: merged });
  } catch {
    /* best-effort */
  }
}
