/**
 * Gmail scraper (school Google account friendly — no OAuth required)
 * Run: npm run scrape:gmail
 *
 * Opens Chrome, lets you log in to Gmail, then scrapes your inbox
 * and saves to data/emails-cache.json in the app's email format.
 */

import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH = path.join(__dirname, '../data/emails-cache.json')
const CHROME    = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(r => rl.question(q, a => { rl.close(); r(a) }))
}

function loadExisting() {
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) } catch { return null }
}

function saveData(emails) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
  const out = { fetchedAt: Date.now(), emails }
  fs.writeFileSync(DATA_PATH, JSON.stringify(out, null, 2))
  console.log(`\n✓ Saved ${emails.length} emails to ${DATA_PATH}`)
}

// ── Priority + class detection (mirrors lib/gmail/fetch-emails.ts) ─────────

function guessPriority(subject, snippet) {
  const text = (subject + ' ' + snippet).toLowerCase()
  const high = ['missing','overdue','urgent','failing','absent','required','immediately','important','test','exam','quiz','deadline']
  const low  = ['newsletter','reminder','optional','opportunity','trip','event','club']
  if (high.some(w => text.includes(w))) return 'High'
  if (low.some(w => text.includes(w)))  return 'Low'
  return 'Med'
}

function guessClass(subject, snippet, senderName) {
  const text = (subject + ' ' + snippet + ' ' + senderName).toLowerCase()
  const map = [
    [/algebra|alg\b|math|calc|trig/,        'Algebra'],
    [/biology|bio\b|lab|genetics|enzyme/,   'Biology'],
    [/english|lit\b|essay|reading|writing/, 'English'],
    [/french|français|bonjour|vocab/,       'French'],
    [/drama|theater|scene|act\b/,           'Drama'],
    [/p\.?e\.?|gym|physical ed|fitness/,    'PE'],
    [/history|social studies|civics/,       'History'],
    [/science|physics|chemistry|chem\b/,    'Science'],
    [/computer|coding|programming/,         'CS'],
  ]
  for (const [re, label] of map) if (re.test(text)) return label
  return null
}

function guessSenderType(email) {
  const student = [/student/i, /\.students\./i, /@gmail\.com$/i, /@yahoo\.com$/i, /@hotmail\.com$/i, /@outlook\.com$/i]
  return student.some(p => p.test(email)) ? 'friend' : 'teacher'
}

// ── Scrape a single inbox page ────────────────────────────────────────────────

async function scrapeInboxPage(page) {
  return await page.evaluate(() => {
    const emails = []

    // Gmail uses tr[jsmodel] or tr[role="row"] for email rows
    const rows = document.querySelectorAll('tr[jsmodel], tr[role="row"], .zA')
    rows.forEach(row => {
      try {
        // Sender
        const senderEl = row.querySelector('.yW span[email], .zF, [data-hovercard-id], .yP')
        const sender   = senderEl?.getAttribute('name') || senderEl?.textContent?.trim() || ''
        const email    = senderEl?.getAttribute('email') || senderEl?.getAttribute('data-hovercard-id') || ''

        // Subject
        const subjectEl = row.querySelector('.bog, .bqe, [data-thread-id] .y6 span')
        const subject   = subjectEl?.textContent?.trim() || ''

        // Snippet
        const snippetEl = row.querySelector('.y2, .bqs')
        const snippet   = snippetEl?.textContent?.trim() || ''

        // Date
        const dateEl = row.querySelector('.xW span, .xW .g3, td.xW')
        const dateStr = dateEl?.getAttribute('title') || dateEl?.textContent?.trim() || ''

        // Unread: unread rows have class 'zE' or 'bold'
        const unread = row.classList.contains('zE') || row.querySelector('.bqe') !== null

        // Thread / message ID from the row's data attributes
        const threadId = row.getAttribute('data-legacy-thread-id') ||
                         row.getAttribute('data-thread-id') ||
                         row.id ||
                         Math.random().toString(36).slice(2)

        if (!subject && !sender) return

        // Parse date string into ISO date
        let isoDate = new Date().toISOString().split('T')[0]
        try {
          const d = new Date(dateStr)
          if (!isNaN(d.getTime())) isoDate = d.toISOString().split('T')[0]
        } catch {}

        emails.push({ threadId, sender, email, subject, snippet, isoDate, unread })
      } catch {}
    })
    return emails
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n━━━ Better Schoology — Gmail Scraper ━━━')
  console.log('Uses your existing Chrome. No passwords stored.\n')

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  })

  const page = await browser.newPage()
  await page.goto('https://mail.google.com', { waitUntil: 'domcontentloaded' })

  console.log('→ Log in to Gmail in the Chrome window that just opened.')
  console.log('  (If you\'re already logged in, just wait for the inbox to load.)')
  await ask('→ Once your inbox is visible, press Enter here to continue...')

  // Make sure we're on the inbox
  const url = page.url()
  if (!url.includes('mail.google.com')) {
    await page.goto('https://mail.google.com/#inbox', { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 3000))
  }

  console.log('\nScraping inbox...')
  await new Promise(r => setTimeout(r, 2000))

  let allEmails = await scrapeInboxPage(page)
  console.log(`  Page 1: ${allEmails.length} emails`)

  // Try to get page 2 for more emails
  const nextBtn = await page.$('[aria-label="Older"], [data-tooltip="Older"], .T-I-atl')
  if (nextBtn && allEmails.length > 0) {
    await nextBtn.click()
    await new Promise(r => setTimeout(r, 2500))
    const page2 = await scrapeInboxPage(page)
    console.log(`  Page 2: ${page2.length} emails`)
    allEmails = [...allEmails, ...page2]
  }

  // Filter out ones with no useful data
  const raw = allEmails.filter(e => e.subject || e.sender)

  if (raw.length === 0) {
    console.log('\n⚠  Could not read emails — Gmail may have loaded differently.')
    console.log('   Try scrolling through your inbox first, then run again.')
    await browser.close()
    return
  }

  // Map to MockEmail format
  const emails = raw.map(e => ({
    id: e.threadId,
    sender: e.sender || e.email,
    senderEmail: e.email,
    senderType: guessSenderType(e.email),
    subject: e.subject,
    snippet: e.snippet.slice(0, 200),
    date: e.isoDate,
    unread: e.unread,
    priority: guessPriority(e.subject, e.snippet),
    detectedClass: guessClass(e.subject, e.snippet, e.sender),
    gmailLink: `https://mail.google.com/mail/u/0/#inbox/${e.threadId}`,
  }))

  // Sort: unread first, then by date desc
  emails.sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1
    return b.date.localeCompare(a.date)
  })

  console.log(`\nTotal: ${emails.length} emails`)
  console.log('Sample:')
  emails.slice(0, 3).forEach(e => console.log(`  [${e.unread ? 'UNREAD' : 'read  '}] ${e.sender} — ${e.subject}`))

  // Safety: never overwrite with fewer emails unless it's clearly a fresh scrape
  const existing = loadExisting()
  const prevCount = existing?.emails?.length ?? 0
  if (emails.length < prevCount * 0.5 && prevCount > 0) {
    console.log(`\n⚠  Only got ${emails.length} emails but had ${prevCount} before.`)
    const keep = await ask('   Save anyway? (y/n) ')
    if (keep.trim().toLowerCase() !== 'y') {
      console.log('Keeping old data.')
      await browser.close()
      return
    }
  }

  saveData(emails)
  await browser.close()
  console.log('\nDone. Your emails are now live in the app.\n')
}

main().catch(e => { console.error(e); process.exit(1) })
