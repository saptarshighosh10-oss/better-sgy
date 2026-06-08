'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/store/use-app-store'
import { SongInfoPanel, fetchArtistBio } from '@/components/shared/song-info-panel'

type Player = 'music' | 'spotify' | null

type MusicStatus = {
  player: Player
  isPlaying: boolean
  track: { title: string; artist: string; album: string; artworkUrl?: string } | null
  position: number
  duration: number
  currentPlaylist?: string
}

type Track = { title: string; artist: string }

type OutputInfo = { deviceName: string | null; kind: string; isBluetooth: boolean }
const NO_OUTPUT: OutputInfo = { deviceName: null, kind: 'other', isBluetooth: false }

const EMPTY: MusicStatus = { player: null, isPlaying: false, track: null, position: 0, duration: 0 }

function fmt(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Main component ─────────────────────────────────────────────────────────────
export function StudyMusic() {
  const musicVolume    = useAppStore((s) => s.musicVolume)
  const songInfoOpen    = useAppStore((s) => s.songInfoOpen)
  const setSongInfoOpen = useAppStore((s) => s.setSongInfoOpen)

  const [status, setStatus]         = useState<MusicStatus | null>(null)
  const [art, setArt]               = useState<string | undefined>(undefined)
  const [localPos, setLocalPos]     = useState(0)
  const [playlists, setPlaylists]   = useState<string[]>([])
  const [loadingPL, setLoadingPL]   = useState(false)
  const [output, setOutput]         = useState<OutputInfo>(NO_OUTPUT)

  const [expanded, setExpanded]     = useState<string | null>(null)
  const [trackCache, setTrackCache] = useState<Record<string, Track[]>>({})
  const [loadingTracks, setLoadingTracks] = useState<string | null>(null)
  const [isShuffled, setIsShuffled] = useState(false)

  const [artistBio, setArtistBio]   = useState<string | null>(null)
  const [loadingBio, setLoadingBio] = useState(false)
  const [infoFullScreen, setInfoFullScreen] = useState(false)

  const pollTimer  = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const posTimer   = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const outputTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const alive      = useRef(true)
  const isPlayRef  = useRef(false)
  const lastTrack  = useRef('')
  const lastPlayer = useRef<Player>(null)
  const bioAbort   = useRef<AbortController | null>(null)
  const bioCache   = useRef<Record<string, string | null>>({})

  const activePl = status?.currentPlaylist ?? expanded

  // Next track in current playlist
  const nextTrack: Track | null = (() => {
    if (!status?.track || !activePl) return null
    const tracks = trackCache[activePl] ?? []
    const idx = tracks.findIndex(t => t.title === status.track!.title)
    if (idx === -1 || idx >= tracks.length - 1) return null
    return tracks[idx + 1]
  })()

  function startPosTick() {
    clearInterval(posTimer.current)
    posTimer.current = setInterval(() => {
      if (isPlayRef.current) setLocalPos((p) => p + 1)
    }, 1000)
  }

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/music/status')
      if (!alive.current) return
      const data: MusicStatus = await r.json()
      setStatus(data)
      isPlayRef.current = data.isPlaying
      setLocalPos(data.position)

      if (data.player === 'music' && lastPlayer.current !== 'music') {
        loadPlaylists()
      }
      lastPlayer.current = data.player

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

  async function loadPlaylists() {
    setLoadingPL(true)
    try {
      const r = await fetch('/api/music/playlists')
      const data = await r.json()
      if (alive.current) setPlaylists(data.playlists ?? [])
    } catch {}
    finally { if (alive.current) setLoadingPL(false) }
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

  // Pre-load the active playlist's tracks (without waiting for the user to
  // expand its accordion row) so "Up Next" can sit beside Now Playing —
  // otherwise that space stays empty until they interact with the list.
  useEffect(() => {
    const pl = status?.currentPlaylist
    if (!pl || status?.player !== 'music' || trackCache[pl]) return
    setLoadingTracks(pl)
    fetch(`/api/music/tracks?playlist=${encodeURIComponent(pl)}`)
      .then(r => r.json())
      .then(data => { if (alive.current) setTrackCache(prev => ({ ...prev, [pl]: data.tracks ?? [] })) })
      .catch(() => {})
      .finally(() => { if (alive.current) setLoadingTracks(null) })
  }, [status?.currentPlaylist, status?.player]) // eslint-disable-line react-hooks/exhaustive-deps

  // Output device — changes rarely, so a slow poll is plenty
  const fetchOutput = useCallback(async () => {
    try {
      const r = await fetch('/api/music/output')
      if (!alive.current) return
      setOutput(await r.json())
    } catch {
      if (alive.current) setOutput(NO_OUTPUT)
    }
  }, [])

  useEffect(() => {
    fetchOutput()
    outputTimer.current = setInterval(fetchOutput, 12000)
    return () => clearInterval(outputTimer.current)
  }, [fetchOutput])

  // Artist bio — fetched whenever the playing artist changes (shown inline in
  // the "About the artist" card and reused by the expandable info panel),
  // cached per artist so switching back to a previous artist is instant
  useEffect(() => {
    const artist = status?.track?.artist
    if (!artist) { setArtistBio(null); setLoadingBio(false); return }
    if (artist in bioCache.current) {
      setArtistBio(bioCache.current[artist])
      setLoadingBio(false)
      return
    }
    bioAbort.current?.abort()
    const controller = new AbortController()
    bioAbort.current = controller
    setLoadingBio(true)
    setArtistBio(null)
    fetchArtistBio(artist, controller.signal).then((bio) => {
      if (controller.signal.aborted || !alive.current) return
      bioCache.current[artist] = bio
      setArtistBio(bio)
      setLoadingBio(false)
    })
    return () => controller.abort()
  }, [status?.track?.artist])

  async function control(action: 'toggle' | 'next' | 'prev') {
    if (!status?.player) return
    await fetch('/api/music/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, player: status.player }),
    })
    // 800ms gives Music/Spotify time to actually change state before re-polling
    setTimeout(fetchStatus, 800)
  }

  async function globalShuffle() {
    if (!activePl || status?.player !== 'music') return
    setIsShuffled(s => !s)
    await fetch('/api/music/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'shuffle', player: 'music', playlist: activePl }),
    })
    setTimeout(fetchStatus, 700)
  }

  async function playPlaylist(name: string) {
    setIsShuffled(false)
    await fetch('/api/music/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'play-playlist', player: 'music', playlist: name }),
    })
    setTimeout(fetchStatus, 600)
  }

  async function playTrack(playlist: string, title: string) {
    await fetch('/api/music/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'play-track', player: 'music', playlist, track: title }),
    })
    setTimeout(fetchStatus, 600)
  }

  async function toggleExpand(name: string) {
    if (expanded === name) { setExpanded(null); return }
    setExpanded(name)
    if (!trackCache[name]) {
      setLoadingTracks(name)
      try {
        const r = await fetch(`/api/music/tracks?playlist=${encodeURIComponent(name)}`)
        const data = await r.json()
        if (alive.current) setTrackCache(prev => ({ ...prev, [name]: data.tracks ?? [] }))
      } catch {}
      setLoadingTracks(null)
    }
  }

  async function shufflePlaylist(name: string, e: React.MouseEvent) {
    e.stopPropagation()
    let tracks = trackCache[name]
    if (!tracks) {
      setLoadingTracks(name)
      try {
        const r = await fetch(`/api/music/tracks?playlist=${encodeURIComponent(name)}`)
        const data = await r.json()
        tracks = data.tracks ?? []
        if (alive.current) setTrackCache(prev => ({ ...prev, [name]: tracks! }))
      } catch { tracks = [] }
      setLoadingTracks(null)
    }
    setTrackCache(prev => ({ ...prev, [name]: shuffle(prev[name] ?? []) }))
    setExpanded(name)
    setIsShuffled(true)
    await fetch('/api/music/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'shuffle', player: 'music', playlist: name }),
    })
    setTimeout(fetchStatus, 700)
  }

  const dur = status?.duration ?? 0
  const pct = dur > 0 ? Math.min((localPos / dur) * 100, 100) : 0

  // ── Shared playlist accordion ──────────────────────────────────────────────
  function PlaylistAccordion({ activeTrack }: { activeTrack?: string }) {
    if (status?.player !== 'music' || playlists.length === 0) return null
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Playlists
            {loadingPL && <span className="ml-1.5 text-muted-foreground/50">loading…</span>}
          </p>
          {isShuffled && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
              <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
              Shuffled
            </span>
          )}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto" role="list">
          {playlists.map((name) => {
            const isExpanded = expanded === name
            const isActive   = name === activePl
            const tracks     = trackCache[name] ?? []
            const isLoading  = loadingTracks === name
            return (
              <li key={name} className="mb-0.5">
                <div
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${isActive ? 'bg-primary/8' : 'hover:bg-muted'}`}
                  onClick={() => toggleExpand(name)}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    className={`shrink-0 text-muted-foreground/60 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span className={`min-w-0 flex-1 truncate text-[11px] font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {name}
                  </span>
                  {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="active" />}
                  <button type="button" title="Shuffle playlist" onClick={(e) => shufflePlaylist(name, e)}
                    className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground">
                    <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
                  </button>
                  <button type="button" title="Play playlist" onClick={(e) => { e.stopPropagation(); playPlaylist(name) }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground">
                    <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  </button>
                </div>
                {isExpanded && (
                  <div className="ml-4 mt-0.5 mb-1">
                    {isLoading ? (
                      <p className="px-2 py-1.5 text-[10px] text-muted-foreground/60">Loading tracks…</p>
                    ) : tracks.length === 0 ? (
                      <p className="px-2 py-1.5 text-[10px] text-muted-foreground/60">No tracks found.</p>
                    ) : (
                      <ul role="list">
                        {tracks.map((t, i) => {
                          const isCurrent = activeTrack && t.title === activeTrack
                          return (
                            <li key={i}>
                              <button type="button" onClick={() => playTrack(name, t.title)}
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors ${isCurrent ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}`}>
                                {isCurrent
                                  ? <span className="flex h-3 w-3 shrink-0 items-center justify-center" aria-label="Now playing">
                                      <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                    </span>
                                  : <span className="w-3 shrink-0 text-center text-[9px] tabular-nums text-muted-foreground/40">{i + 1}</span>
                                }
                                <div className="min-w-0 flex-1">
                                  <p className={`truncate text-[11px] font-medium leading-tight ${isCurrent ? 'text-primary' : ''}`}>{t.title}</p>
                                  {t.artist && <p className="truncate text-[10px] text-muted-foreground/70 leading-tight">{t.artist}</p>}
                                </div>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === null) return (
    <section aria-label="Study music" className="flex h-full flex-col">
      <MusicHeader />
      <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    </section>
  )

  // ── No player ──────────────────────────────────────────────────────────────
  if (!status.player) return (
    <>
      <section aria-label="Study music" className="flex h-full flex-col">
        <MusicHeader />
        <div className="flex flex-1 flex-col rounded-xl border border-border bg-card px-4 py-5">
          <p className="mb-3 text-[11px] text-muted-foreground">No music app open. Pick one to get started.</p>
          <div className="space-y-2">
            <a href="music://" className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: 'oklch(0.62 0.2 25 / 0.15)' }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="oklch(0.62 0.2 25)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
              </span>
              Open Apple Music
            </a>
            <a href="spotify://" className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1DB954]/15">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
              </span>
              Open Spotify
            </a>
            <a href="https://music.youtube.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FF0000]/12">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="#FF0000"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/></svg>
              </span>
              YouTube Music ↗
            </a>
          </div>
          <p className="mt-auto pt-4 text-[10px] text-muted-foreground/60">Once a player is open, controls appear here automatically.</p>
        </div>
      </section>
    </>
  )

  const { player, isPlaying, track } = status

  // ── Idle ───────────────────────────────────────────────────────────────────
  if (!track) return (
    <>
      <section aria-label="Study music" className="flex h-full flex-col">
        <MusicHeader player={player} onInfoClick={() => setSongInfoOpen(true)} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[11px] font-medium text-foreground">
              {player === 'music' ? 'Apple Music' : 'Spotify'} is open
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {player === 'music' ? 'Pick a playlist below to start listening' : 'Nothing playing — press play in Spotify'}
            </p>
            {player === 'spotify' && (
              <button type="button" onClick={() => control('toggle')}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Resume last session
              </button>
            )}
          </div>
          <PlaylistAccordion />
        </div>
      </section>
      <SongInfoPanel
        isOpen={songInfoOpen}
        onClose={() => setSongInfoOpen(false)}
        track={null}
        art={undefined}
        isPlaying={isPlaying}
        player={player}
        nextTrack={null}
        artistBio={null}
        loadingBio={false}
        isFullScreen={infoFullScreen}
        onFullScreenToggle={() => setInfoFullScreen(v => !v)}
      />
    </>
  )

  // ── Now playing ────────────────────────────────────────────────────────────
  return (
    <>
      <section aria-label="Study music" className="flex h-full flex-col">
        <MusicHeader player={player} onInfoClick={() => setSongInfoOpen(true)} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">

          {/* Now playing card */}
          <div className="border-b border-border px-4 py-3">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Now Playing</p>
            <div className="flex items-center gap-3">
              {art
                ? <img src={art} width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg object-cover" alt="" aria-hidden="true" />
                : <ArtFallback player={player} />
              }
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-card-foreground">{track.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{track.artist}</p>
                {track.album && <p className="mt-0.5 truncate text-[10px] text-muted-foreground/60">{track.album}</p>}
                <OutputBadge output={output} />
              </div>
              {/* Song info panel trigger */}
              <button
                type="button"
                onClick={() => setSongInfoOpen(true)}
                title="Song info"
                aria-label="Open song info"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
              </button>
            </div>

            {/* Controls + progress */}
            <div className="mt-3 flex items-center gap-2">
              {/* Global shuffle (Apple Music only) */}
              {player === 'music' && activePl && (
                <button
                  type="button"
                  aria-label="Shuffle"
                  onClick={globalShuffle}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${isShuffled ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
                </button>
              )}
              <button type="button" aria-label="Previous" onClick={() => control('prev')}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M6 4h2v16H6zM17.5 4.5l-11 7 11 7z"/></svg>
              </button>
              <button type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={() => control('toggle')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/60 text-foreground transition-colors hover:bg-muted">
                {isPlaying
                  ? <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
                  : <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>
              <button type="button" aria-label="Next" onClick={() => control('next')}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M16 4h2v16h-2zM6.5 4.5l11 7-11 7z"/></svg>
              </button>
              <div className="flex-1">
                <div className="h-1 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-primary/50 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[9px] text-muted-foreground/60 tabular-nums">
                  <span>{fmt(localPos)}</span>
                  <span>{fmt(dur)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Playlist accordion */}
          {player === 'music' && playlists.length > 0
            ? <PlaylistAccordion activeTrack={track.title} />
            : (
              <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isPlaying ? 'bg-emerald-500' : 'bg-border'}`} aria-hidden="true" />
                  <span className="text-[10px] text-muted-foreground">
                    {isPlaying ? 'Playing' : 'Paused'} · {player === 'music' ? 'Apple Music' : 'Spotify'}
                  </span>
                </div>

                {nextTrack && (
                  <div className="mt-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Up Next</p>
                    <button
                      type="button"
                      onClick={() => activePl && playTrack(activePl, nextTrack.title)}
                      title={`Play "${nextTrack.title}" now`}
                      className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" className="text-primary/70" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">{nextTrack.title}</p>
                        {nextTrack.artist && <p className="truncate text-[10px] text-muted-foreground">{nextTrack.artist}</p>}
                      </div>
                    </button>
                  </div>
                )}

                {(loadingBio || artistBio) && (
                  <div className="mt-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">About {track.artist}</p>
                    {loadingBio ? (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-3">
                        <div className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary" />
                        <span className="text-[10px] text-muted-foreground">Loading…</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSongInfoOpen(true)}
                        title="Open song info"
                        className="block w-full rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                      >
                        <p className="text-[11px] leading-relaxed text-foreground line-clamp-5">{artistBio}</p>
                        <span className="mt-1.5 inline-block text-[10px] font-medium text-primary">Read more</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          }
        </div>
      </section>
      <SongInfoPanel
        isOpen={songInfoOpen}
        onClose={() => setSongInfoOpen(false)}
        track={track}
        art={art}
        isPlaying={isPlaying}
        player={player}
        nextTrack={nextTrack}
        artistBio={artistBio}
        loadingBio={loadingBio}
        isFullScreen={infoFullScreen}
        onFullScreenToggle={() => setInfoFullScreen(v => !v)}
      />
    </>
  )
}

function MusicHeader({ player, onInfoClick }: { player?: Player; onInfoClick?: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Study Music</h2>
      <div className="flex items-center gap-1.5">
        {onInfoClick && player && (
          <button
            type="button"
            onClick={onInfoClick}
            aria-label="Open song info"
            title="Song info"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </button>
        )}
        {player === 'music' && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
            Apple Music
          </span>
        )}
        {player === 'spotify' && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DB954]" aria-hidden="true" />
            Spotify
          </span>
        )}
        {!player && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Homework Mode</span>
        )}
      </div>
    </div>
  )
}

function OutputBadge({ output }: { output: OutputInfo }) {
  if (!output.deviceName) return null
  return (
    <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60">
      {output.isBluetooth ? (
        <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-sky-500" aria-hidden="true">
          <path d="m7 7 10 10-5 5V2l5 5L7 17" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
          <path d="M11 5 6 9H2v6h4l5 4V5z" />
        </svg>
      )}
      <span className="truncate">Playing through {output.deviceName}</span>
    </p>
  )
}

function ArtFallback({ player }: { player: Player }) {
  if (player === 'spotify') return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1DB954]/10" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="#1DB954">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    </div>
  )
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg" style={{ background: 'oklch(0.62 0.2 25 / 0.12)' }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/60">
        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
    </div>
  )
}
