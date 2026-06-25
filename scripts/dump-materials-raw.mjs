/**
 * dump-materials-raw.mjs — fetches pages from INSIDE the page context with
 * fetch(credentials:'include'), exactly like the extension does, and saves
 * the raw (pre-JS) HTML. Also records final URL + content-type for redirects.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../extension/.debug')
fs.mkdirSync(OUT, { recursive: true })

const TARGETS = {
  'raw-alg2-top': 'https://fuhsd.schoology.com/course/8141837521/materials',
  'raw-pe-top': 'https://fuhsd.schoology.com/course/8141836977/materials',
  'raw-alg2-period2': 'https://fuhsd.schoology.com/course/8141837521/materials?f=1000474835',
  'raw-pe-docs': 'https://fuhsd.schoology.com/course/8141836977/materials?f=973810988',
  'raw-drama-exmachina': 'https://fuhsd.schoology.com/course/8141837052/materials?f=994933129',
  'raw-litwrit-unit6': 'https://fuhsd.schoology.com/course/8141837305/materials?f=988622542',
  'raw-gp-lw-syllabus-pdf': 'https://fuhsd.schoology.com/course/8141837301/materials/gp/8176362885',
  'raw-gp-pe-greensheet-doc': 'https://fuhsd.schoology.com/course/8141836970/materials/gp/8202608721',
}

const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  await page.goto('https://fuhsd.schoology.com/home', { waitUntil: 'domcontentloaded', timeout: 45000 })
  if (!new URL(page.url()).hostname.endsWith('schoology.com')) {
    throw new Error('Not logged in: ' + page.url())
  }

  for (const [label, url] of Object.entries(TARGETS)) {
    const result = await page.evaluate(async (u) => {
      const r = await fetch(u, { credentials: 'include', redirect: 'follow' })
      const text = await r.text()
      return { finalUrl: r.url, status: r.status, ct: r.headers.get('content-type'), text }
    }, url)
    fs.writeFileSync(path.join(OUT, `${label}.html`), result.text)
    console.log(`✓ ${label}: ${result.status} ${result.ct} (${(result.text.length / 1024).toFixed(0)} KB)`)
    if (result.finalUrl !== url) console.log(`   redirect → ${result.finalUrl}`)
  }
} finally {
  await browser.close()
}
