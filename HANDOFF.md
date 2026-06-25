# Better Schoology — AI Handoff Document

## What this project is
A personal student dashboard that scrapes live data from the user's FUHSD Schoology account and surfaces grades, assignments, and activity in a better UI. Built for one real student (Sophomore, 2025–2026 school year). Not mock data — everything shown is real scraped data.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router), React 19 |
| Styling | Tailwind v4 + shadcn/ui |
| State | Zustand (`store/use-app-store.ts`), persisted to `localStorage` key `bs-store` |
| Fonts | Figtree (primary), Geist / Geist Mono |
| Animations | CSS keyframes + Rive (`@rive-app/react-canvas`) |
| Scraping | Puppeteer-core (headless browser → Schoology) |
| Music | Apple Music API + Spotify (osascript) |
| Email | Gmail API (OAuth) |
| Colors | OKLCH throughout, 12 themes |

---

## Hard constraints (never break these)
- Separate Remotion video project lives at `~/better-schoology-videos` — never touch it unless explicitly asked
- Do not run full build after every small visual edit — TypeScript check (`npx tsc --noEmit`) is enough
- Keep all dashboard work inside `~/better-schoology`

---

## Navigation (pages)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/overview` | `overview-client.tsx` | Main dashboard: grade cards, SmartPriorities, music, missing/upcoming |
| `/grades` | `grades-client.tsx` | Per-course gradebook with what-if calculator |
| `/assignments` | `assignments-client.tsx` | Filterable assignment list |
| `/gradegraph` | `gradegraph-client.tsx` | Grade trend sparklines per course |
| `/game` | `game/page.tsx` | Grade Breaker arcade game |
| `/emails` | `emails-client.tsx` | Important Schoology emails (Gmail scrape) |
| `/settings` | `settings-client.tsx` | Theme, preset, motion, sync controls |

---

## Data flow

```
Schoology website
  ↓ Puppeteer (lib/scraper/scrape-schoology.ts)
data/grades-data.json        ← structured grade data
data/activity-data.json      ← home feed (graded/missing/upcoming)

/api/grades      → useSchoolYears() hook → all grade components
/api/activity    → RecentUpdates, MissingSection (extra items), OverviewClient
/api/scrape      ← user-triggered refresh from topbar
/api/music/*     ← Apple Music / Spotify control via osascript
/api/emails      ← Gmail API
```

`useSchoolYears()` (`lib/use-grades.ts`) is a module-level singleton cache — one fetch per page load, all subscribers update together on refresh.

---

## Core types (`lib/types.ts`)

```ts
SchoolYear → Semester[] → Course[]
  Course: { id, name, teacher, period, grade, letterGrade, color, categories, trendData }
  Category: { id, courseId, name, weight, assignments }   // weight = % of overall grade (0–100)
  Assignment: { id, name, courseId, categoryId, categoryName,
                score: number|null, pointsPossible, percent, status, gradedDate, dueDate }
  // status: 'normal' | 'missing' | 'late' | 'excused' | 'submitted' | 'incomplete'

ActivityItem  // from Schoology home feed (scrape-activity.ts)
  { id, assignmentName, courseName, type, score?, dueTimestamp? }
  // type: 'graded' | 'submitted' | 'missing' | 'late' | 'upcoming'
```

---

## Global state (`store/use-app-store.ts`)

Persisted fields: `selectedYearId`, `selectedSemesterId`, `preset`, `reducedMotion`, `musicVolume`, `sfxVolume`, `readEmailIds`

Ephemeral fields: `sidebarOpen`, `refreshState`, `lastUpdated`, `unreadEmailCount`, `songInfoOpen`

---

## Theme system

12 themes defined in `app/globals.css` with OKLCH CSS variables, applied via `data-theme` on `<html>`.

Sidebar button cycles: light → dark → mono-light → mono-dark  
Full 12-theme switching is in Settings.

