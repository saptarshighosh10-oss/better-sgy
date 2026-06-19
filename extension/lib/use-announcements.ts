/**
 * use-announcements.ts
 *
 * Fetches the Schoology announcements feed once per page load and tracks which
 * items the student has already seen. "Seen" is PERSISTENT (localStorage) — the
 * unread badge survives reloads and only clears when the student opens the
 * Announcements page (markAllSeen). That's the "ping that doesn't go away until
 * you check it" behavior.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchInbox, type Announcement, type CourseRef } from './fetch-announcements';

const SEEN_KEY = '__bs_announce_seen__';
const IMPORTANT_KEY = '__bs_announce_important__';
const SEEN_CAP = 400; // keep the seen list bounded

function loadSet(key: string): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSet(key: string, set: Set<string>, cap = Infinity) {
  if (typeof localStorage === 'undefined') return;
  try {
    const arr = cap === Infinity ? Array.from(set) : Array.from(set).slice(-cap);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    /* storage blocked */
  }
}

export interface UseAnnouncements {
  items: Announcement[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  isUnread: (id: string) => boolean;
  markAllSeen: () => void;
  markSeen: (id: string) => void;
  isImportant: (id: string) => boolean;
  toggleImportant: (id: string) => void;
  refresh: () => void;
}

export function useAnnouncements(courses: CourseRef[] = []): UseAnnouncements {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seenRef = useRef<Set<string>>(loadSet(SEEN_KEY));
  const importantRef = useRef<Set<string>>(loadSet(IMPORTANT_KEY));
  // bump forces re-render when a ref-backed set changes (refs don't trigger React)
  const [, bump] = useState(0);

  // Key on the course hrefs so a refetch runs once they arrive (the Class Updates
  // source needs /course/<id> hrefs from the grade scrape).
  const coursesKey = courses.map((c) => c.href).join(',');
  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchInbox(courses);
    setItems(res.items);
    setError(res.success ? null : res.error);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coursesKey]);

  useEffect(() => {
    void load();
    // Re-check periodically so the bell pings when a new assignment/update lands
    // (even while you're on native Schoology). Sequential + retry keeps it gentle.
    const id = setInterval(() => { void load(); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  const isUnread = useCallback((id: string) => !seenRef.current.has(id), []);

  const unreadCount = items.reduce((n, a) => (seenRef.current.has(a.id) ? n : n + 1), 0);

  const markSeen = useCallback((id: string) => {
    if (seenRef.current.has(id)) return;
    seenRef.current.add(id);
    saveSet(SEEN_KEY, seenRef.current, SEEN_CAP);
    bump((n) => n + 1);
  }, []);

  const markAllSeen = useCallback(() => {
    let changed = false;
    for (const a of items) {
      if (!seenRef.current.has(a.id)) {
        seenRef.current.add(a.id);
        changed = true;
      }
    }
    if (changed) {
      saveSet(SEEN_KEY, seenRef.current, SEEN_CAP);
      bump((n) => n + 1);
    }
  }, [items]);

  const isImportant = useCallback((id: string) => importantRef.current.has(id), []);

  const toggleImportant = useCallback((id: string) => {
    if (importantRef.current.has(id)) importantRef.current.delete(id);
    else importantRef.current.add(id);
    saveSet(IMPORTANT_KEY, importantRef.current);
    bump((n) => n + 1);
  }, []);

  return { items, loading, error, unreadCount, isUnread, markAllSeen, markSeen, isImportant, toggleImportant, refresh: load };
}
