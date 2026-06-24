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
import { validateSchoologyData, type SchoologyData } from '../lib/schemas';
import { saveGradeData, loadGradeData, saveScrapeMeta } from '../lib/storage';
import { countAssignments } from '../lib/transform';
import { queuedFetch } from '../lib/sgy-net';
import type { ScrapeResult } from '../lib/scrape-status';
import { INITIAL_SCRAPE_RESULT } from '../lib/scrape-status';
import { appendGradeHistory } from '../lib/grade-history';
import { detectChanges, appendChanges, type ChangeEvent } from '../lib/grade-changes';
import { saveWatchStatus } from '../lib/watch-status';
import { cacheAnnouncements } from '../lib/announcement-cache';
import { T, onThemeChange, getActiveTheme, getAccentColor } from '../lib/theme';
import { parseGradeString, isMissing } from '../lib/grade-utils';

// ── Change reporting & persistence ───────────────────────────────
/**
 * After a successful scrape, mark the watcher healthy and record any activity
 * (grade moves, new/graded assignments), pinging the worker so it can fire a
 * desktop notification even when this tab isn't focused.
 */
async function reportChanges(prev: SchoologyData | null, next: SchoologyData) {
  await saveWatchStatus({ ok: true, ts: Date.now() });
  const events: ChangeEvent[] = detectChanges(prev, next);
  if (!events.length) return;
  await appendChanges(events);
  try { await browser.runtime.sendMessage({ type: 'change', events }); } catch { /* worker asleep is fine */ }
}

/**
 * Map scraped Schoology data → the compact shape the bundled "looks" read from
 * chrome.storage.local['bsgy_live'], and persist it. Real build only — the demo
 * never writes this key so the looks fall back to their built-in sample data.
 * Best-effort: every step is guarded so a bad scrape can't break the save tail.
 */
async function writeLiveData(data: SchoologyData) {
  // Demo builds (wxt --mode demo) must not seed live data — keep the sample look.
  if (import.meta.env.MODE === 'demo') return;
  try {
    const courses = (data.courses ?? []).map((c) => {
      const { letter, percent } = parseGradeString(c.grade);
      let missing = 0;
      try {
        for (const cat of c.categories ?? []) {
          for (const a of cat.assignments ?? []) if (isMissing(a)) missing++;
        }
      } catch { /* missing count is cosmetic */ }
      return {
        name: c.name,
        teacher: c.teacher || '',
        pct: percent,
        letter,
        trend: 'flat' as const,
        missing,
      };
    });
    const graded = courses.map((c) => c.pct).filter((p): p is number => typeof p === 'number');
    const overall = graded.length ? graded.reduce((s, p) => s + p, 0) / graded.length : null;
    // Contract the bundled looks read (see "LIVE DATA INJECTION" in each look):
    //   { overall:number, term:string, courses:[{name,teacher,pct,letter,trend,missing}] }
    const live = {
      overall,
      term: data.gradingPeriod || '',
      courses,
    };
    await browser.storage.local.set({ bsgy_live: live });
  } catch (err) {
    console.error('[BS] writeLiveData failed:', err);
  }
}

/**
 * Shared tail of both scrape paths: persist the fresh data, append history,
 * report any changes to the worker, and record fresh scrape metadata.
 */
async function saveFreshData(previous: SchoologyData | null, data: SchoologyData) {
  await saveGradeData(data);
  await appendGradeHistory(data.courses);
  await reportChanges(previous, data);
  await writeLiveData(data);
  await saveScrapeMeta({
    status: 'fresh',
    scrapedAt: data.scrapedAt,
    courseCount: data.courses.length,
    assignmentCount: countAssignments(data.courses),
    error: null,
  });
}

// ── Module state ─────────────────────────────────────────────────
const MOUNT_ID = '__better-schoology-root__';
const ESCAPE_ID = '__better-schoology-escape__';

/** Global mount counter — used for duplicate detection */
let mountCount = 0;

/** Global scrape result — updated by runScrape, read by React */
let currentScrapeResult: ScrapeResult = { ...INITIAL_SCRAPE_RESULT };