| Theme | Notes |
|-------|-------|
| `light` / `dark` | Default indigo-tinted |
| `mono-light` / `mono-dark` | Grayscale |
| `mark` / `eve` | The Boys |
| `thragg` / `omni-man` | Invincible |
| `cyberpunk` / `minecraft` / `stranger-things` / `arcane` | Pop-culture |

---

## Mascot system

Selected via `preset` in Zustand store. Appears in sidebar bottom + overview right panel banner.

| Preset | Type | Notes |
|--------|------|-------|
| `neutral` | Rive (Chip) | Animated cat, mood shifts with `missingCount` |
| `butcher` | PNG set | 5 images keyed to grade state. Sidebar always uses `butcher-chibi.png` |
| `allen` | SVG sprite | Allen the Alien, bob + blink animations |
| `cyberpunk` | SVG sprite | Nyx |
| `minecraft` | SVG sprite | Cube |
| `stranger-things` | SVG sprite | Wren |
| `arcane` | SVG sprite | Volt |

Registry: `components/mascot/preset-mascots.tsx` — each entry has `Sprite`, `sidebarCaption`, `bannerTitle`, `bannerSubtitle`.

---

## Overview page layout

```
px-5 py-5
├── Page header (year · grade level · semester label)
├── AnalyticsStrip (full-year only: GPA, streak, trend)
└── xl:grid-cols-[1fr_520px]
     ├── LEFT COLUMN (section)
     │    ├── "Grade Summary" header
     │    ├── grid grid-cols-2 — CourseCard × N (stagger animation)
     │    ├── Semester stat bar (dates · courses · avg · missing · late)
     │    └── SmartPriorities
     └── RIGHT PANEL (aside, flex flex-col gap-4)
          ├── Mascot banner (preset-aware)
          ├── StudyMusic
          ├── MissingSection
          └── UpcomingSection (flex-1 → fills remaining height)
```

Grid default is `align-items: stretch` — left column is intentionally taller (SmartPriorities adds height), right panel fills to match via `flex flex-col` + `flex-1` on UpcomingSection.

---

## SmartPriorities (`components/overview/smart-priorities.tsx`)

Ranks missing/late assignments by grade impact. White-line monochrome design (no course colors, no colored grade delta text, outline status pills, 1px progress bars, underline score toggle).

**Algorithm:**
```
impact = (assignment.pointsPossible / totalCategoryPoints) * categoryWeight

deltaAt(assumedPct) =
  (assumedPct/100 - currentCategoryAvg) * (pointsPossible / totalCatPts) * categoryWeight
```

`currentCategoryAvg` = scored-only assignments (missing excluded from current grade).  
Score toggle: 70 / 80 / 90 / 100% — updates delta live.  
Sorted by `impact` descending. Shows top 8.

---

## Grade Breaker game (`/game`, `components/game/grade-breaker-game.tsx`)

Canvas breakout game. All physics in a single `useRef` (avoids re-renders during 60fps loop). React state (`setUi`) only called on brick hit, life lost, phase change.

**3 levels:**
1. Missing/late only — 3 cols, slow ball (`baseSpeed: 4.2`)
2. All unscored — 4 cols, medium (`baseSpeed: 4.8`)
3. Full gradebook — 5 cols, fast (`baseSpeed: 5.5`, cap 30 bricks)

**Brick tiers** (from `pointsPossible`):
- Low (≤10 pts): 1 hit, 5 pts
- Med (11–50 pts): 1 hit, 10 pts
- High (>50 pts): 2 hits, 25 pts — yellow HP pip, dashed crack on first hit

**Ball speed:** increases `speedPerHit` per brick, capped at `maxSpeed`. Paddle + ball glow shifts indigo → yellow → red with speed.

Nav entry in sidebar between GradeGraph and Important Emails.

---

## Music system

### StudyMusic (`components/overview/study-music.tsx`)
Full player in the overview right panel. Polls `/api/music/status` every 3s. Shows album art (iTunes API fallback), track info, controls, playlist accordion, artist bio, "Up Next" track.

