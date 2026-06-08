import fs from 'fs'
import path from 'path'
import type { MockEmail } from '@/lib/types'
import { launchBrowser, hasSession, markSession, clearSession } from './sessions'

const OUT_PATH       = path.join(process.cwd(), 'data', 'emails-cache.json')
const SCHOOLOGY_PATH = path.join(process.cwd(), 'data', 'schoology-data.json')

type CacheFile = { fetchedAt: number; emails: MockEmail[] }
type SchoologyCache = { courses: { name: string; teacher: string }[] }

function loadExisting(): CacheFile | null {
  try { return JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')) } catch { return null }
}

// ── Load real teacher / course names from Schoology scrape ───────────────────
function loadSchoologyContext(): { teacherNames: string[]; courseNames: string[] } {
  try {
    const data: SchoologyCache = JSON.parse(fs.readFileSync(SCHOOLOGY_PATH, 'utf-8'))
    const teacherNames = data.courses
      .map(c => c.teacher.toLowerCase().trim())
      .filter(Boolean)
    const courseNames = data.courses
      .map(c => c.name.toLowerCase().trim())
      .filter(Boolean)
    return { teacherNames, courseNames }
  } catch {
    return { teacherNames: [], courseNames: [] }
  }
}

// ── Spam detection ────────────────────────────────────────────────────────────
// Domains/services known to send marketing or automated mail, not from teachers
const SPAM_SENDER_DOMAINS = new Set([
  'princeton-review.com', 'dribbble.com', 'grammarly.com', 'quillbot.com',
  'kahoot.com', 'duolingo.com', 'coursera.org', 'udemy.com', 'skillshare.com',
  'chegg.com', 'brainly.com', 'khanacademy.org', 'photomath.com',
  'spotify.com', 'netflix.com', 'apple.com', 'amazon.com', 'google.com',
  'youtube.com', 'tiktok.com', 'instagram.com', 'twitter.com', 'facebook.com',
  'discord.com', 'reddit.com', 'twitch.tv', 'steam-powered.com',
  'medium.com', 'substack.com',
])

const SPAM_EMAIL_PATTERNS = [
  /no[._-]?reply/i, /do[._-]not[._-]reply/i,
  /notifications?@/i, /alerts?@/i, /updates?@/i,
  /mailer@/i, /bounce@/i, /postmaster@/i, /automated@/i,
  /newsletter@/i, /promo@/i, /marketing@/i,
  /info@/i, /hello@/i, /team@/i,
  /@inbound\.schoology\.com$/i,  // Schoology forwarded messages are handled separately
]

const SPAM_SUBJECT_PATTERNS = [
  /unsubscribe/i, /newsletter/i, /\bsale\b/i, /\bdeal\b/i, /\boffer\b/i,
  /\bdiscount\b/i, /\bpromo\b/i, /save \$\d+/i, /% off/i,
  /verify your (email|account)/i, /confirm your/i,
  /order (confirmation|receipt|shipped)/i, /invoice #/i, /payment (received|failed)/i,
]

function extractDomain(email: string): string {
  const m = email.match(/@([^@]+)$/)
  if (!m) return ''
  const host = m[1].toLowerCase()
  // Return the registrable domain (last two parts)
  const parts = host.split('.')
  return parts.slice(-2).join('.')
}

function isSpam(emailAddr: string, subject: string, snippet: string): boolean {
  const domain = extractDomain(emailAddr)
  if (SPAM_SENDER_DOMAINS.has(domain)) return true
  if (SPAM_EMAIL_PATTERNS.some(p => p.test(emailAddr))) return true
  if (SPAM_SUBJECT_PATTERNS.some(p => p.test(subject))) return true
  const body = (subject + ' ' + snippet).toLowerCase()
  if (body.includes('list-unsubscribe') || body.includes('view in browser') ||
      body.includes('manage preferences') || body.includes('manage your subscription')) return true
  return false
}

// Schoology inbound messages (teacher → student via Schoology messaging)
function isSchoologyMessage(emailAddr: string): boolean {
  return /@inbound\.schoology\.com$/i.test(emailAddr)
}

// ── Sender type ───────────────────────────────────────────────────────────────
function classifySender(
  emailAddr: string,
  senderName: string,
  subject: string,
  snippet: string,
  teacherNames: string[],
): MockEmail['senderType'] {
  if (isSpam(emailAddr, subject, snippet)) return 'spam'

  const nameLower = senderName.toLowerCase()
  const addrLower = emailAddr.toLowerCase()

  // Schoology platform messages → teacher (forwarded from teacher via Schoology)
  if (isSchoologyMessage(emailAddr)) return 'teacher'

  // Match against real teacher names scraped from Schoology
  if (teacherNames.length > 0) {
    for (const t of teacherNames) {
      const parts = t.split(/[\s.,]+/).filter(p => p.length > 2)
      if (parts.some(p => nameLower.includes(p) || addrLower.includes(p))) return 'teacher'
    }
  }

  // Explicitly school/district domains → teacher
  const schoolDomain = /\.k12\.|fuhsd\.|schoology\.com|\.edu$/i.test(addrLower)
  const studentDomain = /student|\.stu\.|pupil/i.test(addrLower)
  if (schoolDomain && !studentDomain) return 'teacher'

  // Personal email → friend
  if (/@(gmail|yahoo|hotmail|outlook|icloud|me|proton|pm)\.com$/i.test(addrLower))
    return 'friend'

  if (studentDomain) return 'friend'

  // Anything else with an unknown domain is likely spam/marketing
  return 'spam'
}

// ── Class detection using real course names ───────────────────────────────────
function detectClass(subject: string, snippet: string, courseNames: string[]): string | null {
  const text = (subject + ' ' + snippet).toLowerCase()

  // Match against actual scraped course names first
  for (const name of courseNames) {
    const words = name.split(/\s+/).filter(w => w.length > 3)
    if (words.length > 0 && words.every(w => text.includes(w))) return name
  }

  // Fallback keyword map
  const map: [RegExp, string][] = [
    [/algebra|alg\b|\bmath\b|calc|trig/i,    'Algebra'],
    [/biology|bio\b|\blab\b|genetics|enzyme/, 'Biology'],
    [/english|lit\b|essay|reading|writing/i, 'English'],
    [/french|français|bonjour/i,             'French'],
    [/drama|theater|scene/i,                 'Drama'],
    [/p\.?e\.?|gym|physical\s+ed|fitness/i,  'PE'],
    [/history|social\s+studies/i,            'History'],
    [/chemistry|chem\b|physics|science/i,    'Science'],
    [/spanish|español/i,                     'Spanish'],
    [/coding|programming|computer\s+sci/i,   'CS'],
  ]
  for (const [re, label] of map) if (re.test(text)) return label
  return null
}

// ── Priority ──────────────────────────────────────────────────────────────────
function guessPriority(subject: string, snippet: string): 'High' | 'Med' | 'Low' {
  const t = (subject + ' ' + snippet).toLowerCase()
  if (['missing','overdue','urgent','failing','absent','required','test','exam','quiz','deadline'].some(w => t.includes(w))) return 'High'
  if (['newsletter','optional','trip','event','club'].some(w => t.includes(w))) return 'Low'
  return 'Med'
}

// ── Deduplication ─────────────────────────────────────────────────────────────
function deduplicateEmails(emails: MockEmail[]): MockEmail[] {
  const seen = new Map<string, MockEmail>()
  for (const email of emails) {
    // Key: sender address + normalised subject + date (day-level)
    const subjectKey = email.subject.toLowerCase().replace(/^(re|fwd?):\s*/gi, '').trim()
    const key = `${email.senderEmail.toLowerCase()}|${subjectKey}|${email.date}`
    if (!seen.has(key)) {
      seen.set(key, email)
    } else {
      // Keep the unread version if one copy is read and the other isn't
      const existing = seen.get(key)!
      if (email.unread && !existing.unread) seen.set(key, email)
    }
  }
  return [...seen.values()]
}

async function scrapeInbox(
  page: import('puppeteer-core').Page,
  ctx: { teacherNames: string[]; courseNames: string[] },
): Promise<MockEmail[]> {
  const raw = await page.evaluate(() => {
    const emails: {
      threadId: string; sender: string; email: string; subject: string
      snippet: string; isoDate: string; unread: boolean
    }[] = []

    document.querySelectorAll('tr[jsmodel], tr[role="row"], .zA').forEach(row => {
      try {
        const senderEl = row.querySelector<HTMLElement>('.yW span[email], .zF, .yP')
        const sender   = senderEl?.getAttribute('name') || senderEl?.textContent?.trim() || ''
        const email    = senderEl?.getAttribute('email') || senderEl?.getAttribute('data-hovercard-id') || ''
        const subject  = row.querySelector('.bog, .bqe')?.textContent?.trim() || ''
        const snippet  = row.querySelector('.y2, .bqs')?.textContent?.trim() || ''
        const dateEl   = row.querySelector<HTMLElement>('.xW span, .xW .g3')
        const dateStr  = dateEl?.getAttribute('title') || dateEl?.textContent?.trim() || ''
        const unread   = row.classList.contains('zE') || !!row.querySelector('.bqe')
        const threadId = row.getAttribute('data-legacy-thread-id') || row.getAttribute('data-thread-id') || row.id || Math.random().toString(36).slice(2)
        if (!subject && !sender) return
        let isoDate = new Date().toISOString().split('T')[0]
        try { const d = new Date(dateStr); if (!isNaN(d.getTime())) isoDate = d.toISOString().split('T')[0] } catch {}
        emails.push({ threadId, sender, email, subject, snippet, isoDate, unread })
      } catch {}
    })
    return emails
  })

  return raw
    .filter(e => e.subject || e.sender)
    .map(e => ({
      id:            e.threadId,
      sender:        e.sender || e.email,
      senderEmail:   e.email,
      senderType:    classifySender(e.email, e.sender, e.subject, e.snippet, ctx.teacherNames),
      subject:       e.subject,
      snippet:       e.snippet.slice(0, 200),
      date:          e.isoDate,
      unread:        e.unread,
      priority:      guessPriority(e.subject, e.snippet),
      detectedClass: detectClass(e.subject, e.snippet, ctx.courseNames),
      gmailLink:     `https://mail.google.com/mail/u/0/#inbox/${e.threadId}`,
    } satisfies MockEmail))
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function connectAndScrapeGmail(onStatus: (s: string) => void): Promise<void> {
  onStatus('opening_browser')
  // Same persistent profile as Schoology — already signed in via Google SSO.
  const browser = await launchBrowser(false)

  try {
    const page = (await browser.pages())[0] ?? (await browser.newPage())
    await page.goto('https://mail.google.com', { waitUntil: 'domcontentloaded' })
    onStatus('waiting_login')
    await page.waitForFunction(
      () => window.location.hostname === 'mail.google.com',
      { timeout: 5 * 60 * 1000 }
    )
    await new Promise(r => setTimeout(r, 2500))
    markSession()
    await runScrape(page, onStatus)
  } finally {
    // Close (not disconnect) so the profile directory is unlocked before the
    // next headless refresh. Session lives on disk in .school-browser-profile/.
    try { await browser.close() } catch (e) {
      console.warn('[browser] close error after gmail connect:', e instanceof Error ? e.message : e)
    }
  }
  onStatus('done')
}

export async function headlessScrapeGmail(onStatus: (s: string) => void): Promise<void> {
  if (!hasSession('gmail')) throw new Error('No session — connect first')

  onStatus('checkingSession')
  const browser = await launchBrowser(true)

  try {
    const page = (await browser.pages())[0] ?? (await browser.newPage())
    await page.goto('https://mail.google.com/#inbox', { waitUntil: 'networkidle2', timeout: 30000 })

    // A rejected session cookie redirects to accounts.google.com whose URL
    // contains `continue=https://mail.google.com/...` — a substring check is
    // fooled. Check the actual hostname.
    if (new URL(page.url()).hostname !== 'mail.google.com') {
      clearSession('gmail')
      throw new Error('Session expired — click Connect to sign in again')
    }

    // Gmail is a heavy SPA — networkidle2 can fire before inbox rows render.
    await page.waitForSelector('tr.zA, tr[role="row"]', { timeout: 20000 }).catch(() => {})
    await new Promise(r => setTimeout(r, 1000))

    await runScrape(page, onStatus)
  } finally {
    try { await browser.close() } catch (e) {
      console.warn('[browser] close error after headless gmail:', e instanceof Error ? e.message : e)
    }
  }
  onStatus('done')
}

async function runScrape(page: import('puppeteer-core').Page, onStatus: (s: string) => void) {
  onStatus('scraping')
  const ctx = loadSchoologyContext()
  console.log(`[gmail] schoology context: ${ctx.teacherNames.length} teachers, ${ctx.courseNames.length} courses`)

  let emails = await scrapeInbox(page, ctx)
  console.log(`[gmail] page 1: ${emails.length} emails`)

  for (let p = 2; p <= 6 && emails.length > 0; p++) {
    const next = await page.$('[aria-label="Older"], .T-I-atl').catch(() => null)
    if (!next) break
    try { await next.click() } catch { break }
    await new Promise(r => setTimeout(r, 2500))
    const pageEmails = await scrapeInbox(page, ctx)
    const seenIds = new Set(emails.map(e => e.id))
    const fresh = pageEmails.filter(e => !seenIds.has(e.id))
    console.log(`[gmail] page ${p}: ${pageEmails.length} rows, ${fresh.length} new`)
    if (fresh.length === 0) break
    emails = [...emails, ...fresh]
  }

  onStatus('parsing')
  const before = emails.length
  emails = deduplicateEmails(emails)
  console.log(`[gmail] deduped: ${before} → ${emails.length} emails`)
  emails.sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1
    return b.date.localeCompare(a.date)
  })

  const existing = loadExisting()
  const prevCount = existing?.emails?.length ?? 0

  // Never overwrite good data with an empty or drastically smaller result.
  if (emails.length === 0 && prevCount > 0) {
    const debugDir = path.join(process.cwd(), 'data')
    fs.mkdirSync(debugDir, { recursive: true })
    fs.writeFileSync(path.join(debugDir, 'gmail-debug.html'), await page.content())
    await page.screenshot({ path: path.join(debugDir, 'gmail-debug.png'), fullPage: false }).catch(() => {})
    console.warn(`[gmail] 0 emails from ${page.url()} — keeping ${prevCount} cached; debug saved`)
    throw new Error(`Got 0 emails (had ${prevCount}) — keeping old data`)
  }
  if (emails.length < prevCount * 0.5 && prevCount > 5) {
    throw new Error(`Only got ${emails.length} emails (had ${prevCount}) — keeping old data`)
  }

  onStatus('saving')
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify({ fetchedAt: Date.now(), emails }, null, 2))
  console.log(`[gmail] saved ${emails.length} emails`)
}

export function gmailDataAge(): number | null {
  const d = loadExisting()
  return d ? Date.now() - d.fetchedAt : null
}
