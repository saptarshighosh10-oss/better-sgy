import fs from 'fs'
import path from 'path'
import {
  launchSchoolBrowser,
  hasSavedSession,
  markSessionOk,
  SESSION_MARKER,
} from '../../scripts/lib/browser-profile.mjs'

export type ScrapeTarget = 'schoology' | 'gmail'

// Separate per-service connected flags.
// SESSION_MARKER = shared Chrome profile has a live Google login.
// GMAIL_MARKER   = user has explicitly connected Gmail in Settings.
// This lets Gmail be disconnected independently without wiping the
// Schoology session (and vice versa for Schoology).
const GMAIL_MARKER = path.join(process.cwd(), 'data', '.gmail-connected')

export function hasSession(target: ScrapeTarget) {
  if (!hasSavedSession()) return false
  if (target === 'gmail') return fs.existsSync(GMAIL_MARKER)
  return true
}

export function markSession(target: ScrapeTarget = 'schoology') {
  markSessionOk()
  if (target === 'gmail') {
    fs.mkdirSync(path.dirname(GMAIL_MARKER), { recursive: true })
    fs.writeFileSync(GMAIL_MARKER, Date.now().toString())
  }
}

export function clearSession(target: ScrapeTarget) {
  if (target === 'gmail') {
    // Gmail disconnect: remove Gmail marker only — Schoology session stays intact
    try { fs.unlinkSync(GMAIL_MARKER) } catch {}
  } else {
    // Schoology disconnect: wipe the shared Chrome session marker (full sign-out)
    try { fs.unlinkSync(SESSION_MARKER) } catch {}
    try { fs.unlinkSync(GMAIL_MARKER) } catch {}
  }
}

// `headless: true` keeps the old call-site meaning (launchBrowser(true) =
// run hidden) while delegating to the profile launcher's `headed` flag.
export async function launchBrowser(headless: boolean) {
  return launchSchoolBrowser({ headed: !headless })
}