### MusicWidget (`components/layout/music-widget.tsx`)
Floating pill at `fixed bottom-3 right-3`. Always visible across all pages. Expands to show Shuffle / Before / Play-Pause / Skip / Repeat controls + song info button. Labeled "Skip" for next.

### TopbarMusic (inside `components/layout/topbar.tsx`)
**[Added this session]** Compact now-playing strip centered in the topbar. Shows animated bars (primary color) when playing, track title + artist, and inline prev/play/next buttons. Switches to bold/highlighted style (`bg-primary/8`, `font-semibold`) when playing. Hidden when no player detected. Uses its own 3s poll.

### Music control API (`app/api/music/control/route.ts`)
Uses `osascript` to send AppleScript commands to Apple Music or Spotify.  
**Important:** After a control action, wait **800ms** before re-polling status (not 400ms) — Apple Music needs time to actually change state. Both StudyMusic and MusicWidget use this delay.

---

## Key file map (current)

```
app/
  (dashboard)/
    layout.tsx                → Sidebar + Topbar + ScrapeStatusBar + MusicWidget + LayoutExtras
    overview/page.tsx
    grades/page.tsx
    assignments/page.tsx
    gradegraph/page.tsx
    game/page.tsx             ← Grade Breaker (added)
    emails/page.tsx
    settings/page.tsx
  api/
    grades/route.ts           → serves data/grades-data.json
    activity/route.ts         → serves data/activity-data.json
    scrape/route.ts           → triggers Puppeteer scrape
    music/status/route.ts     → AppleScript status query (Music + Spotify)
    music/control/route.ts    → AppleScript control (next/prev/toggle/shuffle/repeat/play-track)
    music/playlists/route.ts
    music/tracks/route.ts
    music/artist/route.ts     → Wikipedia bio
    music/output/route.ts     → current audio output device
    emails/route.ts

components/
  layout/
    sidebar.tsx               → nav (7 items), mascot, theme cycle button
    topbar.tsx                → year/sem selectors, TopbarMusic, refresh status, sync button
    music-widget.tsx          → floating bottom-right music controls
    scrape-status-bar.tsx     → live scrape progress banner
    layout-extras.tsx         → Butcher screensaver (preset-conditional)
  overview/
    overview-client.tsx       → main page orchestrator
    course-card.tsx           → grade card, 3D tilt, sparkline
    analytics-strip.tsx       → full-year GPA/streak stats bar
    smart-priorities.tsx      → missing work ranked by grade impact (white-line design)
    study-music.tsx           → full music player in right panel
    missing-section.tsx       → overdue assignments list
    upcoming-section.tsx      → assignments due in 7 days (fill prop stretches to fill height)
    recent-updates.tsx        → activity feed (not shown in overview currently — unused)
    grade-breaker.tsx         → legacy stub (not used — game moved to /game)
  game/
    grade-breaker-game.tsx    → full breakout game (3 levels, canvas)
  mascot/
    mascot-rive.tsx           → Chip (Rive file: public/animations/chip.riv)
    preset-mascots.tsx        → MASCOT_PRESETS registry
    allen-sprite.tsx          → Allen SVG sprite
    family-sprite.tsx         → Family Guy characters SVG
    theme-mascots.tsx         → Nyx/Cube/Wren/Volt SVGs
  shared/
    song-info-panel.tsx       → full-screen song info overlay (artist bio, Up Next)

lib/
  types.ts                    → all TypeScript types
  use-grades.ts               → module-level cache + hook
  use-connection.ts           → checks Schoology session state
  scraper/
    scrape-schoology.ts       → Puppeteer → grades-data.json
    scrape-activity.ts        → Puppeteer → activity-data.json
    sessions.ts               → singleton Puppeteer browser, FUHSD SSO login
    scheduler.ts              → auto-refresh interval

store/
  use-app-store.ts            → Zustand store

public/
  animations/chip.riv         → Rive file for Chip mascot
  mascot/                     → Butcher PNGs (angry/smirk/happy/chibi/couch)
```

---

## Animation system (`app/globals.css`)

