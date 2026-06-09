/**
 * schoology.content.ts — Phase 0 + Phase 1
 *
 * WXT content script that:
 *  1. Matches any school's Schoology (https://*.schoology.com/*)
 *  2. Creates a Shadow DOM host for isolation
 *  3. Inserts the "Show Original Schoology" escape hatch OUTSIDE React
 *  4. Mounts the React overlay (App) inside the Shadow DOM
 *  5. Hides specific Schoology containers (never document.body)
 *  6. Guards against double-mount
 *  7. [Phase 1] Triggers grade scraping on /grades/grades pages
 *  8. [Phase 1] Runs fetch experiment on non-grades pages
 */

import ReactDOM from 'react-dom/client';
import React from 'react';
import { App } from '../components/App';
import { hideNativeUI, restoreNativeUI, isNativeHidden } from '../lib/dom-takeover';
import { scrapeGradesFromDoc, buildSchoologyData, checkSafetyGuards } from '../lib/scrape-dom';
import { validateSchoologyData } from '../lib/schemas';
import { saveGradeData, loadGradeData, saveScrapeMeta } from '../lib/storage';
import { countAssignments } from '../lib/transform';
import { runFetchExperiment } from '../lib/fetch-experiment';
import type { ScrapeResult } from '../lib/scrape-status';
import { INITIAL_SCRAPE_RESULT } from '../lib/scrape-status';

const MOUNT_ID = '__better-schoology-root__';
const ESCAPE_ID = '__better-schoology-escape__';

/** Global mount counter — used for duplicate detection */
let mountCount = 0;

/** Global scrape result — updated by runScrape, read by React */
let currentScrapeResult: ScrapeResult = { ...INITIAL_SCRAPE_RESULT };

/** React root ref so we can re-render when scrape state changes */
let reactRootRef: ReactDOM.Root | null = null;

function rerender() {
  if (reactRootRef) {
    reactRootRef.render(
      React.createElement(App, { mountCount, scrapeResult: currentScrapeResult })
    );
  }
}

function updateScrapeResult(partial: Partial<ScrapeResult>) {
  currentScrapeResult = { ...currentScrapeResult, ...partial };
  rerender();
}

