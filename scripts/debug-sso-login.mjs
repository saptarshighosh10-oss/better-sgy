/**
 * One-off diagnostic: drives loginViaSSO and captures a screenshot before
 * every logged step, plus logs every browser tab/popup that opens or closes.
 * Output goes to data/_debug/sso-steps/ — not part of the normal scrape flow.
 *
 * Run: node scripts/debug-sso-login.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { launchSchoolBrowser } from './lib/browser-profile.mjs'
import { loginViaSSO } from './lib/schoology-login.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEBUG_DIR = path.join(__dirname, '../data/_debug/sso-steps')

fs.mkdirSync(DEBUG_DIR, { recursive: true })
for (const f of fs.readdirSync(DEBUG_DIR)) fs.unlinkSync(path.join(DEBUG_DIR, f))

let step = 0

async function main() {
  const browser = await launchSchoolBrowser({ headed: true })

  browser.on('targetcreated', (target) => {
    console.log(`\n   >>> NEW TAB/POPUP opened: ${target.type()} → ${target.url()}`)
  })
  browser.on('targetdestroyed', (target) => {
    console.log(`\n   >>> TAB/POPUP CLOSED: ${target.type()} → ${target.url()}`)
  })

  const pages = await browser.pages()
  const page = pages[0] ?? (await browser.newPage())

  const log = async (msg) => {
    console.log(msg)
    step += 1
    const n = String(step).padStart(2, '0')
    try {
      await page.screenshot({ path: path.join(DEBUG_DIR, `${n}-${msg.replace(/[^a-z0-9]+/gi, '-').slice(0, 50)}.png`) })
    } catch (e) {
      console.log(`   (screenshot failed — page may have navigated/closed: ${e.message})`)
    }
    console.log(`   [url: ${page.url()}]`)
  }

  try {
    await loginViaSSO(page, { log })
    console.log('\n✓ loginViaSSO reported success')
  } catch (err) {
    console.log(`\n✗ loginViaSSO threw: ${err.message}`)
  }

  console.log(`\nFinal URL: ${page.url()}`)
  try { await page.screenshot({ path: path.join(DEBUG_DIR, 'zz-final.png') }) } catch {}

  console.log(`\nAll open pages:`)
  for (const p of await browser.pages()) console.log(`  - ${p.url()}`)

  await browser.close()
  console.log(`\nScreenshots saved to ${DEBUG_DIR}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
