'use client'

import { useEffect, useRef, useState } from 'react'
import { refreshGradesCache } from '@/lib/use-grades'
import { LottieSpinner } from '@/components/shared/lottie-spinner'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme/theme-provider'
import { useAppStore, syncToFile } from '@/store/use-app-store'
import type { AppPreset } from '@/store/use-app-store'
import { mockSchoolYears } from '@/lib/mock-data'

// ── Volume slider ──────────────────────────────────────────────────────────────
function VolumeSlider({
  value,
  onChange,
  icon,
  label,
}: {
  value: number
  onChange: (v: number) => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="flex items-center gap-3 w-48">
      <span className="shrink-0 text-muted-foreground" aria-hidden="true">{icon}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="flex-1 h-1.5 cursor-pointer appearance-none rounded-full bg-border accent-primary"
      />
      <span className="w-7 text-right text-[11px] tabular-nums text-muted-foreground">
        {value}%
      </span>
    </div>
  )
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
        {children}
      </div>
    </section>
  )
}

// ── Setting row ────────────────────────────────────────────────────────────────
function SettingRow({
  label,
  description,
  children,
  disabled = false,
}: {
  label: string
  description?: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-6 px-4 py-3.5',
      disabled && 'opacity-50'
    )}>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ── Scrape status helpers ──────────────────────────────────────────────────────
type ScrapeTargetState = {
  status: string; connected: boolean; dataAgeMs: number | null; error: string | null
}
type ScrapeStatus = { schoology: ScrapeTargetState; gmail: ScrapeTargetState }

