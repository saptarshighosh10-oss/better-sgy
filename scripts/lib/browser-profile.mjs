/**
 * Shared persistent Chrome profile for the school Google account
 * (sghosh265@student.fuhsd.org). Logging in once here authenticates
 * both Schoology (via Google SSO) and Gmail for that same account —
 * scrape-schoology.mjs and scrape-gmail.mjs both launch through this
 * so they reuse one session instead of each demanding their own login.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
export const PROFILE_DIR = path.join(__dirname, '../../.school-browser-profile')
export const SESSION_MARKER = path.join(PROFILE_DIR, '.last-login-ok')

export function hasSavedSession() {
  return fs.existsSync(SESSION_MARKER)
}

export function markSessionOk() {
  fs.mkdirSync(PROFILE_DIR, { recursive: true })
  fs.writeFileSync(SESSION_MARKER, new Date().toISOString())
}

/**
 * `headed: true` opens a visible window — used for the first-ever login
 * (so the user is present for any Google "verify it's you" prompt) and
 * as a fallback when automated login fails. Subsequent runs go headless,
 * reusing the cookies/session already stored in PROFILE_DIR.
 */
export async function launchSchoolBrowser({ headed = false } = {}) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true })
  return puppeteer.launch({
    executablePath: CHROME,
    headless: headed ? false : 'new',
    userDataDir: PROFILE_DIR,
    defaultViewport: headed ? null : { width: 1280, height: 900 },
    args: [
      // Suppresses the native "Sign in to Chrome?" interception bubble that
      // Chrome shows after a Google web sign-in — it's a browser-chrome
      // dialog (not page DOM), so automation can't dismiss it otherwise.
      '--disable-features=DiceWebSigninInterceptionFeature',
      // Killing Chrome (vs. a clean quit) leaves the profile marked as an
      // "unclean shutdown", and on relaunch Chrome shows a native
      // "Restore pages?" bubble that blocks everything — including Puppeteer's
      // own page lookups — until a human clicks it away. These flags tell
      // Chrome to skip that prompt and just continue without restoring.
      '--hide-crash-restore-bubble',
      '--disable-session-crashed-bubble',
      '--disable-infobars',
      '--no-first-run',
      ...(headed ? ['--start-maximized'] : []),
    ],
  })
}
