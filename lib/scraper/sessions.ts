import fs from 'fs'
import {
  launchSchoolBrowser,
  hasSavedSession,
  markSessionOk,
  SESSION_MARKER,
} from '../../scripts/lib/browser-profile.mjs'

export type ScrapeTarget = 'schoology' | 'gmail'

/**
 * Schoology and Gmail are scraped through ONE shared persistent Chrome
 * profile (`.school-browser-profile/` — the same one `npm run scrape:*` use)
 * logged into the same Google account: authenticating Schoology via Google
 * SSO authenticates that account's Gmail too. So there's really a single
 * underlying session, not two — `target` is accepted (and ignored) purely to
 * keep call sites' existing per-target shape intact.
 *
 * This replaced an earlier per-target cookie-snapshot-and-replay scheme
 * (`data/{target}-session.json`, loaded into a *fresh* headless browser each
 * run) that Google started silently rejecting — bouncing every headless
 * "refresh" to a sign-in page that the old checks didn't recognize as such
 * (see SCRAPER_NOTES.md, 2026-06-07 "In-app Refresh/Sync now was failing").
 * Reusing the *same* browser/profile across runs — what made the standalone
 * CLI scrapers (scripts/scrape-*.mjs) durable against that — fixes it at the
 * root rather than patching the symptom again.
 */
export function hasSession(_target: ScrapeTarget) {
  return hasSavedSession()
}

export function markSession() {
  markSessionOk()
}

// Forces a fresh login on the next "Connect" without touching the shared
// profile itself — the CLI scrapers rely on that profile too, and the
// underlying Google session usually just gets reused instantly anyway.
export function clearSession(_target: ScrapeTarget) {
  try { fs.unlinkSync(SESSION_MARKER) } catch {}
}

// `headless: true` keeps the old call-site meaning (launchBrowser(true) =
// run hidden) while delegating to the profile launcher's `headed` flag.
export async function launchBrowser(headless: boolean) {
  return launchSchoolBrowser({ headed: !headless })
}
