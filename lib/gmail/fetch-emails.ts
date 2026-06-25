import { google } from 'googleapis'
import type { MockEmail } from '@/lib/types'
import { getAuthedClient } from './auth'
import fs from 'fs'
import path from 'path'

const CACHE_PATH = path.join(process.cwd(), 'data', 'emails-cache.json')
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

type EmailCache = {
  fetchedAt: number
  emails: MockEmail[]
}

function loadCache(): EmailCache | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null
    const c: EmailCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
    if (Date.now() - c.fetchedAt > CACHE_TTL_MS) return null
    return c
  } catch {
    return null
  }
}

function saveCache(emails: MockEmail[]) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true })
  fs.writeFileSync(CACHE_PATH, JSON.stringify({ fetchedAt: Date.now(), emails }, null, 2))
}

function guessPriority(subject: string, snippet: string): 'High' | 'Med' | 'Low' {
  const text = (subject + ' ' + snippet).toLowerCase()
  const highWords = ['missing', 'overdue', 'urgent', 'failing', 'absent', 'required', 'immediately', 'important', 'test', 'exam', 'quiz', 'deadline']
  const lowWords = ['newsletter', 'reminder', 'optional', 'opportunity', 'trip', 'event', 'club']
  if (highWords.some(w => text.includes(w))) return 'High'
  if (lowWords.some(w => text.includes(w))) return 'Low'
  return 'Med'
}

function guessClass(subject: string, snippet: string, senderName: string): string | null {
  const text = (subject + ' ' + snippet + ' ' + senderName).toLowerCase()
  const map: [RegExp, string][] = [
    [/algebra|alg\b|math|calc|trig/i, 'Algebra'],
    [/biology|bio\b|lab|genetics|enzyme/i, 'Biology'],
    [/english|lit\b|essay|reading|writing/i, 'English'],
    [/french|français|bonjour|vocab/i, 'French'],
    [/drama|theater|scene|act\b/i, 'Drama'],
    [/p\.?e\.?|gym|physical ed|fitness|sport/i, 'PE'],
    [/history|social studies|civics/i, 'History'],
    [/science|physics|chemistry|chem\b/i, 'Science'],
    [/computer|coding|programming/i, 'CS'],
  ]
  for (const [re, label] of map) {
    if (re.test(text)) return label
  }
  return null
}

function guessSenderType(fromEmail: string): 'teacher' | 'friend' {
  // Student emails often have student/students in the domain or are personal Gmail/etc
  const studentPatterns = [/student/i, /\.students\./i, /@gmail\.com$/i, /@yahoo\.com$/i, /@hotmail\.com$/i, /@outlook\.com$/i]
  if (studentPatterns.some(p => p.test(fromEmail))) return 'friend'
  return 'teacher'
}

function parseFrom(from: string): { name: string; email: string } {
  // "First Last <email@domain.com>" or just "email@domain.com"
  const m = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (m) return { name: m[1].replace(/"/g, '').trim(), email: m[2].trim() }
  return { name: from.trim(), email: from.trim() }
}

function fmtDate(internalDate: string | null | undefined): string {
  if (!internalDate) return new Date().toISOString().split('T')[0]
  return new Date(parseInt(internalDate)).toISOString().split('T')[0]
}

export async function fetchGmailEmails(): Promise<MockEmail[] | null> {
  // Return cache if fresh
  const cached = loadCache()
  if (cached) return cached.emails

  const auth = await getAuthedClient()
  if (!auth) return null

  const gmail = google.gmail({ version: 'v1', auth })

  // Fetch up to 30 recent emails from inbox (important/starred or from non-personal senders)
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 30,
    q: 'in:inbox -category:promotions -category:social',
  })

  const messages = listRes.data.messages ?? []
  if (messages.length === 0) return []

  const emails: MockEmail[] = []

  for (const msg of messages) {
    if (!msg.id) continue
    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      })

      const headers = detail.data.payload?.headers ?? []
      const get = (name: string) => headers.find(h => h.name === name)?.value ?? ''

      const from = parseFrom(get('From'))
      const subject = get('Subject') || '(no subject)'
      const snippet = detail.data.snippet ?? ''
      const isUnread = (detail.data.labelIds ?? []).includes('UNREAD')
      const senderType = guessSenderType(from.email)

      emails.push({
        id: msg.id,
        sender: from.name || from.email,
        senderEmail: from.email,
        senderType,
        subject,
        snippet: snippet.slice(0, 200),
        date: fmtDate(detail.data.internalDate),
        unread: isUnread,
        priority: guessPriority(subject, snippet),
        detectedClass: guessClass(subject, snippet, from.name),
        gmailLink: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
      })
    } catch {
      // Skip malformed messages
    }
  }

  // Sort: unread first, then by date desc
  emails.sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1
    return b.date.localeCompare(a.date)
  })

  saveCache(emails)
  return emails
}

export function clearEmailCache() {
  try { fs.unlinkSync(CACHE_PATH) } catch {}
}
