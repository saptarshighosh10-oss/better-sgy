import fs from 'fs'
import path from 'path'
import { launchBrowser, hasSession, markSession, clearSession } from './sessions'
import { loginViaSSO } from '../../scripts/lib/schoology-login.mjs'
import { recordSemester } from './semester-log'

const OUT_PATH   = path.join(process.cwd(), 'data', 'schoology-data.json')
const GRADES_URL = 'https://fuhsd.schoology.com/grades/grades'

export type SchoologyData = {
  scrapedAt: number
  gradingPeriod: string   // e.g. "25-26 T2"
  courses: ScrapedCourse[]
}
export type ScrapedCourse = {
  name: string
  grade: string
  teacher: string
  href: string
  categories: ScrapedCategory[]
}
export type ScrapedCategory = {
  name: string
  weight: string
  assignments: ScrapedAssignment[]
}
export type ScrapedAssignment = {
  name: string
  score: string
  maxGrade: string
  dueDate: string
  /** 'graded' | 'submitted' (pending grade) | 'unsubmitted' */
  status: 'graded' | 'submitted' | 'unsubmitted'
}

function loadExisting(): SchoologyData | null {
  try { return JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')) } catch { return null }
}

// ── Core parser — reads everything from the single grades page ────────────────
async function scrapeAllCourses(page: import('puppeteer-core').Page): Promise<{
  courses: ScrapedCourse[]
  gradingPeriod: string
}> {
  return page.evaluate(() => {
    const SKIP = /hub|counseling|tutorial|advisees?|basics\s+for\s+students/i

    const courses: ScrapedCourse[] = []
    let gradingPeriod = ''

    document.querySelectorAll('.gradebook-course').forEach(courseDiv => {
      const rawTitle = (courseDiv.querySelector('.gradebook-course-title a') as HTMLElement | null)
        ?.textContent?.trim() ?? ''
      if (!rawTitle || SKIP.test(rawTitle)) return

      const m       = rawTitle.match(/^(.+?)\s*-\s*\d+:\s*([A-Za-z,]+(?:\s+[A-Za-z,]+)*)\s+p/i)
      const name    = m ? m[1].trim() : rawTitle.split(/\s*-\s*\d+:|\s*:/)[0].trim()
      const teacher = m ? m[2].trim() : ''

      const courseRow = courseDiv.querySelector('.report-row.course-row')
      const letter    = courseRow?.querySelector('.alpha-grade')?.textContent?.trim() ?? ''
      const pctRaw    = courseRow?.querySelector('.rounded-grade')?.getAttribute('title') ?? ''
      const pct       = pctRaw ? parseFloat(pctRaw) : null
      const grade     = letter
        ? `${letter}${pct !== null && !isNaN(pct) ? ` (${pct.toFixed(2)}%)` : ''}`
        : ''

      const categories: ScrapedCategory[] = []
      let currentCat: ScrapedCategory | null = null

      courseDiv.querySelectorAll('.report-row').forEach(row => {
        const cl = row.classList

        // Schoology renders a hidden "(no grading period)" placeholder section
        // that re-lists every category name with zero assignments — skip it or
        // each course ends up with duplicate empty categories.
        if (cl.contains('hidden')) return

        if (cl.contains('period-row')) {
          // Capture grading period name (e.g. "25-26 T2")
          const periodText = row.querySelector('.title')?.textContent
            ?.replace(/\bGrading Period\b/g, '').trim() ?? ''
          if (periodText && !gradingPeriod) gradingPeriod = periodText

        } else if (cl.contains('category-row')) {
          const rawName = row.querySelector('.title')?.textContent
            ?.replace(/\bCategory\b/g, '').trim() ?? ''
          const weight  = row.querySelector('.percentage-contrib')
            ?.textContent?.replace(/[()]/g, '').trim() ?? ''
          currentCat = { name: rawName, weight, assignments: [] }
          categories.push(currentCat)

        } else if (cl.contains('item-row') && currentCat) {
          const titleEl = row.querySelector('.title')
          const rawName = (titleEl?.querySelector('a') ?? titleEl)?.textContent ?? ''

          // Strip visually-hidden type label and Schoology "not available" note from name
          const aName = rawName
            .replace(/Note:\s*This material[^]*?Schoology\.?/i, '')
            .replace(/\s*(external-tool-link|external-tool)\s*$/i, '')
            .replace(/\s*(test-quiz|test-|assignment|quiz)\s*$/i, '')
            .replace(/^(test-quiz|test-|assignment|quiz)\s*/i, '')
            .trim()
          if (!aName) return

          const scoreEl  = row.querySelector('.rounded-grade')
          const score    = scoreEl?.getAttribute('title') ?? scoreEl?.textContent?.trim() ?? ''
          const maxGrade = row.querySelector('.max-grade')?.textContent
            ?.replace(/^\/\s*/, '').trim() ?? ''

          // Skip items that have no score, no max points, and are marked unavailable
          // (locked materials the teacher hasn't graded through Schoology)
          if (!score && !maxGrade && row.textContent?.includes('not available within Schoology')) return

          const dueDate = row.querySelector('.due-date')?.textContent
            ?.replace(/\bDue\b/gi, '').trim() ?? ''

          // Detect submission state
          const isPending = !!row.querySelector('.grade-pending-icon, .has-dropbox-icon')
          const status: ScrapedAssignment['status'] = score
            ? 'graded'
            : isPending ? 'submitted' : 'unsubmitted'

          currentCat.assignments.push({ name: aName, score, maxGrade, dueDate, status })
        }
      })

      if (name) courses.push({ name, teacher, grade, href: '', categories })
    })

    return { courses, gradingPeriod }
  }) as Promise<{ courses: ScrapedCourse[]; gradingPeriod: string }>
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function connectAndScrapeSchoology(onStatus: (s: string) => void): Promise<void> {
  onStatus('opening_browser')
  const browser = await launchBrowser(false)

  try {
    const page = (await browser.pages())[0] ?? (await browser.newPage())
    onStatus('waiting_login')
    try {
      await loginViaSSO(page, { log: () => {} })
    } catch {
      // Automated SSO failed — window is visible, let the user sign in by hand.
      await page.goto('https://app.schoology.com/login', { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForFunction(
        () => location.hostname.endsWith('schoology.com') && !location.pathname.startsWith('/login'),
        { timeout: 10 * 60 * 1000, polling: 1000 }
      )
    }
    await new Promise(r => setTimeout(r, 2000))
    markSession()
    await runScrape(page, onStatus)
    try {
      await (await import('./scrape-activity')).scrapeActivity(page)
    } catch (e) {
      console.warn('[activity] home page scrape failed:', e instanceof Error ? e.message : e)
    }
  } finally {
    // Must close (not disconnect) so the profile directory is unlocked before
    // the next headless refresh attempts to launch Chrome with the same profile.
    // Session data is on disk in .school-browser-profile/ — closing Chrome
    // does not lose the login.
    try { await browser.close() } catch (e) {
      console.warn('[browser] close error after connect:', e instanceof Error ? e.message : e)
    }
  }
  onStatus('done')
}

export async function headlessScrapeSchoology(onStatus: (s: string) => void): Promise<void> {
  if (!hasSession('schoology')) throw new Error('No session — connect first')

  onStatus('checkingSession')
  const browser = await launchBrowser(true)

  try {
    const page = (await browser.pages())[0] ?? (await browser.newPage())
    try {
      await loginViaSSO(page, { log: () => {} })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // Only force a re-Connect when we're confirmed stuck on an auth page.
      // Transient errors (Google 500, network timeout) must not wipe the
      // session marker — the profile's existing login is still valid.
      const stuckOnAuthPage = /login|accounts\.google\.com|sign[\s-]?in/i.test(msg)
      if (stuckOnAuthPage) clearSession('schoology')
      throw new Error(
        stuckOnAuthPage
          ? 'Session expired — click Connect to sign in again'
          : `Login check failed — try refreshing again (${msg.slice(0, 120)})`
      )
    }

    await runScrape(page, onStatus)
    try {
      await (await import('./scrape-activity')).scrapeActivity(page)
    } catch (e) {
      console.warn('[activity] home page scrape failed:', e instanceof Error ? e.message : e)
    }
  } finally {
    try { await browser.close() } catch (e) {
      console.warn('[browser] close error after headless scrape:', e instanceof Error ? e.message : e)
    }
  }
  onStatus('done')
}

async function runScrape(page: import('puppeteer-core').Page, onStatus: (s: string) => void) {
  onStatus('scraping')
  await page.goto(GRADES_URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise(r => setTimeout(r, 3000))

  onStatus('parsing')
  console.log('[schoology] parsing grades page…')
  const { courses, gradingPeriod } = await scrapeAllCourses(page)
  console.log(`[schoology] found ${courses.length} courses, period="${gradingPeriod}"`)

  if (courses.length === 0) {
    const debugDir = path.join(process.cwd(), 'data')
    fs.mkdirSync(debugDir, { recursive: true })
    fs.writeFileSync(path.join(debugDir, 'schoology-debug.html'), await page.content())
    await page.screenshot({ path: path.join(debugDir, 'schoology-debug.png'), fullPage: false })
    console.warn('[schoology] 0 courses — saved debug HTML + screenshot')
    throw new Error('No courses found on grades page — keeping previous data')
  }

  onStatus('saving')
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  const data: SchoologyData = { scrapedAt: Date.now(), gradingPeriod, courses }
  fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2))
  console.log(`[schoology] saved ${courses.length} courses`)

  const { changed } = recordSemester(gradingPeriod, GRADES_URL)
  if (changed) console.log(`[schoology] semester changed to "${gradingPeriod}"`)
}

export function getSchoologyData(): SchoologyData | null {
  return loadExisting()
}

export function schoologyDataAge(): number | null {
  const d = loadExisting()
  return d ? Date.now() - d.scrapedAt : null
}
