# Design

## Theme

A compact, data-dense student dashboard built to feel personal and crafted. The default palette is indigo-tinted ("Calm Scholar") with a full theme system: four Invincible character themes (Mark, Eve, Thragg, Omni-Man) and two monochrome modes. Dark and light both ship. All color is OKLCH; themes swap cleanly via class on `<html>`. Grade data uses semantic color (emerald → red by performance band). Mood is calm and focused by default, personality injected via themes.

## Colors

### Palette (default: Calm Scholar)

| Token | Light (OKLCH) | Dark (OKLCH) | Role |
|---|---|---|---|
| `--background` | 0.985 0.005 95 | 0.14 0.015 268 | Page surface |
| `--foreground` | 0.155 0.012 268 | 0.965 0.004 268 | Body text |
| `--card` | 1 0 0 | 0.19 0.018 268 | Card surface |
| `--primary` | 0.52 0.155 268 | 0.70 0.15 268 | Indigo — CTAs, active nav, rings |
| `--muted-foreground` | 0.50 0.02 268 | 0.62 0.02 268 | Secondary labels, metadata |
| `--accent` | 0.78 0.14 72 | 0.78 0.14 72 | Amber — warm secondary accent |
| `--destructive` | 0.62 0.14 18 | 0.72 0.18 18 | Errors, missing assignments |
| `--success` | 0.64 0.13 148 | 0.70 0.13 148 | High grades, positive states |
| `--border` | 0.91 0.01 268 | oklch(1 0 0 / 10%) | Dividers, card outlines |

### Grade semantic colors

```
≥ 93% → text-emerald-600 / dark:text-emerald-400
≥ 90% → text-green-600 / dark:text-green-400
≥ 87% → text-lime-700 / dark:text-lime-400
≥ 83% → text-amber-600 / dark:text-amber-400
≥ 80% → text-orange-500 / dark:text-orange-400
< 80% → text-red-500 / dark:text-red-400
```

### Per-course chart palette

Six fixed hues map to the six courses (indigo, emerald, amber, violet, cyan, orange). Used as dot colors, trend lines, and top-of-card accent stripes.

### Theme system

Eight themes total: `light`, `dark`, `mono-light`, `mono-dark`, `mark` (dark navy + electric yellow), `eve` (light + hot pink), `thragg` (near-black + blood red), `omni-man` (white + bright red). Applied as classes on `<html>`; `mark` and `thragg` also add `.dark` for base dark-mode utilities.

## Typography

| Role | Font | Weight | Size | Notes |
|---|---|---|---|---|
| Body / UI | Figtree (`--font-sans`) | 400–600 | 11–14px | Set as `font-sans` globally |
| Mono | Geist Mono | 400 | 11–12px | Code, tabular data |
| Grade display | Figtree | 700–900 | 20–64px | `tabular-nums`, `leading-none` |
| Section labels | Figtree | 600 | 10–11px | `uppercase tracking-wider`, max 4 words |

### Scale in practice

- `text-[10px]` / `text-[11px]` — metadata, unit labels, category names
- `text-xs` (12px) — secondary body, timestamps
- `text-sm` (14px) — primary body, nav labels, card subtitles
- `text-base` (16px) — not common; used sparingly
- `text-lg`–`text-xl` — section headings, course name in detail view
- `text-4xl` — current grade in course detail header
- `text-[32–64px]` — letter grade watermark / band display (adaptive to word length)

## Spacing

Base unit 4px (Tailwind default). Common patterns:

- Card padding: `px-5 py-4` (20px / 16px)
- Section gap: `gap-4` (16px) between major panels
- Compact row: `px-4 py-2` or `py-2.5`
- Inline gap within rows: `gap-2` or `gap-1.5`

No bespoke spacing scale; sticks to Tailwind 4px grid throughout.

## Radius

Base: `--radius: 0.75rem` (12px). Scaled set:

- `rounded-sm`: ~7px — small chips, inline badges
- `rounded-md`: ~10px — inputs, small buttons
- `rounded-lg`: 12px — standard cards
- `rounded-xl`: ~17px — primary card surface (most used)
- `rounded-2xl`: ~22px — section panels, drawers
- `rounded-full`: pills, tags, avatar-style elements

## Shadows