export default defineContentScript({
  matches: ['https://*.schoology.com/*'],
  runAt: 'document_idle',

  main() {
    console.log('[BS] Content script executing on', window.location.href);

    // ── Single-mount guard ─────────────────────────────────────
    if (document.getElementById(MOUNT_ID)) {
      console.warn('[BS] Mount guard: overlay already exists, skipping.');
      return;
    }

    mountCount++;
    console.log('[BS] Mount count:', mountCount);

    // ── Escape hatch (outside React, in the real DOM) ──────────
    createEscapeHatch();

    // ── Shadow DOM host ────────────────────────────────────────
    const host = document.createElement('div');
    host.id = MOUNT_ID;
    host.style.cssText = 'all: initial; position: relative; z-index: 2147483645;';
    document.body.prepend(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // Inject styles into shadow DOM
    const style = document.createElement('style');
    style.textContent = getShadowStyles();
    shadow.appendChild(style);

    // React mount point inside shadow
    const reactRoot = document.createElement('div');
    reactRoot.id = 'bs-react-root';
    shadow.appendChild(reactRoot);

    // ── Mount React ────────────────────────────────────────────
    reactRootRef = ReactDOM.createRoot(reactRoot);
    reactRootRef.render(
      React.createElement(App, { mountCount, scrapeResult: currentScrapeResult })
    );

    // ── Hide native Schoology UI ───────────────────────────────
    const hiddenCount = hideNativeUI();
    console.log(`[BS] Hidden ${hiddenCount} native container(s)`);

    // ── Phase 1: Scrape trigger ────────────────────────────────
    const isGradesPage = /\/grades\/grades/i.test(window.location.pathname);
    if (isGradesPage) {
      // We're on the grades page — scrape the live DOM
      runScrape();
    } else {
      // Not on grades page — run fetch experiment in background
      runFetchExperimentAsync();
    }
  },
});

// ── Phase 1: Live DOM scrape ─────────────────────────────────────

async function runScrape() {
  try {
    // Step 1: checking_session
    updateScrapeResult({ status: 'checking_session', error: null });
    // In Phase 1, we're already on the page so session is confirmed
    console.log('[BS] Session confirmed (already on Schoology)');

    // Step 2: scraping_live_dom
    updateScrapeResult({ status: 'scraping_live_dom' });
    console.log('[BS] Scraping live DOM...');
    const output = scrapeGradesFromDoc(document);
    console.log(`[BS] Scraped ${output.courses.length} courses, period="${output.gradingPeriod}"`);

    // Step 3: parsing (build full data object)
    updateScrapeResult({ status: 'parsing' });
    const data = buildSchoologyData(output);

    // Step 4: validating
    updateScrapeResult({ status: 'validating' });
    const validation = validateSchoologyData(data);
    if (!validation.success) {
      const errMsg = `Validation failed: ${validation.errors.join('; ')}`;
      console.error('[BS]', errMsg);
      updateScrapeResult({
        status: 'failed',
        error: errMsg,
        courseCount: output.courses.length,
        assignmentCount: countAssignments(output.courses),
        gradingPeriod: output.gradingPeriod,
      });
      await saveScrapeMeta({
        status: 'failed',
        scrapedAt: Date.now(),
        courseCount: output.courses.length,
        assignmentCount: countAssignments(output.courses),
        error: errMsg,
      });
      return;
    }

    // Step 5: safety guards
    const previousData = await loadGradeData();
    const guard = checkSafetyGuards(data, previousData);
    if (!guard.safe) {
      console.warn('[BS] Safety guard triggered:', guard.reason);
      updateScrapeResult({
        status: 'stale',
        error: guard.reason,
        courseCount: output.courses.length,
        assignmentCount: countAssignments(output.courses),
        gradingPeriod: output.gradingPeriod,
      });
      await saveScrapeMeta({
        status: 'stale',
        scrapedAt: Date.now(),
        courseCount: output.courses.length,
        assignmentCount: countAssignments(output.courses),
        error: guard.reason,
      });
      return;
    }

    // Step 6: saving
    updateScrapeResult({ status: 'saving' });
    await saveGradeData(data);
    await saveScrapeMeta({
      status: 'fresh',
      scrapedAt: data.scrapedAt,
      courseCount: data.courses.length,
      assignmentCount: countAssignments(data.courses),
      error: null,
    });

    // Done!
    updateScrapeResult({
      status: 'fresh',
      courseCount: data.courses.length,
      assignmentCount: countAssignments(data.courses),
      gradingPeriod: data.gradingPeriod,
      scrapedAt: data.scrapedAt,
      error: null,
    });
    console.log('[BS] Scrape complete and saved!', {
      courses: data.courses.length,
      assignments: countAssignments(data.courses),
      period: data.gradingPeriod,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[BS] Scrape error:', msg);
    updateScrapeResult({
      status: 'failed',
      error: msg,
    });
    await saveScrapeMeta({
      status: 'failed',
      scrapedAt: Date.now(),
      courseCount: 0,
      assignmentCount: 0,
      error: msg,
    }).catch(() => {});
  }
}

// ── Phase 1: Fetch experiment (non-grades pages) ─────────────────

async function runFetchExperimentAsync() {
  try {
    const result = await runFetchExperiment();
    console.log('[BS] Fetch experiment result:', result);
    updateScrapeResult({
      fetchExperimentResult: result.success ? 'success' : 'failed',
      fetchExperimentNote: result.note,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateScrapeResult({
      fetchExperimentResult: 'failed',
      fetchExperimentNote: `Exception: ${msg}`,
    });
  }
}

// ── Escape Hatch ─────────────────────────────────────────────────

function createEscapeHatch() {
  // Remove previous escape hatch if it exists (e.g. from SPA navigation)
  document.getElementById(ESCAPE_ID)?.remove();

  const btn = document.createElement('button');
  btn.id = ESCAPE_ID;
  btn.textContent = '👁 Show Original Schoology';
  btn.title = 'Toggle between Better Schoology overlay and native Schoology UI';
  btn.style.cssText = `
    all: initial;
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 2147483647;
    background: #1a1a2e;
    color: #e0e0e0;
    border: 1px solid #0f3460;
    border-radius: 8px;
    padding: 8px 16px;
    cursor: pointer;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    transition: background 0.2s, transform 0.1s;
    user-select: none;
  `;

  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#0f3460';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = '#1a1a2e';
  });

  btn.addEventListener('click', () => {
    const host = document.getElementById(MOUNT_ID);

    if (isNativeHidden()) {
      // Restore native UI, hide overlay
      restoreNativeUI();
      if (host) host.style.display = 'none';
      btn.textContent = '✨ Show Better Schoology';
      console.log('[BS] Switched to native Schoology');
    } else {
      // Hide native UI, show overlay
      hideNativeUI();
      if (host) host.style.display = '';
      btn.textContent = '👁 Show Original Schoology';
      console.log('[BS] Switched to Better Schoology overlay');
    }
  });

  document.body.appendChild(btn);
}

// ── Shadow DOM styles ────────────────────────────────────────────

function getShadowStyles(): string {
  return `
    :host {
      all: initial;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color-scheme: dark;
    }

    #bs-react-root {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #e0e0e0;
      line-height: 1.5;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    ::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: #2a3040;
      border-radius: 2px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #3a4060;
    }
  `;
}
