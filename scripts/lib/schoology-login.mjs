/**
 * Automates the Schoology "SSO Login" flow for Cupertino High School,
 * which is just Google Sign-In under the hood:
 *
 *   app.schoology.com/login → "SSO Login" → search "Cupertino High School"
 *   → pick the FUHSD entry (school ID 2296357277) → Google account chooser
 *   → pick sghosh265@student.fuhsd.org → land on fuhsd.schoology.com
 *
 * On a fresh profile Google will ask for a password; we fill it from
 * Keychain (npm run setup:credentials populates it). On a profile that
 * already has an active Google session for this account (the normal,
 * steady-state case), Google skips straight past that screen.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getCredential } from './keychain.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEBUG_DIR = path.join(__dirname, '../../data/_debug')

export const SCHOOL_NAME = 'Cupertino High School'
export const SCHOOL_ID = '2296357277'
export const GOOGLE_ACCOUNT = 'sghosh265@student.fuhsd.org'

/**
 * Snapshots the page the moment a login step fails — a screenshot plus the
 * raw HTML — so a failure can be diagnosed from data/_debug/ without having
 * to catch the browser in the act or rely on a hand-timed screenshot.
 */
async function captureFailure(page, label) {
  try {
    fs.mkdirSync(DEBUG_DIR, { recursive: true })
    await page.screenshot({ path: path.join(DEBUG_DIR, `login-${label}.png`), fullPage: true })
    fs.writeFileSync(path.join(DEBUG_DIR, `login-${label}.html`), await page.content())
  } catch { /* best-effort — never let debug capture mask the real error */ }
}

/**
 * Schoology keeps the regular-login "Email or Username" field in the DOM
 * (just hidden) when you switch to SSO mode, so a plain `input[type="text"]`
 * selector can grab the wrong, invisible one. This waits for and returns the
 * first *visible* match across a list of selector candidates.
 */
async function waitForVisibleInput(page, selectors, { timeout = 10000 } = {}) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    for (const sel of selectors) {
      const handle = await page.evaluateHandle(
        (s) => [...document.querySelectorAll(s)].find((el) => el.offsetParent !== null) ?? null,
        sel
      )
      const el = handle.asElement()
      if (el) return el
      await handle.dispose()
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`No visible input found for any of: ${selectors.join(', ')}`)
}

/** Finds the first element matching `selector` whose text includes `matchText`, and clicks it. */
async function clickByText(page, selector, matchText, { timeout = 15000 } = {}) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const handle = await page.evaluateHandle(
      (sel, text) => {
        // Google's account chooser often wraps long emails across lines,
        // so raw textContent can contain extra whitespace/line-breaks in
        // the middle of the address — normalize both sides before matching.
        const norm = (s) => s.replace(/\s+/g, ' ').trim()
        const needle = norm(text)
        // <input type="submit"/"button"> elements carry their visible label in
        // `.value` (and have empty textContent), and some icon-only controls
        // only expose a label via aria-label — check all three sources.
        const labelOf = (el) => norm(el.textContent || el.value || el.getAttribute('aria-label') || '')
        const matches = [...document.querySelectorAll(sel)].filter((el) => labelOf(el).includes(needle))
        const visible = matches.filter((el) => el.offsetParent !== null)
        // Prefer real ARIA list options (dropdown rows, account-chooser entries)
        // over generic page chrome — keeps us off footer/nav links that might
        // happen to share a substring with what we're looking for.
        return visible.find((el) => el.matches('[role="option"], [role="menuitem"], [role="link"], [role="button"]'))
          ?? visible[0] ?? matches[0] ?? null
      },
      selector,
      matchText
    )
    const el = handle.asElement()
    if (el) {
      // Puppeteer's mouse-based click() needs a bounding box to compute a
      // "clickable point" — autocomplete rows here are nested flex/wrapper
      // elements that often fail that check ("Node is either not clickable
      // or not an Element"). And some dropdown widgets select on `mousedown`
      // (so the option registers before the input blurs) rather than `click`.
      // Dispatching the full mousedown→mouseup→click sequence ourselves,
      // with coordinates from the element's own rect, sidesteps the bounding-
      // box check while still covering both handler styles.
      await page.evaluate((node) => {
        const r = node.getBoundingClientRect()
        const opts = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }
        for (const type of ['mouseover', 'mousedown', 'mouseup', 'click']) {
          node.dispatchEvent(new MouseEvent(type, opts))
        }
      }, el)
      return true
    }
    await handle.dispose()
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

/**
 * Google's sign-in pages re-render mid-transition (e.g. the moment the email
 * step hands off to the password-challenge step) — grab the input a beat too
 * early and Puppeteer's handle goes stale right as you click/type into it,
 * throwing "Execution context was destroyed, most likely because of a
 * navigation". Re-acquiring a *fresh* handle and retrying the whole
 * find→settle→click→type→submit sequence rides out that race.
 */
async function typeAndSubmit(page, selectors, text, { timeout = 10000, attempts = 3 } = {}) {
  const isStaleContextError = (e) =>
    /Execution context was destroyed|Node is detached from document|Cannot find context/i.test(e.message)

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const field = await waitForVisibleInput(page, selectors, { timeout })
      // Let any in-flight transition finish before touching the field.
      await new Promise((r) => setTimeout(r, 600))
      await field.click({ clickCount: 3 })
      await field.type(text, { delay: 25 })
      await page.keyboard.press('Enter')
      return
    } catch (err) {
      if (attempt === attempts || !isStaleContextError(err)) throw err
      await new Promise((r) => setTimeout(r, 500))
    }
  }
}

