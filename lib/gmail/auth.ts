import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'

const TOKENS_PATH = path.join(process.cwd(), 'data', 'gmail-tokens.json')
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
  )
}

export function getAuthUrl() {
  const client = createOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  })
}

export type StoredTokens = {
  access_token: string
  refresh_token: string
  expiry_date: number
  token_type: string
  scope: string
}

export function loadTokens(): StoredTokens | null {
  try {
    if (!fs.existsSync(TOKENS_PATH)) return null
    return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'))
  } catch {
    return null
  }
}

export function saveTokens(tokens: StoredTokens) {
  fs.mkdirSync(path.dirname(TOKENS_PATH), { recursive: true })
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2))
}

export function isConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export async function getAuthedClient() {
  const tokens = loadTokens()
  if (!tokens) return null
  const client = createOAuthClient()
  client.setCredentials(tokens)
  // Refresh token if close to expiry (within 5 minutes)
  if (tokens.expiry_date && Date.now() > tokens.expiry_date - 5 * 60 * 1000) {
    try {
      const { credentials } = await client.refreshAccessToken()
      saveTokens(credentials as StoredTokens)
      client.setCredentials(credentials)
    } catch {
      // Refresh failed — user will need to re-auth
      return null
    }
  }
  return client
}
