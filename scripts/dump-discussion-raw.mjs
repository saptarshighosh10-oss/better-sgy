import fs from 'fs'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'
const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  // Land on the discussion page first (clears WAF), then fetch raw from there
  await page.goto('https://fuhsd.schoology.com/course/8141837049/materials/discussion/view/8385950992', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await new Promise(r => setTimeout(r, 2000))
  const out = await page.evaluate(async () => {
    const r = await fetch(location.href, { credentials: 'include', headers: { Accept: 'text/html,application/xhtml+xml' } })
    const raw = await r.text()
    // also probe the delete confirm page shape (do NOT submit anything)
    const m = document.body.innerHTML.match(/\/comment\/delete\/(\d+)/)
    let del = null
    if (m) {
      const dr = await fetch(m[0], { credentials: 'include', headers: { Accept: 'text/html,application/xhtml+xml' } })
      del = { status: dr.status, url: dr.url, body: (await dr.text()).slice(0, 0) }
      // fetch again to capture the form region only
      const dr2 = await fetch(m[0], { credentials: 'include', headers: { Accept: 'text/html,application/xhtml+xml' } })
      const t = await dr2.text()
      const fi = t.indexOf('<form')
      del.form = fi >= 0 ? t.slice(fi, fi + 1500) : '(no form)'
    }
    return { rawLen: raw.length, raw, del }
  })
  fs.writeFileSync('extension/.debug/raw-discussion.html', out.raw)
  console.log('raw:', (out.rawLen/1024).toFixed(0), 'KB')
  console.log('delete probe:', out.del ? out.del.status + ' ' + out.del.url : 'no delete link found')
  if (out.del) fs.writeFileSync('extension/.debug/delete-form.html', out.del.form)
} finally { await browser.close() }
