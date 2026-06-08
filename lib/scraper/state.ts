// Module-level singleton — persists across API calls while the server is running

export type ScrapeStatus =
  | 'idle'
  | 'opening_browser'    // headed Connect window is opening
  | 'waiting_login'      // waiting for user to complete login
  | 'checkingSession'    // headless: verifying session, launching browser
  | 'scraping'           // browser navigating to target page
  | 'parsing'            // extracting data from DOM
  | 'saving'             // writing JSON to disk
  | 'done'               // last run succeeded
  | 'error'              // last run failed
  | 'scraping_activity'  // activity-feed-only poll

export type TargetState = {
  status: ScrapeStatus
  lastRun: number | null      // epoch ms of most recent attempt (success or failure)
  lastSuccess: number | null  // epoch ms of last successful scrape
  lastFailed: number | null   // epoch ms of last failed scrape
  error: string | null
  connected: boolean
}

const state: Record<'schoology' | 'gmail', TargetState> = {
  schoology: { status: 'idle', lastRun: null, lastSuccess: null, lastFailed: null, error: null, connected: false },
  gmail:     { status: 'idle', lastRun: null, lastSuccess: null, lastFailed: null, error: null, connected: false },
}

export function getState(target: 'schoology' | 'gmail') {
  return { ...state[target] }
}

export function setState(target: 'schoology' | 'gmail', patch: Partial<TargetState>) {
  Object.assign(state[target], patch)
}

export function isBusy(target: 'schoology' | 'gmail') {
  return ['opening_browser', 'waiting_login', 'checkingSession', 'scraping', 'parsing', 'saving'].includes(state[target].status)
}
