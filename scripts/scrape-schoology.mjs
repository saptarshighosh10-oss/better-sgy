/**
 * Schoology grade scraper — autonomous edition
 * Run: npm run scrape:schoology
 *
 * Logs in via Schoology's Google SSO automatically (using the persistent
 * school browser profile + Keychain credential — see setup-credentials.mjs),
 * pulls grades + assignments, and saves them to data/schoology-data.json.
 *
 * First run opens a visible window in case Google needs you to confirm
 * something. After that it runs fully headless, reusing the saved session.
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'
import { launchSchoolBrowser, hasSavedSession, markSessionOk } from './lib/browser-profile.mjs'
import { loginViaSSO } from './lib/schoology-login.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH  = path.join(__dirname, '../data/schoology-data.json')
const DEBUG_DIR  = path.join(__dirname, '../data/_debug')

function ask(q) {
  // No TTY (e.g. launched headless from a LaunchAgent or backgrounded) means
  // there's nobody to answer — `rl.question` would just hang forever waiting
  // on stdin EOF. Skip the prompt so the caller's error surfaces instead.
  if (!process.stdin.isTTY) {
    console.log(`${q}(no terminal attached — skipping manual fallback)`)
    return Promise.resolve('')
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((r) => rl.question(q, (a) => { rl.close(); r(a) }))
}

function loadExisting() {
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) } catch { return null }
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
  console.log(`\n✓ Saved to ${DATA_PATH}`)
}

function dumpDebugHtml(name, html) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true })
  const file = path.join(DEBUG_DIR, `${name}.html`)
  fs.writeFileSync(file, html)
  return file
}

async function waitFor(page, selector, timeout = 15000) {
  try { await page.waitForSelector(selector, { timeout }); return true }
  catch { return false }
}

// ── Scrape helpers ────────────────────────────────────────────────────────────
//
// Selectors below are ported from lib/scraper/scrape-schoology.ts — the
// proven, tuned parser the app's API route actually relies on (verified
// against real Schoology HTML, unlike the old generic-fallback strategies
// here, which mismatched DOM levels and produced garbage). Every page we
// visit also gets dumped to data/_debug/*.html for re-tuning if Schoology's
// markup ever shifts.

async function scrapeAllCourses(page) {
  await waitFor(page, '.gradebook-course', 8000)

  const html = await page.content()
  dumpDebugHtml('grades-list', html)

  return await page.evaluate(() => {
    const SKIP = /hub|counseling|tutorial|advisees?|basics\s+for\s+students/i
    const courses = []
    let gradingPeriod = ''

    document.querySelectorAll('.gradebook-course').forEach((courseDiv) => {
      const rawTitle = courseDiv.querySelector('.gradebook-course-title a')?.textContent?.trim() ?? ''
      if (!rawTitle || SKIP.test(rawTitle)) return

      // Titles look like "Algebra 2/Trig - 2320: StubbsA p2 T2" — pull the
      // course name and teacher out of that "- <period>: <teacher> p<N>" shape.
      const m = rawTitle.match(/^(.+?)\s*-\s*\d+:\s*([A-Za-z,]+(?:\s+[A-Za-z,]+)*)\s+p/i)
      const name = m ? m[1].trim() : rawTitle.split(/\s*-\s*\d+:|\s*:/)[0].trim()
      const teacher = m ? m[2].trim() : ''

      const courseRow = courseDiv.querySelector('.report-row.course-row')
      const letter = courseRow?.querySelector('.alpha-grade')?.textContent?.trim() ?? ''
      const pctRaw = courseRow?.querySelector('.rounded-grade')?.getAttribute('title') ?? ''
      const pct = pctRaw ? parseFloat(pctRaw) : null
      const grade = letter
        ? `${letter}${pct !== null && !isNaN(pct) ? ` (${pct.toFixed(2)}%)` : ''}`
        : ''

      const categories = []
      let currentCat = null

      // Each course's grade tree is a flat list of `.report-row`s distinguished
      // by class — period header, category header, then its assignment rows —
      // so a single pass with a "current category" pointer reconstructs the tree.
      courseDiv.querySelectorAll('.report-row').forEach((row) => {
        const cl = row.classList

        // Schoology renders a hidden "(no grading period)" placeholder section
        // that re-lists every category name with zero assignments — skip it or
        // each course ends up with duplicate empty categories.
        if (cl.contains('hidden')) return

        if (cl.contains('period-row')) {
          const periodText = row.querySelector('.title')?.textContent?.replace(/\bGrading Period\b/g, '').trim() ?? ''
          if (periodText && !gradingPeriod) gradingPeriod = periodText

        } else if (cl.contains('category-row')) {
          const rawName = row.querySelector('.title')?.textContent?.replace(/\bCategory\b/g, '').trim() ?? ''
          const weight = row.querySelector('.percentage-contrib')?.textContent?.replace(/[()]/g, '').trim() ?? ''
          currentCat = { name: rawName, weight, assignments: [] }
          categories.push(currentCat)

        } else if (cl.contains('item-row') && currentCat) {
          const titleEl = row.querySelector('.title')
          const rawName = (titleEl?.querySelector('a') ?? titleEl)?.textContent ?? ''

          // Strip visually-hidden type labels ("...assignment", "...discussion")
          // and Schoology's "not available" annotation from the assignment name.
          const aName = rawName
            .replace(/Note:\s*This material[^]*?Schoology\.?/i, '')
            .replace(/\s*(external-tool-link|external-tool)\s*$/i, '')
            .replace(/\s*(test-quiz|test-|assignment|quiz)\s*$/i, '')
            .replace(/^(test-quiz|test-|assignment|quiz)\s*/i, '')
            .trim()
          if (!aName) return

          const scoreEl = row.querySelector('.rounded-grade')
          const score = scoreEl?.getAttribute('title') ?? scoreEl?.textContent?.trim() ?? ''
          const maxGrade = row.querySelector('.max-grade')?.textContent?.replace(/^\/\s*/, '').trim() ?? ''

          // Skip locked/unavailable materials the teacher hasn't graded through Schoology
          if (!score && !maxGrade && row.textContent?.includes('not available within Schoology')) return

          const dueDate = row.querySelector('.due-date')?.textContent?.replace(/\bDue\b/gi, '').trim() ?? ''
          const isPending = !!row.querySelector('.grade-pending-icon, .has-dropbox-icon')
          const status = score ? 'graded' : isPending ? 'submitted' : 'unsubmitted'

          currentCat.assignments.push({ name: aName, score, maxGrade, dueDate, status })
        }
      })

      if (name) courses.push({ name, teacher, grade, href: '', categories })
    })

    return { courses, gradingPeriod }
  })
}

