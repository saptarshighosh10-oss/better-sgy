/**
 * pages.ts — canonical Page type and metadata shared across ExtRouter,
 * FloatingNav, QuickNav, and SettingsPage.
 */

export type Page =
  | 'overview'
  | 'grades'
  | 'assignments'
  | 'calendar'
  | 'materials'
  | 'game'
  | 'announcements'
  | 'nostalgia'
  | 'settings';

/** Pages that appear in the tab order (settings is a utility page, not cycled). */
export const ORDERABLE_PAGES: readonly string[] = [
  'overview', 'grades', 'assignments', 'calendar', 'materials', 'announcements', 'nostalgia', 'game',
];

export const PAGE_LABELS: Record<string, string> = {
  overview: 'Overview',
  grades: 'Grades',
  assignments: 'Assignments',
  calendar: 'Calendar',
  materials: 'Materials',
  announcements: 'Announcements',
  nostalgia: 'Nostalgia',
  game: 'Arcade',
  settings: 'Settings',
};
