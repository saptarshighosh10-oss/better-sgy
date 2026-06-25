import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { MockEmail } from '@/lib/types'

const CACHE_PATH = path.join(process.cwd(), 'data', 'emails-cache.json')
const CACHE_TTL  = 5 * 60 * 1000 // 5 minutes

type CacheFile = { fetchedAt: number; emails: MockEmail[] }

export async function GET() {
  try {
    if (!fs.existsSync(CACHE_PATH)) {
      return NextResponse.json({ status: 'not_authed', emails: null })
    }
    const cache: CacheFile = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
    if (!Array.isArray(cache.emails) || cache.emails.length === 0) {
      return NextResponse.json({ status: 'not_authed', emails: null })
    }
    const stale = Date.now() - cache.fetchedAt > CACHE_TTL
    return NextResponse.json({
      status: 'ok',
      emails: cache.emails,
      stale,
      fetchedAt: cache.fetchedAt,
    })
  } catch {
    return NextResponse.json({ status: 'error', emails: null }, { status: 500 })
  }
}

// DELETE clears the cache so the next scrape is forced
export async function DELETE() {
  try { fs.unlinkSync(CACHE_PATH) } catch {}
  return NextResponse.json({ ok: true })
}
