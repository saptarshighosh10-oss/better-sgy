/**
 * One-time setup: stores your school Google-account credential in macOS
 * Keychain so the autonomous scraper can log in without you present.
 *
 * Run: node scripts/setup-credentials.mjs
 *
 * The password is typed directly into this terminal (hidden, never echoed)
 * and handed straight to Keychain — it never touches a file, a chat, or
 * any log.
 */

import readline from 'readline'
import { setCredential, deleteCredential, KEYCHAIN_SERVICE } from './lib/keychain.mjs'

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer) }))
}

function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question)
    const stdin = process.stdin
    const wasRaw = stdin.isRaw
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf-8')

    let input = ''
    const onData = (char) => {
      switch (char) {
        case '\n':
        case '\r':
        case '': // Ctrl-D
          stdin.setRawMode(wasRaw ?? false)
          stdin.pause()
          stdin.removeListener('data', onData)
          process.stdout.write('\n')
          resolve(input)
          break
        case '': // Ctrl-C
          process.stdout.write('\n')
          process.exit(130)
          break
        case '': // Backspace
        case '\b':
          if (input.length > 0) {
            input = input.slice(0, -1)
            process.stdout.write('\b \b')
          }
          break
        default:
          input += char
          process.stdout.write('•')
      }
    }
    stdin.on('data', onData)
  })
}

async function main() {
  console.log('\n━━━ Better Schoology — Credential Setup ━━━')
  console.log(`Stores your Schoology Google-account login in macOS Keychain (service: "${KEYCHAIN_SERVICE}").`)
  console.log('Nothing is written to disk — Keychain encrypts it at rest.\n')

  const account = (await ask('School Google account email (e.g. sghosh265@student.fuhsd.org): ')).trim()
  if (!account) {
    console.log('\nNo email entered — aborting.')
    process.exit(1)
  }

  const password = await askHidden('Password (hidden as you type): ')
  if (!password) {
    console.log('\nNo password entered — aborting.')
    process.exit(1)
  }

  deleteCredential(account) // clear any stale entry first so -U has a clean slate
  setCredential(account, password)

  console.log(`\n✓ Saved. The scraper will look up "${account}" in Keychain at run time.`)
  console.log('  You can verify it landed correctly by running:')
  console.log(`  security find-generic-password -a "${account}" -s "${KEYCHAIN_SERVICE}" -w\n`)
}

main().catch((e) => { console.error(e); process.exit(1) })
