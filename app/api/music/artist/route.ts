import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type ArtistInfo = {
  name: string
  title: string
  description: string | null
  extract: string | null
  thumbnail: string | null
  pageUrl: string | null
}

const MUSIC_HINT = /singer|rapper|musician|band|duo|songwriter|\bDJ\b|producer|composer|orchestra|music project|hip hop|record label|vocalist|guitarist|pianist|drummer|group\b/i

const HEADERS = { 'User-Agent': 'better-schoology/1.0 (study app artist info panel)' }

// Wikipedia full-text search sometimes returns its single "least bad" guess
// for obscure names — e.g. "lil yappa" -> "Naniwa Danshi". Require the result
// title to actually share a word with the query before trusting it.
function overlapsQuery(title: string, name: string): boolean {
  const words = name.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  if (words.length === 0) return true
  const t = title.toLowerCase()
  return words.some(w => t.includes(w))
}

async function searchBestTitle(name: string): Promise<string | null> {
  const r = await fetch(
    `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(name)}&limit=15`,
    { headers: HEADERS, signal: AbortSignal.timeout(4000) }
  )
  if (!r.ok) return null
  const data = await r.json()
  const pages: { title: string; description?: string }[] = data?.pages ?? []
  const relevant = pages.filter(p => overlapsQuery(p.title, name))
  if (relevant.length === 0) return null
  const musicMatch = relevant.find(p => p.description && MUSIC_HINT.test(p.description))
  return (musicMatch ?? relevant[0]).title
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim()
  if (!name) {
    return NextResponse.json({ error: 'missing name' }, { status: 400 })
  }

  try {
    const title = await searchBestTitle(name)
    if (!title) {
      return NextResponse.json<ArtistInfo>({ name, title: name, description: null, extract: null, thumbnail: null, pageUrl: null })
    }
    const r = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      { headers: HEADERS, signal: AbortSignal.timeout(4000) }
    )
    if (!r.ok) {
      return NextResponse.json<ArtistInfo>({ name, title, description: null, extract: null, thumbnail: null, pageUrl: null })
    }
    const data = await r.json()
    return NextResponse.json<ArtistInfo>({
      name,
      title: data?.title ?? title,
      description: data?.description ?? null,
      extract: data?.extract ?? null,
      thumbnail: data?.thumbnail?.source ?? null,
      pageUrl: data?.content_urls?.desktop?.page ?? null,
    })
  } catch {
    return NextResponse.json<ArtistInfo>({ name, title: name, description: null, extract: null, thumbnail: null, pageUrl: null })
  }
}
