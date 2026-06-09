import fs from 'fs'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'
const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  await page.goto('https://fuhsd.schoology.com/home', { waitUntil: 'domcontentloaded' })
  const html = await page.evaluate(async () =>
    (await fetch('/course/8141837520/materials/gp/8411142506', { credentials: 'include' })).text())
  fs.writeFileSync('extension/.debug/raw-gp-image.html', html)
  console.log('saved', (html.length/1024).toFixed(0), 'KB')
} finally { await browser.close() }
