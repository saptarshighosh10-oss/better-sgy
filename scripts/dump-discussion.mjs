import fs from 'fs'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'
const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  await page.goto('https://fuhsd.schoology.com/home', { waitUntil: 'domcontentloaded' })
  const html = await page.evaluate(async () => {
    const r = await fetch('/course/8141837049/materials/discussion/view/8385950992', { credentials: 'include', headers: { Accept: 'text/html,application/xhtml+xml' } })
    return r.text()
  })
  fs.writeFileSync('extension/.debug/raw-discussion.html', html)
  console.log('fetched', (html.length/1024).toFixed(0), 'KB')
  // ALSO: the rendered version (post-JS) to compare
  await page.goto('https://fuhsd.schoology.com/course/8141837049/materials/discussion/view/8385950992', { waitUntil: 'networkidle2', timeout: 45000 })
  const rendered = await page.content()
  fs.writeFileSync('extension/.debug/rendered-discussion.html', rendered)
  console.log('rendered', (rendered.length/1024).toFixed(0), 'KB')
} finally { await browser.close() }