function fmtAge(ms: number | null) {
  if (ms === null) return 'never'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m ago`
  return `${m}m ago`
}

const BUSY_STATUSES = ['opening_browser', 'waiting_login', 'checkingSession', 'scraping', 'parsing', 'saving']

function ConnectButton({ target, st, onRefresh }: { target: 'schoology' | 'gmail'; st: ScrapeTargetState; onRefresh: () => void }) {
  const busy = BUSY_STATUSES.includes(st.status)

  async function trigger(action: 'connect' | 'refresh' | 'disconnect') {
    await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, action }) })
    onRefresh()
  }

  if (busy) {
    const label =
      st.status === 'waiting_login'   ? 'Waiting for login…' :
      st.status === 'checkingSession' ? 'Checking session…' :
      st.status === 'scraping'        ? 'Scraping…' :
      st.status === 'parsing'         ? 'Parsing data…' :
      st.status === 'saving'          ? 'Saving data…' :
                                        'Opening browser…'
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <LottieSpinner size={16} />
        {label}
      </span>
    )
  }

  if (st.connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />Connected
        </span>
        <button onClick={() => trigger('refresh')} className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted">
          Sync now
        </button>
        <button onClick={() => trigger('disconnect')} className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted">
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => trigger('connect')}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
    >
      Connect
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function SettingsClient() {
  const { theme, setTheme } = useTheme()
  const reducedMotion    = useAppStore((s) => s.reducedMotion)
  const setReducedMotion = useAppStore((s) => s.setReducedMotion)
  const preset           = useAppStore((s) => s.preset)
  const setPreset        = useAppStore((s) => s.setPreset)
  const selectedYearId   = useAppStore((s) => s.selectedYearId)
  const setYear          = useAppStore((s) => s.setYear)
  const setSemester      = useAppStore((s) => s.setSemester)
  const musicVolume      = useAppStore((s) => s.musicVolume)
  const sfxVolume        = useAppStore((s) => s.sfxVolume)
  const setMusicVolume   = useAppStore((s) => s.setMusicVolume)
  const setSfxVolume     = useAppStore((s) => s.setSfxVolume)
  const showSpacePhoto   = useAppStore((s) => s.showSpacePhoto)
  const setShowSpacePhoto = useAppStore((s) => s.setShowSpacePhoto)
  const showBookCard     = useAppStore((s) => s.showBookCard)
  const setShowBookCard  = useAppStore((s) => s.setShowBookCard)
  const bookTitle        = useAppStore((s) => s.bookTitle)
  const setBookTitle     = useAppStore((s) => s.setBookTitle)
  const setLastUpdated  = useAppStore((s) => s.setLastUpdated)
  const setRefreshState = useAppStore((s) => s.setRefreshState)
  const [scrape, setScrape] = useState<ScrapeStatus | null>(null)
  const prevStatus = useRef<{ schoology: string; gmail: string }>({ schoology: '', gmail: '' })

  function loadScrapeStatus() {
    fetch('/api/scrape').then(r => r.json()).then((s: ScrapeStatus) => {
      // Refresh grades cache + topbar state whenever any busy phase transitions to done
      if (BUSY_STATUSES.includes(prevStatus.current.schoology) && s.schoology.status === 'done') {
        refreshGradesCache()
        setLastUpdated(new Date().toISOString())
        setRefreshState('fresh')
      }
      if (BUSY_STATUSES.includes(prevStatus.current.schoology) && s.schoology.status === 'error') {
        setRefreshState('failed')
      }
      prevStatus.current = { schoology: s.schoology.status, gmail: s.gmail.status }
      setScrape(s)
    }).catch(() => {})
  }

  useEffect(() => {
    loadScrapeStatus()
    const interval = setInterval(() => {
      if (scrape && (BUSY_STATUSES.includes(scrape.gmail.status) || BUSY_STATUSES.includes(scrape.schoology.status))) {
        loadScrapeStatus()
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [scrape?.gmail.status, scrape?.schoology.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply reduced-motion class to <html> so CSS transitions respect it
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion)
  }, [reducedMotion])

  function handleReducedMotion(v: boolean) {
    setReducedMotion(v)
    syncToFile({ reducedMotion: v })
  }

  function handleYearChange(yearId: string) {
    const yr = mockSchoolYears.find((y) => y.id === yearId)
    if (!yr) return
    setYear(yearId)
    const lastSem = yr.semesters[yr.semesters.length - 1]
    if (lastSem) {
      setSemester(lastSem.id)
      syncToFile({ selectedYearId: yearId, selectedSemesterId: lastSem.id })
    }
  }

  return (
    <div className="px-5 py-5 max-w-[680px]">
      {/* Page header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Settings
        </p>
        <h1 className="mt-0.5 text-base font-semibold text-foreground">
          Preferences
        </h1>
      </div>

      <div className="space-y-5">

        {/* ── Appearance ──────────────────────────────────── */}
        <Section title="Appearance">
          <SettingRow
            label="Theme"
            description="Choose your preferred color mode."
          >
            <div className="relative">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full appearance-none cursor-pointer rounded-lg border border-border bg-background pl-2.5 pr-8 py-1.5 text-[12px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="mono-light">Mono Light (B&W)</option>
                <option value="mono-dark">Mono Dark (W&B)</option>
                <optgroup label="Invincible">
                  <option value="mark">Mark / Invincible</option>
                  <option value="eve">Atom Eve</option>
                  <option value="thragg">Thragg</option>
                  <option value="omni-man">Omni-Man</option>
                </optgroup>
                <optgroup label="Games &amp; Shows">
                  <option value="cyberpunk">Cyberpunk 2077</option>
                  <option value="minecraft">Minecraft</option>
                  <option value="stranger-things">Stranger Things</option>
                  <option value="arcane">Arcane</option>
                </optgroup>
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
          </SettingRow>

          <SettingRow
            label="Mascot preset"
            description="Pick the character who shows up in your sidebar, overview banner, and status card. Butcher adds themed art, the couch banner, and a Vought screensaver. Neutral is clean."
          >
            <div className="relative">
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as AppPreset)}
                className="w-full appearance-none cursor-pointer rounded-lg border border-border bg-background pl-2.5 pr-8 py-1.5 text-[12px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="butcher">Butcher</option>
                <option value="neutral">Neutral · Chip</option>
                <option value="allen">Allen the Alien</option>
                <optgroup label="Game / show mascots">
                  <option value="cyberpunk">Nyx (Cyberpunk)</option>
                  <option value="minecraft">Cube (Minecraft)</option>
                  <option value="stranger-things">Wren (Stranger Things)</option>
                  <option value="arcane">Volt (Arcane)</option>
                </optgroup>
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
          </SettingRow>

          <SettingRow
            label="Reduce motion"
            description="Minimizes transitions and animations throughout the app."
          >
            <Toggle
              checked={reducedMotion}
              onChange={handleReducedMotion}
              label="Toggle reduced motion"
            />
          </SettingRow>
        </Section>

        {/* ── Daily Discovery ─────────────────────────────── */}
        <Section title="Daily Discovery">
          <SettingRow
            label="Space photo of the day"
            description="A new astronomy picture in your Overview sidebar each day, courtesy of NASA."
          >
            <Toggle
              checked={showSpacePhoto}
              onChange={setShowSpacePhoto}
              label="Toggle space photo of the day"
            />
          </SettingRow>

          <SettingRow
            label="Currently reading"
            description="Shows the cover and author for a book you're reading, pulled from the Open Library catalog."
          >
            <Toggle
              checked={showBookCard}
              onChange={setShowBookCard}
              label="Toggle currently-reading book card"
            />
          </SettingRow>

          <SettingRow
            label="Book title"
            description="What to look up for the card above — try matching whatever your Lit/Writ class is reading."
            disabled={!showBookCard}
          >
            <input
              type="text"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              disabled={!showBookCard}
              placeholder="e.g. Romeo and Juliet"
              className="w-44 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </SettingRow>
        </Section>

        {/* ── Audio ───────────────────────────────────────── */}
        <Section title="Audio">
          <SettingRow
            label="Study music"
            description="Volume for background music while you study."
          >
            <VolumeSlider
              value={musicVolume}
              label="Study music volume"
              onChange={(v) => {
                setMusicVolume(v)
                syncToFile({ musicVolume: v })
              }}
              icon={
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              }
            />
          </SettingRow>
          <SettingRow
            label="Sound effects"
            description="Volume for notification sounds and UI feedback."
          >
            <VolumeSlider
              value={sfxVolume}
              label="Sound effects volume"
              onChange={(v) => {
                setSfxVolume(v)
                syncToFile({ sfxVolume: v })
              }}
              icon={
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              }
            />
          </SettingRow>
        </Section>

        {/* ── Display ─────────────────────────────────────── */}
        <Section title="Display">
          <SettingRow
            label="Active school year"
            description="Sets which year and semester the Overview and Grades screens open to."
          >
            <div className="relative">
              <select
                value={selectedYearId}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full appearance-none cursor-pointer rounded-lg border border-border bg-background pl-2.5 pr-8 py-1.5 text-[12px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {mockSchoolYears
                  .filter((y) => y.hasData)
                  .map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.gradeLevel} · {y.yearLabel}
                    </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
          </SettingRow>

          <SettingRow
            label="Grade cutoffs"
            description="Custom letter-grade boundaries coming in a future update."
            disabled
          >
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              Coming soon
            </span>
          </SettingRow>
        </Section>

        {/* ── Data & Privacy ──────────────────────────────── */}
        <Section title="Data & Privacy">
          <SettingRow
            label="What is stored"
            description="Only gradebook metadata: course names, assignment names, scores, and dates. No instructions, file attachments, submissions, discussions, or course content of any kind."
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </SettingRow>

          <SettingRow
            label="Storage location"
            description="All data stays on this device. Nothing is sent to external servers. No account sign-in required."
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </SettingRow>

        </Section>

        {/* ── Schoology ───────────────────────────────────── */}
        <Section title="Schoology">
          <SettingRow
            label="Connection"
            description={
              !scrape ? 'Checking…' :
              scrape.schoology.status === 'error' ? `Error: ${scrape.schoology.error}` :
              scrape.schoology.connected ? `Synced — last updated ${fmtAge(scrape.schoology.dataAgeMs)}` :
              'Not connected. Click Connect — Chrome will open for you to log in.'
            }
          >
            {scrape ? (
              <ConnectButton target="schoology" st={scrape.schoology} onRefresh={loadScrapeStatus} />
            ) : (
              <span className="text-[11px] text-muted-foreground">…</span>
            )}
          </SettingRow>
          <SettingRow
            label="Auto-sync"
            description="Automatically re-syncs every 15 hours and at midnight while this app is running."
          >
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />Active
            </span>
          </SettingRow>
        </Section>

        {/* ── Gmail ───────────────────────────────────────── */}
        <Section title="Gmail">
          <SettingRow
            label="Connection"
            description={
              !scrape ? 'Checking…' :
              scrape.gmail.status === 'error' ? `Error: ${scrape.gmail.error}` :
              scrape.gmail.connected ? `Synced — last updated ${fmtAge(scrape.gmail.dataAgeMs)}` :
              'Not connected. Click Connect — Chrome will open for you to log in.'
            }
          >
            {scrape ? (
              <ConnectButton target="gmail" st={scrape.gmail} onRefresh={loadScrapeStatus} />
            ) : (
              <span className="text-[11px] text-muted-foreground">…</span>
            )}
          </SettingRow>
          <SettingRow
            label="Auto-sync"
            description="Automatically re-syncs every 15 hours and at midnight while this app is running."
          >
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />Active
            </span>
          </SettingRow>
          <SettingRow
            label="Permissions"
            description="Read-only access to inbox metadata — sender, subject, snippet. No message bodies, attachments, or sending."
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </SettingRow>
        </Section>

        {/* ── About ───────────────────────────────────────── */}
        <Section title="About">
          <SettingRow
            label="Better Schoology"
            description="A local-first student dashboard — cleaner, calmer, faster."
          >
            <span className="text-[11px] tabular-nums text-muted-foreground">v0.1.0</span>
          </SettingRow>
        </Section>

      </div>
    </div>
  )
}