/** React root ref so we can re-render when scrape state changes */
let reactRootRef: ReactDOM.Root | null = null;
/** The shadow-DOM element React mounts into (kept so we can re-mount on return) */
let reactRootEl: HTMLElement | null = null;
/** False while the user is on native Schoology — the extension is fully paused */
let overlayActive = true;

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

// ── Tab favicon — swap Schoology's for the Better SGY mark while the overlay is on ──
const SGY_FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='sgy' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%237c6cfc'/%3E%3Cstop offset='1' stop-color='%235b3df0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='8' fill='url(%23sgy)'/%3E%3Cpath d='M9 20.5L16 11L23 20.5' fill='none' stroke='white' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";
let savedFaviconHrefs: string[] | null = null;
function applySgyFavicon() {
  try {
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
    if (savedFaviconHrefs === null) savedFaviconHrefs = links.map((l) => l.getAttribute('href') || '');
    links.forEach((l) => { if (l.id !== 'bs-favicon') l.remove(); });
    let ours = document.getElementById('bs-favicon') as HTMLLinkElement | null;
    if (!ours) { ours = document.createElement('link'); ours.id = 'bs-favicon'; ours.rel = 'icon'; document.head.appendChild(ours); }
    ours.href = SGY_FAVICON;
  } catch { /* favicon swap is cosmetic — never block the overlay */ }
}
function restoreFavicon() {
  try {
    document.getElementById('bs-favicon')?.remove();
    if (savedFaviconHrefs && savedFaviconHrefs.length) {
      // re-assert Schoology's own icon(s)
      if (!document.querySelector('link[rel~="icon"]')) {
        for (const href of savedFaviconHrefs) {
          const l = document.createElement('link'); l.rel = 'icon'; if (href) l.href = href; document.head.appendChild(l);
        }
      }
    }
  } catch { /* ignore */ }
}

