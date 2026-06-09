import fs from 'fs'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'
const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  await page.goto('https://fuhsd.schoology.com/course/8141837049/materials/discussion/view/8385950992', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.comment, .discussion-card, textarea', { timeout: 20000 }).catch(() => {})
  await new Promise(r => setTimeout(r, 3000))
  const rendered = await page.content()
  fs.writeFileSync('extension/.debug/rendered-discussion.html', rendered)
  console.log('rendered', (rendered.length/1024).toFixed(0), 'KB | final:', page.url())
} finally { await browser.close() }
