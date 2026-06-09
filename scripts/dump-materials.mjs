/**
 * dump-materials.mjs — one-off debug dump for the extension's materials parser.
 * Fetches each course's materials page + its first folder page through the
 * authenticated persistent profile and saves raw HTML to extension/.debug/.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'
import { loginViaSSO } from './lib/schoology-login.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../extension/.debug')
fs.mkdirSync(OUT, { recursive: true })

const COURSES = {
  alg2: '8141837521',
  pe: '8141836977',
  drama: '8141837052',
  litwrit: '8141837305',
  french: '8141836912',
  bio: '8141837125',
}

const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  try {
    await loginViaSSO(page)
  } catch (e) {
    console.log('loginViaSSO failed, attempting raw-click recovery on:', page.url())
    for (let i = 0; i < 6; i++) {
      const url = page.url()
      if (new URL(url).hostname.endsWith('schoology.com') && !url.includes('/login')) break
      if (url.includes('accountchooser')) {
        // Raw CDP mouse click on the account row (synthetic clicks get ignored)
        const box = await page.evaluate(() => {
          const el = [...document.querySelectorAll('li, div[data-identifier]')]
            .find((n) => n.textContent?.includes('sghosh265@student.fuhsd.org'))
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        })
        if (box) await page.mouse.click(box.x, box.y)
      } else if (url.includes('accounts.google.com')) {
        // Consent / continue page — click any visible Continue button
        const box = await page.evaluate(() => {
          const el = [...document.querySelectorAll('button, input[type="submit"]')]
            .find((n) => /continue|next|allow/i.test(n.textContent || n.value || ''))
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        })
        if (box) await page.mouse.click(box.x, box.y)
      }
      await new Promise((r) => setTimeout(r, 5000))
    }
    const finalHost = new URL(page.url()).hostname
    if (!finalHost.endsWith('schoology.com')) {
      await page.screenshot({ path: 'data/_debug/dump-login-stuck.png' })
      throw new Error(`Could not recover login — stuck at ${page.url()}`)
    }
    console.log('✓ recovered — now on', page.url())
  }

  async function dump(label, url) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 })
    const finalUrl = page.url()
    if (!new URL(finalUrl).hostname.endsWith('schoology.com')) {
      console.error(`! ${label}: redirected off-schoology → ${finalUrl}`)
      return null
    }
    const html = await page.content()
    fs.writeFileSync(path.join(OUT, `${label}.html`), html)
    console.log(`✓ ${label} (${(html.length / 1024).toFixed(0)} KB) ${finalUrl}`)
    return html
  }

  for (const [name, id] of Object.entries(COURSES)) {
    const html = await dump(`${name}-top`, `https://fuhsd.schoology.com/course/${id}/materials`)
    if (!html) continue
    // First folder link on the page → dump that folder too
    const m = html.match(new RegExp(`/course/${id}/materials\\?f=(\\d+)`))
    if (m) {
      await dump(`${name}-folder-${m[1]}`, `https://fuhsd.schoology.com/course/${id}/materials?f=${m[1]}`)
    } else {
      console.log(`  (${name}: no folder link found on top page)`)
    }
  }
} finally {
  await browser.close()
}