export default defineContentScript({
  matches: ['https://*.schoology.com/*'],
  runAt: 'document_idle',

  main() {
    console.log('[BS] Content script executing on', window.location.href);

    // Remember this school's Schoology origin so the background worker can poll
    // grades on a timer even when no Schoology tab is open (closed-tab watching).
    void browser.storage.local.set({ bs_sgy_origin: location.origin });

    // Push the active theme to storage so the side panel + floating widget (which
    // run in other contexts with their own empty localStorage) can match Schoology.
    const saveThemeSync = () => void browser.storage.local.set({
      bs_theme_sync: { bg: T.bg, text: T.text, primary: T.primary, border: T.border, card: T.card },
      bs_theme_state: { theme: getActiveTheme(), accent: getAccentColor() },
    });
    saveThemeSync();
    onThemeChange(saveThemeSync);

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
    reactRootEl = reactRoot;

    // ── Respect a persisted "deactivated" choice across page navigations ──
    const deactivated = (() => { try { return localStorage.getItem('__bs_deactivated__') === '1'; } catch { return false; } })();
    if (deactivated) {
      overlayActive = false;
      host.style.display = 'none';
      const escBtn = document.getElementById(ESCAPE_ID);
      if (escBtn) escBtn.style.display = 'flex';
      console.log('[BS] Deactivated (persisted) — overlay not mounted; native left intact');
    } else {
      // ── Mount React ────────────────────────────────────────────
      reactRootRef = ReactDOM.createRoot(reactRoot);
      reactRootRef.render(
        React.createElement(App, { mountCount, scrapeResult: currentScrapeResult })
      );

      // ── Hide native Schoology UI ───────────────────────────────
      const hiddenCount = hideNativeUI();
      console.log(`[BS] Hidden ${hiddenCount} native container(s)`);

      // Swap the tab favicon to the Better SGY mark while the overlay is on.
      applySgyFavicon();
    }

    // ── Phase 1: Scrape trigger ────────────────────────────────
    const isGradesPage = /\/grades\/grades/i.test(window.location.pathname);
    if (isGradesPage) {
      // We're on the grades page — scrape the live DOM
      runScrape();
    } else {
      // Not on the grades page — scrape grades in the background from the cached page.
      runBackgroundScrape();
    }

    // Set up periodic automated scraping (every 15 minutes) — paused on native.
    setInterval(() => {
      if (overlayActive) runBackgroundScrape();
    }, 15 * 60 * 1000);
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
    await saveFreshData(previousData, data);

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

async function runBackgroundScrape() {
  console.log('[BS] Running background scrape...');
  try {
    const url = `${location.origin}/grades/grades`;
    const response = await queuedFetch(url, {
      credentials: 'include',
      redirect: 'follow',
    });

    if (!response.ok) {
      console.warn('[BS] Background fetch failed:', response.status);
      return;
    }

    const html = await response.text();
    if (
      html.includes('id="edit-mail"') ||
      html.includes('accounts.google.com') ||
      html.includes('Sign in')
    ) {
      console.warn('[BS] Background fetch returned login/auth page — session expired');
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const output = scrapeGradesFromDoc(doc);

    if (output.courses.length === 0) {
      console.warn('[BS] Background scrape found 0 courses, ignoring');
      return;
    }

    const data = buildSchoologyData(output);
    const validation = validateSchoologyData(data);
    if (!validation.success) {
      console.error('[BS] Background scrape validation failed:', validation.errors.join('; '));
      return;
    }

    const previousData = await loadGradeData();
    const guard = checkSafetyGuards(data, previousData);
    if (!guard.safe) {
      console.warn('[BS] Background scrape safety guard triggered:', guard.reason);
      return;
    }

    await saveFreshData(previousData, data);
    // Cache teacher announcements/updates for the side panel (best-effort).
    void cacheAnnouncements(data.courses);

    // Update current scrape result for React rendering
    updateScrapeResult({
      status: 'fresh',
      courseCount: data.courses.length,
      assignmentCount: countAssignments(data.courses),
      gradingPeriod: data.gradingPeriod,
      scrapedAt: data.scrapedAt,
      error: null,
    });
    console.log('[BS] Background scrape complete and saved!', {
      courses: data.courses.length,
      assignments: countAssignments(data.courses),
      period: data.gradingPeriod,
    });
  } catch (err) {
    console.error('[BS] Background scrape error:', err);
  }
}


// ── Escape Hatch & Global Toggle ─────────────────────────────────

// Expose global toggle to be called from React
(window as any).__toggleSchoologyOverlay = (showOverlay: boolean) => {
  const host = document.getElementById(MOUNT_ID);
  const btn = document.getElementById(ESCAPE_ID);

  if (showOverlay) {
    overlayActive = true;
    try { localStorage.removeItem('__bs_deactivated__'); } catch { /* blocked */ }
    if (host) host.style.display = '';   // show overlay first
    if (btn) btn.style.display = 'none';
    try { hideNativeUI(); } catch (e) { console.warn('[BS] hideNativeUI failed', e); }
    // Re-activate the extension (it was unmounted when we went native).
    // Mount onto a FRESH node: React leaves an internal marker on a container that
    // has held a root before, so calling createRoot() on the same element again can
    // make the first render a no-op (the "press twice to come back" bug). Swapping in
    // a clean element guarantees a single press always restores the overlay.
    if (!reactRootRef) {
      const shadow = host?.shadowRoot ?? null;
      const old = reactRootEl ?? shadow?.querySelector<HTMLElement>('#bs-react-root') ?? null;
      const fresh = document.createElement('div');
      fresh.id = 'bs-react-root';
      if (old && old.parentNode) old.replaceWith(fresh);
      else if (shadow) shadow.appendChild(fresh);
      reactRootEl = fresh;
      reactRootRef = ReactDOM.createRoot(fresh);
      rerender();
    }
    applySgyFavicon();
    console.log('[BS] Switched to Better SGY overlay — reactivated');
  } else {
    overlayActive = false;
    // Persist so the extension STAYS off across page navigations until re-enabled.
    try { localStorage.setItem('__bs_deactivated__', '1'); } catch { /* blocked */ }
    // Hide the overlay + restore native FIRST so "turn off" always works, even if
    // anything below throws.
    if (host) host.style.display = 'none';
    if (btn) btn.style.display = 'flex';
    try { restoreNativeUI(); } catch (e) { console.warn('[BS] restoreNativeUI failed', e); }
    restoreFavicon();   // give Schoology its own tab icon back on native
    // Fully deactivate: unmount React so NOTHING runs (no polling, no animations,
    // no timers) until the user presses "Show Better SGY". Defer one tick —
    // this is triggered from a button INSIDE React, and sync self-unmount glitches.
    if (reactRootRef) {
      const root = reactRootRef;
      reactRootRef = null;
      setTimeout(() => { try { root.unmount(); } catch { /* already gone */ } }, 0);
    }
    console.log('[BS] Switched to native Schoology — extension deactivated');
  }
};

function createEscapeHatch() {
  // Remove previous escape hatch if it exists
  document.getElementById(ESCAPE_ID)?.remove();

  // Tint the button with the user's chosen accent (read from the same key the UI uses).
  const accent = (typeof localStorage !== 'undefined' && localStorage.getItem('__bs_custom_accent__')) || '#c084fc';
  const baseShadow = `0 12px 34px rgba(0,0,0,0.5), 0 0 22px ${accent}26, inset 0 1px 0 rgba(255,255,255,0.06)`;
  const hoverShadow = `0 16px 42px rgba(0,0,0,0.55), 0 0 32px ${accent}45, inset 0 1px 0 rgba(255,255,255,0.09)`;

  const btn = document.createElement('button');
  btn.id = ESCAPE_ID;
  btn.title = 'Toggle back to Better SGY overlay';

  const label = document.createElement('span');
  label.textContent = 'Show Better SGY';
  btn.appendChild(label);

  // Notification badge — pings when new announcements/updates arrive while you're
  // on native Schoology (count fed from React via __bsSetEscapeBadge).
  const badge = document.createElement('span');
  badge.id = 'bs-esc-badge';
  badge.style.cssText = `
    position: absolute; top: -8px; right: -7px; box-sizing: border-box;
    min-width: 20px; height: 20px; padding: 0 5px; border-radius: 9999px;
    background: #ef4444; color: #ffffff;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 10.5px; font-weight: 800; line-height: 1;
    display: none; align-items: center; justify-content: center;
    border: 2px solid #1a1a1a; box-shadow: 0 2px 10px rgba(239,68,68,0.55);
  `;
  btn.appendChild(badge);
  btn.style.cssText = `
    all: initial;
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    display: none; /* hidden by default on startup */
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 11px 18px;
    background: linear-gradient(135deg, #242424, #161616);
    color: #faf9f6;
    border: 1px solid ${accent}66;
    border-radius: 9999px;
    cursor: pointer;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.2px;
    box-shadow: ${baseShadow};
    transition: transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s, border-color 0.22s;
    user-select: none;
  `;

  // 'all: initial' wipes the UA focus outline — restore a visible one for keyboard users
  btn.addEventListener('focus', () => {
    btn.style.outline = '2px solid #3b82f6';
    btn.style.outlineOffset = '2px';
  });
  btn.addEventListener('blur', () => {
    btn.style.outline = 'none';
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-2px)';
    btn.style.boxShadow = hoverShadow;
    btn.style.borderColor = `${accent}aa`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translateY(0)';
    btn.style.boxShadow = baseShadow;
    btn.style.borderColor = `${accent}66`;
  });
  btn.addEventListener('mousedown', () => {
    btn.style.transform = 'translateY(0) scale(0.97)';
  });
  btn.addEventListener('mouseup', () => {
    btn.style.transform = 'translateY(-2px)';
  });

  btn.addEventListener('click', () => {
    // Returning to Better SGY = "viewing" the updates → clear the ping.
    (window as any).__bsAckUpdates?.();
    (window as any).__bsSetEscapeBadge?.(0);
    (window as any).__toggleSchoologyOverlay(true);
  });

  document.body.appendChild(btn);
}

// Let React update the escape-hatch notification badge (new announcements/updates).
(window as any).__bsSetEscapeBadge = (n: number) => {
  const badge = document.getElementById('bs-esc-badge');
  const button = document.getElementById(ESCAPE_ID);
  if (!badge) return;
  if (n > 0) {
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.style.display = 'flex';
    if (button) button.title = `${n} new update${n > 1 ? 's' : ''} in Better SGY`;
  } else {
    badge.style.display = 'none';
    if (button) button.title = 'Toggle back to Better SGY overlay';
  }
};


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
