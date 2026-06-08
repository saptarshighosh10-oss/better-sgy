/**
 * Thin wrapper around the macOS `security` CLI for storing/retrieving
 * the Schoology Google-account credential in Keychain. Nothing is ever
 * written to disk in plaintext — Keychain handles encryption at rest.
 */

import { execFileSync } from 'child_process'

const SERVICE = 'better-schoology-sso'

export function getCredential(account) {
  try {
    const pw = execFileSync(
      'security',
      ['find-generic-password', '-a', account, '-s', SERVICE, '-w'],
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim()
    return pw || null
  } catch {
    return null
  }
}

export function setCredential(account, password) {
  // -U updates in place if an entry already exists for this account+service
  execFileSync(
    'security',
    ['add-generic-password', '-a', account, '-s', SERVICE, '-w', password, '-U'],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  )
}

export function deleteCredential(account) {
  try {
    execFileSync(
      'security',
      ['delete-generic-password', '-a', account, '-s', SERVICE],
      { stdio: 'ignore' }
    )
    return true
  } catch {
    return false
  }
}

export const KEYCHAIN_SERVICE = SERVICE