async function waitForHostname(page, predicate, timeout) {
  await page.waitForFunction(
    (pred) => new Function('hostname', 'href', `return (${pred})`)(location.hostname, location.href),
    { timeout },
    predicate
  )
}

/**
 * Drives the SSO flow to completion. Throws on any step it can't get
 * through — the caller decides whether to fall back to a visible window
 * for manual intervention.
 */
export async function loginViaSSO(page, { log = console.log } = {}) {
  try {
    await runSsoFlow(page, log)
  } catch (err) {
    await captureFailure(page, 'failure')
    err.message += ` (stuck at ${page.url()} — snapshot saved to data/_debug/login-failure.{png,html})`
    throw err
  }
}

async function runSsoFlow(page, log) {
  log('  → Opening Schoology login...')
  await page.goto('https://app.schoology.com/login', { waitUntil: 'domcontentloaded' })

  // Already logged in from a prior session? Schoology redirects away from /login.
  await new Promise((r) => setTimeout(r, 1000))
  if (!page.url().includes('/login')) {
    log('  → Already signed in (session reused).')
    return
  }

  log('  → Clicking "SSO Login"...')
  if (!(await clickByText(page, 'a, button, span', 'SSO Login'))) {
    throw new Error('Could not find "SSO Login" — Schoology may have changed its login page layout.')
  }

  log(`  → Searching for "${SCHOOL_NAME}"...`)
  const searchInput = await waitForVisibleInput(page, [
    'input[placeholder*="School" i]',
    'input[placeholder*="Postal" i]',
    'input[type="search"]',
    'input[type="text"]',
  ])
  await searchInput.click({ clickCount: 3 })
  await searchInput.type(SCHOOL_NAME, { delay: 35 })

  log(`  → Selecting the FUHSD entry (school ID ${SCHOOL_ID})...`)
  if (!(await clickByText(page, 'li, div, a', SCHOOL_ID))) {
    throw new Error(`Could not find the school entry with ID ${SCHOOL_ID} in the autocomplete dropdown.`)
  }

  // Picking the school doesn't navigate by itself — it collapses the
  // autocomplete and reveals a "Log in" button that kicks off the actual
  // redirect to Google.
  log('  → Clicking "Log in"...')
  if (!(await clickByText(page, 'button, input[type="submit"], input[type="button"]', 'Log in', { timeout: 10000 }))) {
    throw new Error('Could not find the "Log in" button after selecting the school.')
  }

  log('  → Waiting for the Google account chooser...')
  // Schoology already has a valid session cookie for this browser profile?
  // Then clicking "Log in" skips the OAuth handshake entirely and bounces
  // straight back to the Schoology dashboard — never touching google.com.
  // Wait for *either* outcome, or this hangs the full timeout staring at an
  // already-authenticated page that will never become a Google URL.
  await waitForHostname(
    page,
    'hostname.includes("google.com") || (hostname.endsWith("schoology.com") && !href.includes("/login"))',
    20000
  )

  if (!page.url().includes('google.com')) {
    log('  → Already had a valid Schoology session — skipped the Google handshake entirely.')
    return
  }

  log(`  → Picking account ${GOOGLE_ACCOUNT}...`)
  const pickedAccount = await clickByText(page, '[role="link"], [role="option"], div, li, span', GOOGLE_ACCOUNT, { timeout: 6000 })

  if (pickedAccount) {
    // The browser already has an active Google session for this account, so
    // Google shows an account-chooser instead of a fresh sign-in form.
    // Clicking the saved entry completes the OAuth handshake immediately —
    // no password needed, and the chooser tab navigates straight back to
    // Schoology. (Trying to type a password here would chase a target that
    // Google has already replaced/closed — "Protocol error: Target closed".)
    log('  → Account selected from active session — no password needed.')
  } else {
    // Fresh profile — Google has no saved accounts to choose from, so it shows
    // a plain "Sign in" form asking for the email/identifier first.
    log(`  → No saved-account chooser — typing ${GOOGLE_ACCOUNT} into the sign-in form...`)
    // Google's sign-in JS appears to ignore synthetic (non-trusted) clicks on
    // its "Next" button — a bot defense. Enter is a real, trusted CDP keyboard
    // event and Google's sign-in forms submit on it natively (handled inside
    // typeAndSubmit, which also rides out the page's mid-transition re-renders).
    await typeAndSubmit(page, ['input[type="email"]', 'input[autocomplete="username"]', 'input[type="text"]'], GOOGLE_ACCOUNT)

    log('  → Entering password from Keychain...')
    const password = getCredential(GOOGLE_ACCOUNT)
    if (!password) {
      throw new Error(`No Keychain credential for ${GOOGLE_ACCOUNT}. Run "npm run setup:credentials" first.`)
    }
    await typeAndSubmit(page, ['input[type="password"]'], password, { timeout: 20000 })
  }

  log('  → Waiting to land back on Schoology...')
  await waitForHostname(page, 'hostname.endsWith("schoology.com") && !href.includes("/login")', 30000)
  log('  ✓ Logged in.')
}
