import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const HEADERS = { 'User-Agent': 'better-schoology/1.0 (study app daily-discovery card)' }

export type BookInfo = {
  title:        string
  author:       string | null
  coverUrl:     string | null
  firstPublishYear?: number
  pageUrl?:     string
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')?.trim()
  if (!title) {
    return NextResponse.json({ error: 'missing title' }, { status: 400 })
  }

  try {
    const r = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1&fields=key,title,author_name,cover_i,first_publish_year`,
      { headers: HEADERS, signal: AbortSignal.timeout(5000) }
    )
    if (!r.ok) throw new Error(`Open Library ${r.status}`)
    const data = await r.json()
    const doc = data?.docs?.[0]
    if (!doc) {
      return NextResponse.json<BookInfo>({ title, author: null, coverUrl: null })
    }

    return NextResponse.json<BookInfo>({
      title:    doc.title ?? title,
      author:   doc.author_name?.[0] ?? null,
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      firstPublishYear: doc.first_publish_year,
      pageUrl:  doc.key ? `https://openlibrary.org${doc.key}` : undefined,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
