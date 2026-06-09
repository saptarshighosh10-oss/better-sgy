import fs from 'fs'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'
const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  await page.goto('https://fuhsd.schoology.com/home', { waitUntil: 'domcontentloaded' })
  const info = await page.evaluate(async () => {
    const r = await fetch('/course/8141837520/materials/gp/8411142506', { credentials: 'include', redirect: 'follow' })
    const t = await r.text()
    return { status: r.status, url: r.url, ct: r.headers.get('content-type'), len: t.length, head: t.slice(0, 300) }
  })
  console.log(JSON.stringify(info, null, 1))
  // also check manual redirect
  const manual = await page.evaluate(async () => {
    const r = await fetch('/course/8141837520/materials/gp/8411142506', { credentials: 'include', redirect: 'manual' })
    return { status: r.status, type: r.type }
  })
  console.log('manual:', JSON.stringify(manual))
  page.on('response', (r) => {
    if (r.status() >= 300 && r.status() < 400) console.log(r.status(), r.url().slice(0,100), '->', (r.headers()['location']||'').slice(0,140))
  })
  await page.evaluate(() => fetch('/course/8141837520/materials/gp/8411142506', { credentials: 'include' }).catch(String))
  await new Promise(r => setTimeout(r, 2500))
} finally { await browser.close() }
