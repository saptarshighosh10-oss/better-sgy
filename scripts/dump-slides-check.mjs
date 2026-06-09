import fs from 'fs'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'
const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  await page.goto('https://fuhsd.schoology.com/home', { waitUntil: 'domcontentloaded' })
  const get = (u) => page.evaluate(async (x) => (await fetch(x, { credentials: 'include' })).text(), u)

  // Lit/Writ Daily Agendas folder (from unit6) — find a page inside it
  const folder = await get('https://fuhsd.schoology.com/course/8141837305/materials?f=988622719')
  fs.writeFileSync('extension/.debug/raw-litwrit-agendas.html', folder)
  const pages = [...folder.matchAll(/href="(\/page\/\d+)"[^>]*>([^<]{3,60})/g)].slice(0, 3)
  console.log('agenda items:', pages.map(p => p[1] + ' | ' + p[2]))
  for (const [, href] of pages.slice(0, 2)) {
    const html = await get('https://fuhsd.schoology.com' + href)
    fs.writeFileSync(`extension/.debug/raw-page-${href.split('/').pop()}.html`, html)
    const iframes = [...html.matchAll(/<iframe[^>]+src="([^"]+)"/g)].map(m => m[1].slice(0, 110))
    console.log(href, '→ iframes:', JSON.stringify(iframes, null, 1))
    const glinks = [...html.matchAll(/href="(https:\/\/docs\.google\.com[^"]+)"/g)].map(m => m[1].slice(0, 90))
    console.log('   google links:', glinks.slice(0, 3))
  }
} finally { await browser.close() }
