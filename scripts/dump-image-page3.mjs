import fs from 'fs'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'
const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  // real navigation
  const resp = await page.goto('https://fuhsd.schoology.com/course/8141837520/materials/gp/8411142506', { waitUntil: 'domcontentloaded', timeout: 45000 })
  console.log('NAV status:', resp.status(), 'final:', page.url())
  const html = await page.content()
  fs.writeFileSync('extension/.debug/raw-gp-image-nav.html', html)
  console.log('nav html:', (html.length/1024).toFixed(0), 'KB')
  // retry fetch with Accept header
  const info = await page.evaluate(async () => {
    const r = await fetch('/course/8141837520/materials/gp/8411142527', { credentials: 'include', headers: { 'Accept': 'text/html,application/xhtml+xml' } })
    const t = await r.text()
    return { status: r.status, len: t.length }
  })
  console.log('fetch w/ Accept:', JSON.stringify(info))
} finally { await browser.close() }