Minimal — the design relies on `border` for card separation rather than shadows. Drop shadows appear only in:
- SVG tooltip: `filter="drop-shadow(0 1px 4px rgba(0,0,0,.15))"`
- Song info panel: `shadow-2xl`

No ghost-card pattern (border + large shadow) used anywhere.

## Motion

### Keyframe animations (defined in globals.css)

| Name | Duration | Curve | Use |
|---|---|---|---|
| `detail-in` | 0.32s | `cubic-bezier(0.22,1,0.36,1)` | Course detail page enter |
| `grid-card-out` | — | — | Course grid exit before detail |
| `musicBar` | 0.5s+ | ease-in-out alternate | Music visualizer bars |
| `chip-float` | — | ease-in-out | Mascot idle bob |
| `particle-rise` / `particle-drift` | — | — | Mascot celebration particles |
| `familyBobAnim` | — | ease-in-out | Family sprite idle |
| `capeSway` | — | ease-in-out | Cape element on sprites |
| `cameraFlashAnim` | — | — | Flash overlay on family sprite |
| `eveGlowAnim` | — | ease-in-out | Eve glow pulse |

### Reduced motion

`.reduce-motion` class cuts all animation/transition durations to 0.01ms. Applied globally; all animations must degrade gracefully behind it.

## Components

### App shell

Fixed left sidebar (nav + mascot section) + fixed top header bar (12px height) + scrollable main content. On mobile: sidebar hidden behind hamburger toggle. Sidebar and topbar use `bg-card border-border`.

### Course card

Two display modes: a colored band (letter grade watermark + course name on colored bg, grade beside) and a standard card (border + bg-card). Clicking opens a course detail view with slide-in animation. Grade displayed at `tabular-nums font-bold` with semantic color.

### Grade timeline chart (SVG inline)

Running grade-over-time line chart. X-axis: due dates. Y-axis: cumulative weighted grade %. Two lines when what-if is active: original (white/dimmed, 50% opacity, dashed) and what-if (course color, 75% opacity). Dots on each point; hover tooltip with assignment name, grade, category. Zoom/pan/scrubber controls. Renders inside a `overflow-x-auto` wrapper.

### What-if calculator

Below the chart. Lists all scored assignments with editable score inputs. Hypothetical assignments can be added per category. Overrides flow up to both the grade display and the chart in real time.

### Song info panel

`createPortal` drawer anchored to `document.body`. `z-[200]` backdrop, `z-[210]` drawer. Slides in from the right (`translate-x-0` / `translate-x-full`). Width 420px, full-screen mode available. Contains album art hero, artist bio, up-next, and visualizer bars.

### Screensaver

Full-screen fixed overlay (`z-[9999]`). Activates after 1 hour of inactivity in Butcher preset. Dismissed on click or Escape. Shows `/screensaver-vought.png`.

### Topbar

12px height. Left: hamburger (mobile), year/semester selectors. Right: missing badge, refresh status dot, fullscreen toggle, refresh button + demo-state dropdown.

### Mascot / chip zone

Preset-aware. Butcher preset: state-based photorealistic image (angry/smirk/happy keyed to grade state). Neutral preset: Rive animation (`MascotRive`). Sidebar shows chibi variant in Butcher preset, Rive mascot + "Chip · your study sidekick" in neutral.

## Iconography

Inline SVG icons throughout (no external icon library in primary UI). All icons: `viewBox="0 0 24 24"`, `stroke="currentColor"`, `strokeWidth="2"`, `strokeLinecap="round"`. Size: 12–20px depending on context. `aria-hidden="true"` on all decorative icons.

## Layout patterns

- Main grid: `grid-cols-1 gap-4 xl:grid-cols-[1fr_520px]` — single column → two-column with fixed-width right panel at xl+
- Overview course grid: `grid-cols-1 gap-3 sm:grid-cols-2`
- Stat row: `flex items-stretch divide-x divide-border` — horizontal stat cells with vertical dividers
- Assignment list rows: `flex items-center gap-2` with min-w-0 truncated label + right-aligned value

## Data visualization

- Grade timeline: inline SVG line chart (see component above)
- Category bars: `h-1.5 w-full overflow-hidden rounded-full bg-muted` with colored fill div
- Semester progress: `h-1 rounded-full` progress bar on course card
- Course trend sparkline: uses `course.trendData` array for delta calculation
