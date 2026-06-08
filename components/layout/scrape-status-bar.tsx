'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { LottieSpinner } from '@/components/shared/lottie-spinner'

type TargetState = {
  status: string
  connected: boolean
  dataAgeMs: number | null
  newCount?: number
}
type ScrapePayload = { schoology: TargetState; gmail: TargetState; activity: TargetState }

const BUSY = ['opening_browser', 'waiting_login', 'checkingSession', 'scraping', 'parsing', 'saving', 'scraping_activity']

function fmtAge(ms: number | null) {
  if (ms === null) return 'never'
  if (ms < 60_000) return 'just now'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m ago`
  return `${m}m ago`
}

export function ScrapeStatusBar() {
  const [data, setData] = useState<ScrapePayload | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [pokedAt, setPokedAt] = useState<number | null>(null)
  const alive = useRef(true)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/scrape')
      if (!r.ok || !alive.current) return
      setData(await r.json())
    } catch {}
  }, [])

  useEffect(() => {
    alive.current = true
    load()
    const t = setInterval(load, 60_000)
    return () => { alive.current = false; clearInterval(t) }
  }, [load])

  // Once we manually trigger a refresh, poll faster until it settles
  useEffect(() => {
    if (pokedAt === null) return
    const t = setInterval(load, 2_000)
    const stop = setTimeout(() => clearInterval(t), 60_000)
    return () => { clearInterval(t); clearTimeout(stop) }
  }, [pokedAt, load])

  async function updateNow() {
    if (!data) return
    setPokedAt(Date.now())
    const targets: Array<'schoology' | 'gmail' | 'activity'> = []
    if (data.schoology.connected) targets.push('schoology')
    if (data.gmail.connected) targets.push('gmail')
    if (data.activity.connected) targets.push('activity')
    await Promise.all(targets.map(target =>
      fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, action: 'refresh' }),
      }).catch(() => {})
    ))
    setTimeout(load, 1_200)
  }

  if (!data || dismissed) return null
  if (!data.schoology.connected && !data.gmail.connected) return null

  const ages = [data.schoology, data.gmail]
    .filter(t => t.connected)
    .map(t => t.dataAgeMs)
    .filter((v): v is number => v != null)
  const freshest = ages.length ? Math.min(...ages) : null
  const busy = [data.schoology.status, data.gmail.status, data.activity.status].some(s => BUSY.includes(s))
  const newCount = data.activity.newCount ?? 0

  return (
    <div
      role="status"
      aria-live="polite"
      className="scrape-bar-in flex shrink-0 items-center gap-3 border-b border-border bg-muted/40 px-4 py-2"
    >
      <span
        className={cn('h-1.5 w-1.5 shrink-0 rounded-full', busy ? 'bg-primary animate-pulse' : 'bg-success')}
        aria-hidden="true"
      />
      <span className="text-[12px] text-muted-foreground">
        {busy ? 'Syncing your data…' : `Data last updated ${fmtAge(freshest)}`}
      </span>

      {newCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {newCount} new {newCount === 1 ? 'item' : 'items'} found
        </span>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={updateNow}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground transition-all duration-150 hover:bg-muted active:scale-[0.97] disabled:opacity-50"
      >
        {busy
          ? <LottieSpinner size={13} />
          : (
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.77" />
            </svg>
          )
        }
        {busy ? 'Updating…' : 'Update now'}
      </button>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss status bar"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