async function scrapeOverdue(page, baseOrigin) {
  // The "To Do → Overdue" panel on the Schoology home feed lists missing
  // work across all courses — exactly what the dashboard's "missing" badges
  // need, without having to infer it from due dates per-course.
  await page.goto(`${baseOrigin}/home`, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, 1500))
  dumpDebugHtml('home-todo', await page.content())

  return await page.evaluate(() => {
    const items = []
    // Each overdue item is a `.upcoming-event` block inside #overdue-submissions:
    // an `.event-title a` (assignment name + link), two `.event-subtitle` spans
    // ("N days overdue" then the course name), and a `.submission-infotip` with
    // the full "This was due on ..." text — much more precise than guessing at
    // "any link near the word overdue", which previously matched page chrome.
    document.querySelectorAll('#overdue-submissions .upcoming-event').forEach((item) => {
      const link = item.querySelector('.event-title a')
      const name = link?.textContent?.trim() ?? ''
      if (!name) return

      const subtitles = [...item.querySelectorAll('.event-subtitle')].map((s) => s.textContent?.trim() ?? '')
      const overdueBy = subtitles[0] ?? ''
      const courseName = subtitles[1] ?? ''
      const dueDate = item.querySelector('.submission-infotip .infotip-content')?.textContent
        ?.replace(/^\s*This was due on\s*/i, '').trim() ?? ''

      items.push({ name, courseName, overdueBy, dueDate, href: link?.href ?? '' })
    })
    return items
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const firstRun = !hasSavedSession()
  console.log('\n━━━ Better Schoology — Grade Scraper ━━━')
  console.log(firstRun
    ? 'First run — opening a visible window in case Google needs you to confirm sign-in.\n'
    : 'Reusing saved session — running headless.\n')

  let browser = await launchSchoolBrowser({ headed: firstRun })
  // Reuse the browser's initial tab instead of always creating a new one —
  // a fresh launch with a previously-open profile can leave Chrome mid
  // session-restore, where Target.createTarget (newPage) hangs waiting on
  // a browser that's still settling. The first tab is always there already.
  let page = (await browser.pages())[0] ?? (await browser.newPage())

  try {
    await loginViaSSO(page, { log: (m) => console.log(m) })
  } catch (err) {
    console.log(`\n⚠  Automated login failed: ${err.message}`)
    if (!firstRun) {
      // Retry once, visibly, in case the saved session went stale
      console.log('   Retrying with a visible window so you can step in if needed...')
      await browser.close()
      browser = await launchSchoolBrowser({ headed: true })
      page = (await browser.pages())[0] ?? (await browser.newPage())
      await page.goto('https://app.schoology.com/login', { waitUntil: 'domcontentloaded' })
    }
    console.log('   Log in manually in the open window (use SSO Login → Cupertino High School → your account).')
    await ask('→ Once you see your Schoology home feed, press Enter here to continue... ')
  }

  // Don't trust a session we never actually confirmed — a failed automated
  // attempt that fell through to the (skipped, no-TTY) manual prompt would
  // otherwise stamp "session ok" on a profile that's still logged out, which
  // then makes the *next* run wrongly skip straight to headless.
  const loggedIn = !page.url().includes('/login') && new URL(page.url()).hostname.endsWith('schoology.com')
  if (loggedIn) {
    markSessionOk()
  } else {
    console.log(`\n⚠  Not logged in (stuck at ${page.url()}) — not marking session as OK.`)
    await browser.close()
    return
  }

  const baseOrigin = new URL(page.url()).origin
  console.log(`\nNavigating to grades (${baseOrigin})...`)
  await page.goto(`${baseOrigin}/grades/grades`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1500))

  const { courses, gradingPeriod } = await scrapeAllCourses(page)
  console.log(`Found ${courses.length} course(s), grading period "${gradingPeriod}".`)

  if (courses.length === 0) {
    console.log('\n⚠  Could not find any courses automatically.')
    console.log(`   Raw HTML saved to ${DEBUG_DIR}/grades-list.html — send that over and selectors can be tightened.`)
    await browser.close()
    return
  }

  courses.forEach((c) => console.log(`  - ${c.name}  ${c.grade}  (${c.categories.length} categories — ${c.teacher})`))

  console.log('\nChecking overdue/missing work...')
  const overdue = await scrapeOverdue(page, baseOrigin)
  console.log(`Found ${overdue.length} overdue item(s).`)

  const existing = loadExisting()
  const prevCount = existing?.courses?.length ?? 0

  // A course name that still carries an assignment-type suffix means the
  // selectors matched the wrong DOM level — that's *worse* than "fewer
  // courses than before" (it's actively wrong, not just incomplete), so it
  // gets its own check rather than slipping past the count comparison below.
  const looksLikeAssignment = (name) => /(assignment|discussion|test-quiz|quiz)$/i.test(name)
  const badCourse = courses.find((c) => looksLikeAssignment(c.name))

  if (badCourse) {
    console.log(`\n⚠  Parsed course name "${badCourse.name}" looks like an assignment title, not a course —`)
    console.log('   selectors likely matched the wrong DOM level. Keeping old data.')
    console.log(`   Raw HTML saved to ${DEBUG_DIR}/grades-list.html — compare it against the .gradebook-course selectors in scrapeAllCourses().`)
  } else if (courses.length < prevCount && prevCount > 0) {
    console.log(`\n⚠  Only got ${courses.length} courses but had ${prevCount} before. Keeping old data.`)
    console.log('   Delete data/schoology-data.json manually if you want to force a refresh.')
  } else {
    saveData({
      scrapedAt: new Date().toISOString(),
      source: 'schoology',
      gradingPeriod,
      courses,
      overdue,
      _previousCourses: existing?.courses ?? null,
    })
  }

  console.log(`\nDebug HTML for every page visited is in ${DEBUG_DIR}/ — useful if any of the parsed data above looks off.`)

  await browser.close()
  console.log('\nDone. Restart the dev server to see your real grades.\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