| Keyframe | Used for |
|----------|----------|
| `card-slide-up` | Course cards stagger entrance |
| `panel-fade-in` | Right panel sections fade from right |
| `mascot-spring-in` | Mascot spring bounce on load |
| `chip-float` | Mascot idle float (sidebar + banner) |
| `chip-bubble-in` | Speech bubble pop-in |
| `musicBar` | Animated equalizer bars in MusicWidget + TopbarMusic |
| `detail-in` | Slide-up for detail panels |

Course cards have a 3D tilt on hover (`rotateX`/`rotateY` via `handleMouseMove`). Respects `reducedMotion` from store.

---

## What the user is like
- High school Sophomore, real live data
- Casual, fast messages, shorthand ("i" not "I", minimal punctuation)
- Will say "change back to the old one" — always be ready to revert
- Confirms what they like without elaborating: "yeah i like that"
- Reports visual bugs by describing what they see, not the code
- Dislikes clutter: "there is like so much going on"

---

## Recent changes log (newest first)

### Session: 2026-06-07 (current)

**Topbar mini music player** (`components/layout/topbar.tsx`)
- Added `TopbarMusic` component inline in topbar, centered in the `flex-1` spacer
- Shows animated primary-colored equalizer bars when playing, muted music icon when paused
- Displays track title (`font-semibold`) + artist, truncated to 180px
- Inline prev/play/next buttons
- Whole pill gets `bg-primary/8` background when playing for visual weight
- Hidden (`sm:hidden` → only `sm:flex`) when no player detected

**Music skip/next fix** (`study-music.tsx`, `music-widget.tsx`)
- Bumped post-control status re-poll from 400ms → 800ms
- Apple Music needs ~600–800ms to actually advance the track before osascript reports the new state

**CODEBASE.md** — created then deleted (consolidated into this file)

### Session: 2026-06-07 (previous, before context compaction)

**SmartPriorities white-line redesign** (`components/overview/smart-priorities.tsx`)
- No course colors anywhere — fully monochrome
- Grade delta text: plain `text-foreground`, no green/red tinting
- Status pills: `border border-border` outline only, no fill
- Score toggle: underline style (`border-b-2`) instead of filled pill
- Progress bars: 1px `bg-border/60` track, 1px `bg-foreground/25` fill
- Impact formula: `(pointsPossible / totalCatPts) * categoryWeight`
- Delta formula: `(assumedPct/100 - catAvg) * (pp/totalCatPts) * weight`

**Grade Breaker game** (`components/game/grade-breaker-game.tsx`, `app/(dashboard)/game/page.tsx`)
- Full canvas breakout, all state in `useRef` (no re-renders during game loop)
- 3 levels keyed to assignment status (missing-only → unscored → all)
- Brick tiers from `pointsPossible`: low (≤10) / med (11–50) / high (>50, 2 hits)
- Speed ramps per brick hit, capped per level; glow shifts indigo → yellow → red
- Added sidebar nav item between GradeGraph and Important Emails
- TypeScript literal type bug fixed: `G` ref typed explicitly so `currentSpeed` is `number` not `4.2`

**Overview layout simplification**
- Removed DailyDiscovery (NASA APOD + book card) entirely
- Removed RecentUpdates from aside (component still exists but unused in layout)
- UpcomingSection: added `fill` prop (`flex-1 flex flex-col`) to stretch card to fill remaining aside height
- "Nothing due this week" text: centered with `flex h-full items-center justify-center`
- Aside: `flex flex-col gap-4` so UpcomingSection fills via `flex-1`
- Grid: no `xl:items-start` — default stretch keeps both columns same height

**Overview empty space fix**
- Root cause: CSS grid `align-items: stretch` made shorter column inflate with empty space
- Solution: Made left column taller (SmartPriorities below course cards) + right panel fills via flex

**RecentUpdates reverted**
- User rejected full card-grid redesign (score parsing, grade impact delta)
- Reverted to original simple `divide-y` list: dot + name + course + date + type label + score
- No `courses` prop, no delta calculation
