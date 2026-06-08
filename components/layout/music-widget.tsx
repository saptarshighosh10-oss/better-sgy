'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { SongInfoPanel, fetchArtistBio } from '@/components/shared/song-info-panel'
import { useAppStore } from '@/store/use-app-store'

type Player = 'music' | 'spotify' | null
type RepeatMode = 'off' | 'all' | 'one'

type MusicStatus = {
  player: Player
  isPlaying: boolean
  track: { title: string; artist: string; album: string; artworkUrl?: string } | null
  position: number
  duration: number
  currentPlaylist?: string
}

const EMPTY: MusicStatus = { player: null, isPlaying: false, track: null, position: 0, duration: 0 }
const REPEAT_NEXT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' }

export function MusicWidget() {
  const panelOpen      = useAppStore((s) => s.songInfoOpen)
  const setPanelOpen   = useAppStore((s) => s.setSongInfoOpen)

  const [open, setOpen]         = useState(false)
  const [status, setStatus]     = useState<MusicStatus | null>(null)
  const [art, setArt]           = useState<string | undefined>(undefined)
  const [localPos, setLocalPos] = useState(0)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')

  const [artistBio, setArtistBio]       = useState<string | null>(null)
  const [loadingBio, setLoadingBio]     = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  const pollTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const posTimer  = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const alive     = useRef(true)
  const isPlayRef = useRef(false)
  const lastTrack = useRef('')
  const bioAbort  = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!panelOpen || !status?.track?.artist) {
      if (!panelOpen) { setArtistBio(null); setLoadingBio(false) }
      return
    }
    bioAbort.current?.abort()
    bioAbort.current = new AbortController()
    setArtistBio(null)
    setLoadingBio(true)
    fetchArtistBio(status.track.artist, bioAbort.current.signal).then(bio => {
      if (!bioAbort.current?.signal.aborted) {
        setArtistBio(bio)
        setLoadingBio(false)
      }
    })
    return () => bioAbort.current?.abort()
  }, [panelOpen, status?.track?.artist]) // eslint-disable-line react-hooks/exhaustive-deps

  function startPosTick() {
    clearInterval(posTimer.current)
    posTimer.current = setInterval(() => {
      if (isPlayRef.current) setLocalPos(p => p + 1)
    }, 1000)
  }

  async function fetchItunesArt(artist: string, title: string) {
    try {
      const q = encodeURIComponent(`${artist} ${title}`)
      const r = await fetch(`https://itunes.apple.com/search?term=${q}&entity=song&limit=1`)
      const data = await r.json()
      const url: string | undefined = data?.results?.[0]?.artworkUrl100
      if (url && alive.current) setArt(url.replace('100x100', '200x200'))
    } catch {}
  }

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/music/status')
      if (!alive.current) return
      const data: MusicStatus = await r.json()
      setStatus(data)
      isPlayRef.current = data.isPlaying
      setLocalPos(data.position)
      const key = `${data.track?.title}${data.track?.artist}`
      if (key !== lastTrack.current) {
        lastTrack.current = key
        setArt(undefined)
        if (data.track?.artworkUrl) {
          setArt(data.track.artworkUrl)
        } else if (data.player === 'music' && data.track) {
          fetchItunesArt(data.track.artist, data.track.title)
        }
      }
      if (data.isPlaying) startPosTick()
      else clearInterval(posTimer.current)
    } catch {
      if (alive.current) setStatus(EMPTY)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    alive.current = true
    fetchStatus()
    pollTimer.current = setInterval(fetchStatus, 3000)
    return () => {
      alive.current = false
      clearInterval(pollTimer.current)
      clearInterval(posTimer.current)
    }
  }, [fetchStatus])

  async function control(action: string) {
    if (!status?.player) return
    await fetch('/api/music/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, player: status.player }),
    })
    setTimeout(fetchStatus, 800)
  }

  async function handleShuffle() {
    const pl = status?.currentPlaylist
    if (!pl || status?.player !== 'music') return
    setIsShuffled(s => !s)
    await fetch('/api/music/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'shuffle', player: 'music', playlist: pl }),
    })
    setTimeout(fetchStatus, 700)
  }

  async function handleRepeat() {
    if (status?.player !== 'music') return
    setRepeatMode(m => REPEAT_NEXT[m])
    await control('repeat')
  }

  const dur = status?.duration ?? 0
  const pct = dur > 0 ? Math.min((localPos / dur) * 100, 100) : 0
  const player  = status?.player ?? null
  const track   = status?.track ?? null
  const isPlaying = status?.isPlaying ?? false

  // Shared icon-button style
  const iconBtn = (active?: boolean) =>
    `flex items-center justify-center rounded-lg transition-colors ${
      active
        ? 'text-primary bg-primary/10 hover:bg-primary/15'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`

  return (
    <>
      <SongInfoPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        track={track}
        art={art}
        isPlaying={isPlaying}
        player={player}
        nextTrack={null}
        artistBio={artistBio}
        loadingBio={loadingBio}
        isFullScreen={isFullScreen}
        onFullScreenToggle={() => setIsFullScreen(f => !f)}
      />

      <div className="fixed bottom-3 right-3 z-30 flex flex-col-reverse items-end gap-1.5">

        {/* Expanded controls — shown when open */}
        {open && (
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-md">

            {/* Song info strip */}
            {track ? (
              <div className="flex items-center gap-2.5 border-b border-border px-3 py-2.5">
                {art
                  ? <img src={art} width={28} height={28} className="h-7 w-7 shrink-0 rounded-md object-cover" alt="" aria-hidden="true" />
                  : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
                        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                      </svg>
                    </div>
                  )
                }
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold leading-tight text-foreground">{track.title}</p>
                  <p className="truncate text-[10px] leading-tight text-muted-foreground">{track.artist}</p>
                </div>
                {/* Progress bar inline */}
                {dur > 0 && (
                  <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary/50 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            ) : player ? (
              <div className="border-b border-border px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">{player === 'music' ? 'Apple Music' : 'Spotify'} — nothing playing</p>
              </div>
            ) : null}

            {/* Control buttons grid */}
            <div className="grid grid-cols-5 gap-px p-2">
              {/* Shuffle */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  aria-label="Shuffle"
                  onClick={handleShuffle}
                  disabled={player !== 'music'}
                  className={`${iconBtn(isShuffled)} h-10 w-10 disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
                  </svg>
                </button>
                <span className="text-[9px] text-muted-foreground/60">Shuffle</span>
              </div>

              {/* Before (previous) */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={() => control('prev')}
                  disabled={!player}
                  className={`${iconBtn()} h-10 w-10 disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6 4h2v16H6zM17.5 4.5l-11 7 11 7z"/></svg>
                </button>
                <span className="text-[9px] text-muted-foreground/60">Before</span>
              </div>

              {/* Play / Pause */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  onClick={() => control('toggle')}
                  disabled={!player}
                  className={`${iconBtn()} h-10 w-10 rounded-full border border-border bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  {isPlaying
                    ? <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
                    : <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  }
                </button>
                <span className="text-[9px] text-muted-foreground/60">{isPlaying ? 'Pause' : 'Play'}</span>
              </div>

              {/* Skip (next) */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  aria-label="Skip"
                  onClick={() => control('next')}
                  disabled={!player}
                  className={`${iconBtn()} h-10 w-10 disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M16 4h2v16h-2zM6.5 4.5l11 7-11 7z"/></svg>
                </button>
                <span className="text-[9px] text-muted-foreground/60">Skip</span>
              </div>

              {/* Repeat */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  aria-label={`Repeat: ${repeatMode}`}
                  onClick={handleRepeat}
                  disabled={player !== 'music'}
                  className={`${iconBtn(repeatMode !== 'off')} relative h-10 w-10 disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                  </svg>
                  {repeatMode === 'one' && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground leading-none">1</span>
                  )}
                </button>
                <span className="text-[9px] text-muted-foreground/60">Repeat</span>
              </div>
            </div>

            {/* Bio button */}
            <div className="border-t border-border px-2 pb-2">
              <button
                type="button"
                onClick={() => { setPanelOpen(true); setOpen(false) }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
                Song &amp; Artist Info
              </button>
            </div>
          </div>
        )}

        {/* Trigger button — always visible */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close music controls' : 'Open music controls'}
          className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-md backdrop-blur-sm transition-all duration-200 ${
            open
              ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
              : isPlaying
                ? 'border-border bg-card/90 text-foreground hover:bg-muted'
                : 'border-border bg-card/80 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {open
            ? (
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )
            : isPlaying
              ? (
                // Animated bars when playing
                <span className="flex items-end gap-[2px] pb-[1px]" aria-hidden="true">
                  {[3, 5, 4].map((h, i) => (
                    <span
                      key={i}
                      className="w-[2.5px] rounded-full bg-foreground"
                      style={{
                        height: `${h * 2}px`,
                        transformOrigin: 'bottom',
                        animation: `musicBar ${0.5 + i * 0.12}s ease-in-out infinite alternate`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </span>
              )
              : (
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
              )
          }
        </button>
      </div>
    </>
  )
}
