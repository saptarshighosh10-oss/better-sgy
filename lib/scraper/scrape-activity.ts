import fs from 'fs'
import path from 'path'
import { launchBrowser, hasSession } from './sessions'
import { loginViaSSO } from '../../scripts/lib/schoology-login.mjs'
import { recordNewActivity } from './activity-watch'

const ACTIVITY_PATH = path.join(process.cwd(), 'data', 'activity-data.json')
const HOME_URL      = 'https://fuhsd.schoology.com/home'

export type ActivityItem = {
  id:             string
  assignmentName: string
  courseName:     string
  type:           'graded' | 'submitted' | 'missing' | 'upcoming' | 'late'
  score?:         string   // "85 / 100" or "92%" or "18/20"
  dueDate?:       string   // human-readable, e.g. "19 days overdue"
  dueTimestamp?:  number   // actual due date in epoch ms, from Schoology's `data-start` (lets callers sort/compare against real gradebook due dates)
  scrapedAt:      number
}

export type ActivityData = {
  scrapedAt: number
  items:     ActivityItem[]
}

function loadExisting(): ActivityData | null {
  try { return JSON.parse(fs.readFileSync(ACTIVITY_PATH, 'utf-8')) } catch { return null }
}

export function getActivityData(): ActivityData | null {
  return loadExisting()
}

export function activityDataAge(): number | null {
  const d = loadExisting()
  return d ? Date.now() - d.scrapedAt : null
}

