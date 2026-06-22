/**
 * settings.ts — user preferences shared across the dashboard, side panel,
 * floating widget, and background worker. Stored in browser.storage.local so
 * every context (incl. the service worker) reads the same values.
 */

/** Which UI skin is active. Persisted so the choice survives panel close. */
export type Edition = 'halo' | 'forge' | 'slate';

export interface Settings {
  /** Master switch for grade-change desktop notifications. */
  notifications: boolean;
  /** Notify the night before / morning of assignments that are due soon. */
  dueSoonReminders: boolean;
  /** Play the little chime when opening the floating panel. */
  chime: boolean;
  /** How often the closed-tab watcher polls, in minutes. */
  pollMinutes: number;
  /** Courses to silence — no notifications for these. */
  mutedCourses: string[];
  /** Active UI edition: 'halo' (default), 'forge' (dense), 'slate' (monochrome). */
  edition: Edition;
}

export const DEFAULT_SETTINGS: Settings = {
  notifications: true,
  dueSoonReminders: true,
  chime: true,
  pollMinutes: 15,
  mutedCourses: [],
  edition: 'halo',
};

const KEY = 'bs_settings';

export async function loadSettings(): Promise<Settings> {
  try {
    const r = await browser.storage.local.get(KEY);
    const raw = (r[KEY] ?? {}) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...raw };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await browser.storage.local.set({ [KEY]: next });
  return next;
}

export async function toggleMutedCourse(course: string): Promise<Settings> {
  const s = await loadSettings();
  const muted = s.mutedCourses.includes(course)
    ? s.mutedCourses.filter((c) => c !== course)
    : [...s.mutedCourses, course];
  return saveSettings({ mutedCourses: muted });
}

/** React to settings changes from any context. Returns an unsubscribe fn. */
export function onSettingsChange(fn: (s: Settings) => void): () => void {
  const handler = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && changes[KEY]) {
      fn({ ...DEFAULT_SETTINGS, ...(changes[KEY].newValue as Partial<Settings>) });
    }
  };
  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
