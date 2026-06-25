import { hasSession } from './sessions'
import { gmailDataAge } from './scrape-gmail'
import { schoologyDataAge } from './scrape-schoology'
import { isBusy, setState } from './state'
import { getNewActivityInfo } from './activity-watch'

const FIFTEEN_HOURS = 15 * 60 * 60 * 1000

async function maybeScrape(target: 'schoology' | 'gmail', opts: { force?: boolean } = {}) {
  if (isBusy(target)) return
  if (!hasSession(target)) return

  if (!opts.force) {
    const age = target === 'gmail' ? gmailDataAge() : schoologyDataAge()
    const now  = new Date()
    const isAfterMidnight = now.getHours() === 0 && now.getMinutes() < 5
    const isStale = age === null || age > FIFTEEN_HOURS

    if (!isStale && !isAfterMidnight) return
  }

  console.log(`[scheduler] ${opts.force ? 'cascade-' : 'auto-'}scraping ${target}...`)
  setState(target, { status: 'checkingSession', error: null })
  const now = Date.now()
  try {
    if (target === 'gmail') {
      const { headlessScrapeGmail } = await import('./scrape-gmail')
      await headlessScrapeGmail(s => setState('gmail', { status: s as any }))
    } else {
      const { headlessScrapeSchoology } = await import('./scrape-schoology')
      await headlessScrapeSchoology(s => setState('schoology', { status: s as any }))
    }
    setState(target, { status: 'done', lastRun: now, lastSuccess: now, connected: true, error: null })
    console.log(`[scheduler] ${target} succeeded at ${new Date(now).toISOString()}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[scheduler] ${target} failed at ${new Date(now).toISOString()}:`, msg)
    setState(target, { status: 'error', lastRun: now, lastFailed: now, error: msg })
  }
}

// The activity feed is cheap to poll (one page load, no full grade walk).
// Re-check it often, and when it surfaces items we haven't seen before,
// cascade into a full Schoology scrape right away instead of waiting for
// the 15h staleness window — that's the "something new" the grades the
// activity feed is hinting at.
async function checkActivityForChanges() {
  if (!hasSession('schoology')) return
  if (isBusy('schoology')) return

  try {
    const { headlessScrapeActivity } = await import('./scrape-activity')
    await headlessScrapeActivity(() => {})
    const { newCount } = getNewActivityInfo()
    if (newCount > 0) {
      console.log(`[scheduler] ${newCount} new activity item(s) detected — refreshing grades`)
      await maybeScrape('schoology', { force: true })
    }
  } catch (e) {
    console.error('[scheduler] activity check failed:', e instanceof Error ? e.message : e)
  }
}

let initialized = false

export function initScheduler() {
  if (initialized) return
  initialized = true

  // Check every 30 minutes
  setInterval(async () => {
    await maybeScrape('gmail')
    await maybeScrape('schoology')
  }, 30 * 60 * 1000)

  // Lightweight activity poll — catches new assignments/grades fast and
  // cascades into a full scrape when something changes
  setInterval(checkActivityForChanges, 15 * 60 * 1000)

  // Also run once 10 seconds after startup (catches stale data from a restart)
  setTimeout(async () => {
    await maybeScrape('gmail')
    await maybeScrape('schoology')
  }, 10_000)

  setTimeout(checkActivityForChanges, 45_000)

  console.log('[scheduler] initialized — auto-scrapes at midnight, after 15h, and when new activity appears')
}