// ── Core parser runs in browser context ───────────────────────────────────────
// The home page actually surfaces three real, structured widgets: "Recently
// Completed" (graded work), "To Do" → "OVERDUE" (missing/late work), and
// "Upcoming Events". Earlier versions guessed at generic activity-feed class
// names (`.s-activity-feed`, `.sgy-activity-item`, table-row heuristics, …)
// that don't exist anywhere in the current Schoology theme — hence 0 results
// on every run. These selectors were captured live from the real rendered DOM
// (dumped to data/activity-debug.html) and target those widgets directly.
async function extractActivity(page: import('puppeteer-core').Page): Promise<ActivityItem[]> {
  // "Recently Completed" is collapsed by default — its items don't exist in
  // the DOM until this button is clicked.
  try {
    const btn = await page.$('.recently-completed-list .refresh-button')
    if (btn) {
      await btn.click()
      await page.waitForSelector('.recently-completed-event', { timeout: 8000 }).catch(() => {})
      await new Promise(r => setTimeout(r, 1000))
    }
  } catch {}

  const raw = await page.evaluate(() => {
    const results: Array<{
      assignmentName: string
      courseName: string
      type: string
      score?: string
      dueDate?: string
      dueTimestamp?: number
    }> = []

    // Schoology stamps each event block with `data-start` — the real due
    // date as a Unix timestamp in *seconds*. The visible subtitle is only a
    // relative "N days overdue" string, which can't be sorted/compared
    // against the gradebook's ISO due dates — this gives us a real one.
    const startTimestamp = (el: Element): number | undefined => {
      const raw = el.getAttribute('data-start')
      const n = raw ? parseInt(raw, 10) : NaN
      return isNaN(n) ? undefined : n * 1000
    }

    // Course names show up as e.g. "French 1 - 4110 : AggounI p3 T2 Cupertino…"
    // (event subtitles) or "Biology - 3110 : GeeA p1 T2" (tooltip aria-labels)
    // — keep just the human-readable course name before the section number.
    const courseFromLabel = (label: string): string => {
      const m = label.match(/^([^-]+?)\s*-\s*\d/)
      return (m ? m[1] : label).trim()
    }

    // ── "Recently Completed" → graded work ────────────────────────────────────
    document.querySelectorAll('.recently-completed-list .recently-completed-event').forEach(el => {
      const assignmentName = el.querySelector('.recently-completed-title a')?.textContent?.trim() ?? ''
      if (!assignmentName) return
      const label = el.querySelector('[aria-label]')?.getAttribute('aria-label') ?? ''
      const score = el.querySelector('.recently-completed-grade')?.textContent?.trim()
      results.push({ assignmentName, courseName: courseFromLabel(label), type: 'graded', score: score || undefined })
    })

    // ── "To Do" → "OVERDUE" → missing/late work ───────────────────────────────
    document.querySelectorAll('#overdue-submissions .upcoming-event.course-event').forEach(el => {
      const assignmentName = el.querySelector('.event-title > a')?.textContent?.trim() ?? ''
      if (!assignmentName) return
      const subtitles  = Array.from(el.querySelectorAll('.event-subtitle')).map(s => s.textContent?.trim() ?? '')
      const dueDate    = subtitles.find(s => /overdue/i.test(s))
      const courseName = courseFromLabel(subtitles.find(s => !/overdue/i.test(s)) ?? '')
      results.push({ assignmentName, courseName, type: 'missing', dueDate, dueTimestamp: startTimestamp(el) })
    })

    // ── "Upcoming Events" ──────────────────────────────────────────────────────
    document.querySelectorAll('#upcoming-events .upcoming-list .upcoming-event').forEach(el => {
      const assignmentName = el.querySelector('.event-title > a')?.textContent?.trim() ?? ''
      if (!assignmentName) return
      const subtitles  = Array.from(el.querySelectorAll('.event-subtitle')).map(s => s.textContent?.trim() ?? '')
      const courseName = courseFromLabel(subtitles[subtitles.length - 1] ?? '')
      const dueDate    = subtitles.find(s => /due|overdue/i.test(s))
      results.push({ assignmentName, courseName, type: 'upcoming', dueDate, dueTimestamp: startTimestamp(el) })
    })

    return results
  }) as Array<{ assignmentName: string; courseName: string; type: string; score?: string; dueDate?: string; dueTimestamp?: number }>

  return raw.slice(0, 50).map((item, i): ActivityItem => ({
    id:             `act-${Date.now()}-${i}`,
    assignmentName: item.assignmentName,
    courseName:     item.courseName,
    type:           item.type as ActivityItem['type'],
    score:          item.score,
    dueDate:        item.dueDate,
    dueTimestamp:   item.dueTimestamp,
    scrapedAt:      Date.now(),
  }))
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function scrapeActivity(page: import('puppeteer-core').Page): Promise<void> {
  console.log('[activity] navigating to home page…')
  await page.goto(HOME_URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise(r => setTimeout(r, 4000)) // SPA render time

  const items = await extractActivity(page)
  console.log(`[activity] extracted ${items.length} activity items`)

  // Never overwrite good data with empty results
  const existing = loadExisting()
  if (items.length === 0 && (existing?.items?.length ?? 0) > 0) {
    const debugHtmlPath = path.join(process.cwd(), 'data', 'activity-debug.html')
    fs.writeFileSync(debugHtmlPath, await page.content())
    console.warn('[activity] no items found — keeping existing data; debug HTML saved')
    return
  }

  // Diff against the last snapshot so callers can react to fresh activity
  // (e.g. the scheduler triggering a full grades scrape). Skip the very
  // first run — there's nothing to compare against yet.
  if (existing) {
    const seenIds = new Set(existing.items.map(i => i.id))
    const freshItems = items.filter(i => !seenIds.has(i.id))
    recordNewActivity(freshItems.length)
    if (freshItems.length > 0) {
      console.log(`[activity] ${freshItems.length} new item(s) since last scrape`)
    }
  } else {
    recordNewActivity(0)
  }

  fs.mkdirSync(path.dirname(ACTIVITY_PATH), { recursive: true })
  const data: ActivityData = { scrapedAt: Date.now(), items }
  fs.writeFileSync(ACTIVITY_PATH, JSON.stringify(data, null, 2))
}

export async function headlessScrapeActivity(onStatus: (s: string) => void): Promise<void> {
  if (!hasSession('schoology')) throw new Error('No Schoology session — connect first')
  onStatus('scraping_activity')
  const browser = await launchBrowser(true)
  const page    = (await browser.pages())[0] ?? (await browser.newPage())
  // Reuses the persistent profile's existing session — near-instant when
  // already signed in (the normal steady-state case).
  await loginViaSSO(page, { log: () => {} })

  try {
    await scrapeActivity(page)
  } finally {
    await browser.close()
  }

  onStatus('done')
}
