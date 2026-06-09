/**
 * fetch-experiment.ts — Phase 1
 *
 * Experiment: can we fetch /grades/grades from a content script on a
 * different Schoology page and parse it with DOMParser?
 *
 * If this works, future phases could scrape grades from any Schoology page,
 * not just /grades/grades.
 *
 * If it fails (CORS, auth cookie issues, etc.), we document it and do NOT
 * depend on it.
 */

import { scrapeGradesFromDoc } from './scrape-dom';
import type { ScrapeOutput } from './scrape-dom';

export interface FetchExperimentResult {
  success: boolean;
  note: string;
  data: ScrapeOutput | null;
}

/**
 * Attempt to fetch the grades page via same-origin fetch and parse with DOMParser.
 *
 * This is an EXPERIMENT. The result is informational only.
 * Phase 1 does NOT depend on this working.
 */
export async function runFetchExperiment(): Promise<FetchExperimentResult> {
  const url = `${location.origin}/grades/grades`;

  try {
    console.log('[BS] Fetch experiment: attempting', url);
    const response = await fetch(url, {
      credentials: 'include',  // send cookies
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        success: false,
        note: `HTTP ${response.status} ${response.statusText}`,
        data: null,
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return {
        success: false,
        note: `Unexpected content-type: ${contentType}`,
        data: null,
      };
    }

    const html = await response.text();

    // Check if we got redirected to a login page
    if (
      html.includes('id="edit-mail"') || // Schoology login form
      html.includes('accounts.google.com') ||
      html.includes('Sign in')
    ) {
      return {
        success: false,
        note: 'Response appears to be a login/auth page — session cookies may not be sent',
        data: null,
      };
    }

    // Parse with DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Attempt to scrape from the parsed document
    const scrapeOutput = scrapeGradesFromDoc(doc);

    if (scrapeOutput.courses.length === 0) {
      return {
        success: false,
        note: `Fetched HTML (${html.length} bytes) but found 0 courses — DOM structure may differ or page is not the grades page`,
        data: scrapeOutput,
      };
    }

    return {
      success: true,
      note: `Fetched and parsed ${scrapeOutput.courses.length} courses via fetch+DOMParser`,
      data: scrapeOutput,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[BS] Fetch experiment failed:', msg);
    return {
      success: false,
      note: `Fetch failed: ${msg}`,
      data: null,
    };
  }
}
