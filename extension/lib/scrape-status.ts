/**
 * scrape-status.ts — Phase 1
 *
 * Scrape lifecycle status type and transition helpers.
 * Used by the content script and debug panel.
 */

export type ScrapeStatus =
  | 'idle'
  | 'checking_session'
  | 'scraping_live_dom'
  | 'fetching_grade_page'
  | 'parsing'
  | 'validating'
  | 'saving'
  | 'fresh'
  | 'stale'
  | 'failed';

export interface ScrapeResult {
  status: ScrapeStatus;
  courseCount: number;
  assignmentCount: number;
  gradingPeriod: string;
  error: string | null;
  scrapedAt: number | null;
  /** Details about what the fetch experiment found */
  fetchExperimentResult: 'untested' | 'success' | 'failed' | 'partial';
  fetchExperimentNote: string;
}

export const INITIAL_SCRAPE_RESULT: ScrapeResult = {
  status: 'idle',
  courseCount: 0,
  assignmentCount: 0,
  gradingPeriod: '',
  error: null,
  scrapedAt: null,
  fetchExperimentResult: 'untested',
  fetchExperimentNote: '',
};

/** Human-readable label for each status */
export function statusLabel(s: ScrapeStatus): string {
  const labels: Record<ScrapeStatus, string> = {
    idle: 'Idle',
    checking_session: 'Checking session…',
    scraping_live_dom: 'Scraping live DOM…',
    fetching_grade_page: 'Fetching grade page…',
    parsing: 'Parsing…',
    validating: 'Validating…',
    saving: 'Saving…',
    fresh: '✅ Fresh',
    stale: '⚠️ Stale',
    failed: '❌ Failed',
  };
  return labels[s];
}

/** Whether this status represents a terminal (done) state */
export function isTerminal(s: ScrapeStatus): boolean {
  return s === 'fresh' || s === 'stale' || s === 'failed';
}
