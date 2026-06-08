import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const CACHE_PATH = path.join(process.cwd(), 'data', 'space-photo-cache.json')
const HEADERS = { 'User-Agent': 'better-schoology/1.0 (study app daily-discovery card)' }

export type SpacePhoto = {
  date:        string
  title:       string
  explanation: string
  imageUrl:    string
  isVideo:     boolean
  pageUrl:     string
}

// NASA's own page for a given APOD entry lives at apod/apYYMMDD.html
function apodPageUrl(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `https://apod.nasa.gov/apod/ap${y.slice(2)}${m}${d}.html`
}

type Cache = { date: string; photo: SpacePhoto }

function loadCache(): Cache | null {
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) } catch { return null }
}

function todayKey(): string {
  return new Date().toISOString().split('T')[0]
}

// NASA's open APOD endpoint — DEMO_KEY works without signup (just a tighter
// rate limit), which is plenty for one fetch/day cached to disk below.
const APOD_URL = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY'

export async function GET() {
  const today = todayKey()
  const cached = loadCache()
  if (cached && cached.date === today) {
    return NextResponse.json(cached.photo)
  }

  try {
    const r = await fetch(APOD_URL, { headers: HEADERS, signal: AbortSignal.timeout(6000) })
    if (!r.ok) throw new Error(`NASA APOD ${r.status}`)
    const data = await r.json()

    const date = data?.date ?? today
    const photo: SpacePhoto = {
      date,
      title:       data?.title ?? 'Picture of the Day',
      explanation: data?.explanation ?? '',
      imageUrl:    data?.media_type === 'video' ? (data?.thumbnail_url ?? data?.url) : (data?.hdurl ?? data?.url),
      isVideo:     data?.media_type === 'video',
      // For images, NASA's own APOD page has the full caption/credit; for
      // videos the source URL (often YouTube) is more useful to link to.
      pageUrl:     data?.media_type === 'video' ? (data?.url ?? apodPageUrl(date)) : apodPageUrl(date),
    }

    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true })
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ date: today, photo }, null, 2))

    return NextResponse.json(photo)
  } catch (e) {
    // Fall back to yesterday's cached photo rather than showing nothing
    if (cached) return NextResponse.json(cached.photo)
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
