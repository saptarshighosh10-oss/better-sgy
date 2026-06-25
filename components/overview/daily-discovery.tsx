'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/use-app-store'
import type { SpacePhoto } from '@/app/api/discovery/space/route'
import type { BookInfo } from '@/app/api/discovery/book/route'

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {children}
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-primary" />
      <span className="text-xs text-muted-foreground">Loading…</span>
    </div>
  )
}

function SpacePhotoCard() {
  const [photo, setPhoto]   = useState<SpacePhoto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/discovery/space')
      .then((r) => r.json())
      .then((d) => setPhoto(d?.imageUrl ? d : null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <CardShell><LoadingRow /></CardShell>
  if (!photo) return null

  return (
    <CardShell>
      <a href={photo.pageUrl} target="_blank" rel="noopener noreferrer" className="block transition-opacity hover:opacity-90">
        <div className="relative">
          <img
            src={photo.imageUrl}
            alt={photo.title}
            className="h-56 w-full object-cover"
            loading="lazy"
          />
          <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            NASA · Picture of the Day{photo.isVideo ? ' · Video' : ''}
          </span>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm font-medium text-card-foreground">{photo.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
            {photo.explanation}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground/60">
            {photo.isVideo ? 'Watch on the source site' : "View on NASA's site"} ↗
          </p>
        </div>
      </a>
    </CardShell>
  )
}

function BookCard() {
  const bookTitle = useAppStore((s) => s.bookTitle)
  const [book, setBook]       = useState<BookInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookTitle.trim()) { setBook(null); setLoading(false); return }
    setLoading(true)
    fetch(`/api/discovery/book?title=${encodeURIComponent(bookTitle)}`)
      .then((r) => r.json())
      .then((d) => setBook(d?.title ? d : null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [bookTitle])

  if (loading) return <CardShell><LoadingRow /></CardShell>
  if (!book) return null

  const cover = book.coverUrl ? (
    <img
      src={book.coverUrl}
      alt=""
      aria-hidden="true"
      className="h-32 w-[88px] shrink-0 rounded-sm object-cover shadow-sm"
      loading="lazy"
    />
  ) : (
    <div className="flex h-32 w-[88px] shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    </div>
  )

  const inner = (
    <div className="flex h-full items-center gap-4 px-4 py-3">
      {cover}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Currently Reading
        </p>
        <p className="mt-1 truncate text-sm font-medium text-card-foreground">{book.title}</p>
        {book.author && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {book.author}{book.firstPublishYear ? ` · ${book.firstPublishYear}` : ''}
          </p>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground/60">
          {book.pageUrl ? 'View on Open Library ↗' : 'via Open Library'}
        </p>
      </div>
    </div>
  )

  return (
    <CardShell>
      {book.pageUrl ? (
        <a href={book.pageUrl} target="_blank" rel="noopener noreferrer" className="block h-full transition-opacity hover:opacity-90">
          {inner}
        </a>
      ) : inner}
    </CardShell>
  )
}

export function DailyDiscovery() {
  const showSpacePhoto = useAppStore((s) => s.showSpacePhoto)
  const showBookCard   = useAppStore((s) => s.showBookCard)

  if (!showSpacePhoto && !showBookCard) return null

  return (
    <section aria-label="Daily discovery" className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Daily Discovery</h2>
        <span className="text-[10px] text-muted-foreground">A little something new each day</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_300px]">
        {showSpacePhoto && <SpacePhotoCard />}
        {showBookCard && <BookCard />}
      </div>
    </section>
  )
}
