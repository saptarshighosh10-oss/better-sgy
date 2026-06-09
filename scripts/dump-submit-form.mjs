import fs from 'fs'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'
const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  await page.goto('https://fuhsd.schoology.com/assignment/8339829444/info', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await new Promise(r => setTimeout(r, 1500))
  const html = await page.evaluate(async () => {
    const r = await fetch('/assignment/8339829444/dropbox/submit', { credentials: 'include', headers: { Accept: 'text/html,application/xhtml+xml' } })
    return r.text()
  })
  fs.writeFileSync('extension/.debug/raw-submit-form.html', html)
  console.log('saved', (html.length/1024).toFixed(0), 'KB')
} finally { await browser.close() }
