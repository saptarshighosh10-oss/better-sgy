'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type SongTrack = { title: string; artist: string; album: string; artworkUrl?: string } | null
export type MiniTrack  = { title: string; artist: string }
export type Player     = 'music' | 'spotify' | null

export async function fetchArtistBio(artist: string, signal: AbortSignal): Promise<string | null> {
  try {
    const primary = artist.split(/[,&]|\bfeat\.|\bft\./i)[0].trim()
    const r = await fetch(`/api/music/artist?name=${encodeURIComponent(primary)}`, { signal })
    if (!r.ok) return null
    const data = await r.json()
    const extract: string = data.extract ?? ''
    return extract || null
  } catch {
    return null
  }
}

const BARS = [6, 11, 15, 9, 17, 13, 7, 16, 10, 14, 8, 12, 6, 13, 10]

export type SongInfoPanelProps = {
  isOpen: boolean
  onClose: () => void
  track: SongTrack
  art?: string
  isPlaying: boolean
  player: Player
  nextTrack: MiniTrack | null
  artistBio: string | null
  loadingBio: boolean
  isFullScreen: boolean
  onFullScreenToggle: () => void
}

export function SongInfoPanel({
  isOpen, onClose, track, art, isPlaying, player, nextTrack,
  artistBio, loadingBio, isFullScreen, onFullScreenToggle,
}: SongInfoPanelProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!mounted) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[200] transition-all duration-300 ${isOpen && !isFullScreen ? 'bg-black/40 backdrop-blur-sm pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        style={{ right: 0 }}
        className={`fixed inset-y-0 z-[210] flex flex-col bg-card shadow-2xl border-l border-border transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${isFullScreen ? 'w-screen' : 'w-[420px] max-w-[92vw]'}`}
        aria-label="Song information"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-end gap-[2.5px]" aria-hidden="true">
              {[4, 7, 5, 8, 4].map((h, i) => (
                <div
                  key={i}
                  className="w-[2.5px] rounded-full bg-primary"
                  style={{
                    height: `${h * 2}px`,
                    transformOrigin: 'bottom',
                    animation: isPlaying ? `musicBar ${0.5 + i * 0.1}s ease-in-out infinite alternate` : 'none',
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-foreground">Song Info</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onFullScreenToggle}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullScreen
                ? <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 0 2 2v3M16 21v-3a2 2 0 0 0-2-2h-3"/></svg>
                : <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
              }
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {track ? (
            <>
              {/* Artwork hero */}
              <div className="relative overflow-hidden">
                {art && (
                  <div
                    className="absolute inset-0 scale-110"
                    style={{ backgroundImage: `url(${art})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(24px) saturate(2) brightness(0.35)' }}
                    aria-hidden="true"
                  />
                )}
                <div className={`relative px-7 pb-7 pt-8 text-center ${!art ? 'bg-gradient-to-b from-muted/30 to-transparent' : ''}`}>
                  {art
                    ? <img src={art} width={168} height={168} className="mx-auto h-[168px] w-[168px] rounded-2xl object-cover shadow-2xl ring-1 ring-white/10" alt="" aria-hidden="true" />
                    : (
                      <div className="mx-auto flex h-[168px] w-[168px] items-center justify-center rounded-2xl bg-muted" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/25">
                          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                        </svg>
                      </div>
                    )
                  }
                  <p className="mt-5 line-clamp-2 text-lg font-bold leading-tight text-foreground">{track.title}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{track.artist}</p>
                  {track.album && <p className="mt-0.5 text-xs text-muted-foreground/55">{track.album}</p>}
                </div>
              </div>

              {/* Artist bio */}
              <div className="border-t border-border px-6 py-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">About the Artist</p>
                {loadingBio
                  ? (
                    <div className="space-y-2.5 animate-pulse" aria-busy="true">
                      <div className="h-2.5 rounded-full bg-muted" />
                      <div className="h-2.5 w-5/6 rounded-full bg-muted" />
                      <div className="h-2.5 w-4/6 rounded-full bg-muted" />
                    </div>
                  )
                  : artistBio
                    ? <p className="text-sm leading-relaxed text-foreground/80">{artistBio}</p>
                    : <p className="text-xs italic text-muted-foreground">No artist info found.</p>
                }
              </div>

              {/* Up next */}
              {nextTrack && (
                <div className="border-t border-border px-6 py-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Up Next</p>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-primary/80"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">{nextTrack.title}</p>
                      {nextTrack.artist && <p className="truncate text-[10px] text-muted-foreground">{nextTrack.artist}</p>}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">Nothing playing right now.</p>
            </div>
          )}
        </div>

        {/* Bottom visualizer */}
        <div className="shrink-0 border-t border-border px-6 py-5" aria-hidden="true">
          <div className="flex items-end justify-center gap-[4px] h-10 mb-2.5">
            {BARS.map((h, i) => (
              <div
                key={i}
                className="w-[5px] rounded-full bg-primary/25"
                style={{
                  height: `${h}px`,
                  transformOrigin: 'bottom',
                  animation: isPlaying ? `musicBar ${0.55 + (i % 5) * 0.09}s ease-in-out infinite alternate` : 'none',
                  animationDelay: `${i * 0.055}s`,
                }}
              />
            ))}
          </div>
          <p className="text-center text-[10px] font-medium text-muted-foreground/35 tracking-wide">
            {isPlaying ? 'Now streaming' : 'Paused'}
            {player === 'music' ? ' · Apple Music' : player === 'spotify' ? ' · Spotify' : ''}
          </p>
        </div>
      </aside>
    </>,
    document.body
  )
}
