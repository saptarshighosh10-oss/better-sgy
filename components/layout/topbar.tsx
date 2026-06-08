'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/store/use-app-store'
import { useSchoolYears, refreshGradesCache } from '@/lib/use-grades'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type MusicStatus = {
  player: 'music' | 'spotify' | null
  isPlaying: boolean
  track: { title: string; artist: string } | null
}

function TopbarMusic() {
  const [status, setStatus] = useState<MusicStatus | null>(null)
  const alive = useRef(true)
  const isPlayRef = useRef(false)

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/music/status')
      if (!alive.current) return
      const d: MusicStatus = await r.json()
      setStatus(d)
      isPlayRef.current = d.isPlaying
    } catch {}
  }, [])

  useEffect(() => {
    alive.current = true
    fetchStatus()
    const t = setInterval(fetchStatus, 3000)
    return () => { alive.current = false; clearInterval(t) }
  }, [fetchStatus])

  async function control(action: 'toggle' | 'next' | 'prev') {
    if (!status?.player) return
    await fetch('/api/music/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, player: status.player }),
    })
    setTimeout(fetchStatus, 800)
  }

  if (!status?.player) return null

  const { isPlaying, track } = status

  return (
    <div className={`hidden items-center gap-2 rounded-lg px-2.5 py-1 transition-colors sm:flex ${isPlaying ? 'bg-primary/8' : ''}`}>
      {/* Animated bars when playing, static icon when paused */}
      <span className="flex h-4 w-3 shrink-0 items-end gap-[1.5px]" aria-hidden="true">
        {isPlaying ? (
          [3, 5, 4].map((h, i) => (
            <span
              key={i}
              className="w-[2px] rounded-full bg-primary"
              style={{
                height: `${h * 2}px`,
                animation: `musicBar ${0.5 + i * 0.12}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))
        ) : (
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        )}
      </span>

      {track ? (
        <span className="max-w-[180px] truncate text-[11px]">
          <span className={`font-semibold ${isPlaying ? 'text-foreground' : 'text-foreground/70'}`}>{track.title}</span>
          {track.artist && (
            <span className={isPlaying ? 'text-foreground/60' : 'text-muted-foreground/50'}> · {track.artist}</span>
          )}
        </span>
      ) : (
        <span className="text-[11px] text-muted-foreground/50">
          {status.player === 'music' ? 'Apple Music' : 'Spotify'}
        </span>
      )}

      {/* Compact controls */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => control('prev')}
          className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-muted ${isPlaying ? 'text-foreground/70 hover:text-foreground' : 'text-muted-foreground/50 hover:text-foreground'}`}
        >
          <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M6 4h2v16H6zM17.5 4.5l-11 7 11 7z"/></svg>
        </button>
        <button
          type="button"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={() => control('toggle')}
          className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-muted ${isPlaying ? 'text-foreground hover:text-foreground' : 'text-muted-foreground/50 hover:text-foreground'}`}
        >
          {isPlaying
            ? <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
            : <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          }
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => control('next')}
          className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-muted ${isPlaying ? 'text-foreground/70 hover:text-foreground' : 'text-muted-foreground/50 hover:text-foreground'}`}
        >
          <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M16 4h2v16h-2zM6.5 4.5l11 7-11 7z"/></svg>
        </button>
      </div>
    </div>
  )
}
// Builds the status label from the real `lastUpdated` timestamp so it always
// reflects how long ago the last sync actually happened, rather than a fixed
// "12 min ago" that drifts out of sync with reality.
function refreshLabel(state: 'fresh' | 'stale' | 'failed', lastUpdated: string): string {
  if (state === 'failed') return 'Refresh failed — showing last saved data'

  const ms = Date.now() - new Date(lastUpdated).getTime()
  const mins = Math.floor(ms / 60000)
  const hrs  = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  const ago =
    mins < 1   ? 'just now' :
    mins < 60  ? `${mins} min ago` :
    hrs   < 24 ? `${hrs}h ago` :
    `${days}d ago`

  return state === 'stale' ? `Last update may be outdated — ${ago}` : `Updated ${ago}`
}

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function onChange() { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggle() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  return { isFullscreen, toggle }
}

export function Topbar() {
  const {
    selectedYearId,
    selectedSemesterId,
    refreshState,
    lastUpdated,
    setYear,
    setSemester,
    setRefreshState,
    setLastUpdated,
    toggleSidebar,
  } = useAppStore()

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Re-render once a minute so the "X min ago" label keeps advancing on its own
  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const { schoolYears } = useSchoolYears()
  const selectedYear = schoolYears.find((y) => y.id === selectedYearId) ?? schoolYears[0]
  const semesters = selectedYear?.semesters ?? []

  const alertCount = selectedYear?.semesters
    .find((s) => s.id === selectedSemesterId)
    ?.courses.flatMap((c) =>
      c.categories.flatMap((cat) =>
        cat.assignments.filter((a) => a.status === 'missing' || a.status === 'late')
      )
    ).length ?? 0

  function handleYearChange(yearId: string) {
    setYear(yearId)
    const year = schoolYears.find((y) => y.id === yearId)
    if (year && year.semesters.length > 0) {
      setSemester(year.semesters[year.semesters.length - 1].id)
    }
  }

  // Kicks off a real Schoology + Gmail sync in the background (same scrapers
  // Settings' "Sync now" buttons use), polls until both finish, then reflects
  // the real outcome in the status dot/label.
  async function handleRefresh() {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      const post = (target: 'schoology' | 'gmail') =>
        fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, action: 'refresh' }),
        })
      await Promise.all([post('schoology'), post('gmail')])

      const inFlight = (s: { status: string }) =>
        ['opening_browser', 'waiting_login', 'checkingSession', 'scraping', 'parsing', 'saving'].includes(s.status)

      let status: { schoology: { status: string }; gmail: { status: string } }
      do {
        await new Promise((r) => setTimeout(r, 1500))
        status = await fetch('/api/scrape').then((r) => r.json())
      } while (inFlight(status.schoology) || inFlight(status.gmail))

      const failed = status.schoology.status === 'error' || status.gmail.status === 'error'
      setRefreshState(failed ? 'failed' : 'fresh')
      // On success, record now as the update timestamp.
      // On failure, keep the existing lastUpdated so the label reflects the last
      // GOOD data age rather than implying fresh data just landed.
      if (!failed) {
        setLastUpdated(new Date().toISOString())
        refreshGradesCache()
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  const dotClass = {
    fresh:  'bg-success',
    stale:  'bg-yellow-400',
    failed: 'bg-destructive',
  }[refreshState]

  const labelClass = {
    fresh:  'text-muted-foreground',
    stale:  'text-amber-600 dark:text-amber-400',
    failed: 'text-destructive',
  }[refreshState]

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors lg:hidden"
        aria-label="Toggle navigation"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Year selector */}
      <Select value={selectedYearId} onValueChange={handleYearChange}>
        <SelectTrigger className="h-7 w-[172px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {schoolYears.map((year) => (
            <SelectItem key={year.id} value={year.id} className="text-xs">
              {year.yearLabel} · {year.gradeLevel}
              {year.isPartial && <span className="ml-1 text-muted-foreground">(partial)</span>}
              {!year.hasData && <span className="ml-1 text-muted-foreground">(no data)</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Semester selector */}
      {semesters.length > 0 ? (
        <Select value={selectedSemesterId} onValueChange={setSemester}>
          <SelectTrigger className="h-7 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {semesters.map((sem) => (
              <SelectItem key={sem.id} value={sem.id} className="text-xs">
                {sem.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="rounded border border-border px-2 py-1 text-xs text-muted-foreground">
          No data
        </span>
      )}

      <div className="flex flex-1 items-center justify-center">
        <TopbarMusic />
      </div>

      {/* Missing badge */}
      {alertCount > 0 && (
        <a
          href="/assignments"
          className="inline-flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/8 px-2 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/12 transition-colors"
          aria-label={`${alertCount} missing or late`}
        >
          {alertCount} missing
        </a>
      )}

      {/* Refresh status — hidden on small screens */}
      <div
        className={cn(
          'hidden items-center gap-1.5 sm:flex',
          labelClass
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} aria-hidden="true" />
        <span className="text-xs">{refreshLabel(refreshState, lastUpdated)}</span>
      </div>

      {/* Fullscreen toggle */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 0 2 2v3M16 21v-3a2 2 0 0 0-2-2h-3"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
          </svg>
        )}
      </button>

      {/* Refresh button */}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        aria-label="Sync Schoology and Gmail now"
        title="Sync Schoology and Gmail now"
      >
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn(isRefreshing && 'animate-spin')}
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 .49-3" />
        </svg>
        {isRefreshing ? 'Syncing…' : 'Refresh'}
      </button>
    </header>
  )
}
