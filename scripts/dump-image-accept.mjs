import fs from 'fs'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'
const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  await page.goto('https://fuhsd.schoology.com/home', { waitUntil: 'domcontentloaded' })
  const html = await page.evaluate(async () => {
    const r = await fetch('/course/8141837520/materials/gp/8411142506', { credentials: 'include', headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } })
    return r.text()
  })
  fs.writeFileSync('extension/.debug/raw-gp-image-accept.html', html)
  console.log('saved', (html.length/1024).toFixed(0), 'KB')
} finally { await browser.close() }
