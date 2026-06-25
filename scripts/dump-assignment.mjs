import fs from 'fs'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'
const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  // capture API calls the assignment UI makes
  const apiCalls = []
  page.on('request', (r) => {
    const u = r.url()
    if (/api|\/v1\/|submission|dropbox/i.test(u) && !/asset-cdn|files-cdn|analytics|\.js|\.css|\.png/.test(u)) {
      apiCalls.push(r.method() + ' ' + u.slice(0, 140))
    }
  })
  await page.goto('https://fuhsd.schoology.com/assignment/8339829444', { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(r => setTimeout(r, 4000))
  const html = await page.content()
  fs.writeFileSync('extension/.debug/rendered-assignment.html', html)
  console.log('rendered:', (html.length/1024).toFixed(0), 'KB | final:', page.url())
  console.log('\nAPI calls:')
  apiCalls.slice(0, 25).forEach(c => console.log(' ', c))
  // does a submit button exist?
  const btns = await page.evaluate(() =>
    [...document.querySelectorAll('button, a.button, input[type="submit"]')]
      .map(b => b.textContent?.trim()).filter(t => t && /submit|turn in|upload/i.test(t)))
  console.log('\nsubmit-ish buttons:', btns)
} finally { await browser.close() }
