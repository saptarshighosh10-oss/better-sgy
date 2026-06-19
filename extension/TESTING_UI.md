# Testing the UI polish pass

Scope: visual/accessibility/motion only. No scraping, storage, or data changes.

## Build & load

```bash
cd ~/better-schoology/extension && npm run build
```

1. Open `chrome://extensions`
2. Reload **Better Schoology**
3. Open `https://fuhsd.schoology.com/grades/grades`

## What changed (verify each)

| Area | Expect |
|------|--------|
| Theme | Navy/charcoal background, slate cards, blue accent, real course color bands (was grayscale mono) |
| Grade colors | A green · B calm blue · C amber · D orange · F red — an 84% no longer shows as a warning color |
| Overview header | `h1` period label, overall average, **"updated Xm ago"** freshness line (amber + hint if >24h old) |
| Course carousel | No auto-rotation (was every 5s). Swipe, click side cards, dots, or **focus carousel and use ← →** |
| Course cards | Real buttons — Tab to active card, Enter opens gradebook. Flat name band (no gradient scrim) |
| Dots | Bigger hit targets, named (`Show <course>`), `aria-current` on active |
| Grades page | GPA card flat slate (no gradient), selected course has `aria-current`, sidebar uses theme panel color |
| Rename | Visible on row hover **and keyboard focus** (was hover-only). No longer a button-inside-button |
| Gradebook | Chart has flat area fill (no gradient), `role="img"` + label. Category hide/show has `aria-expanded`. Row ⋯ menu: `aria-expanded`, Escape closes. What-if inputs labeled ("Score for X") |
| Smart Priorities | Real `h2`, score toggle `aria-pressed`, missing chip red outline, weight bar animates `scaleX` not `width` |
| Assignments | Filter chips `aria-pressed`, search labeled + clear button, bucket headers are real buttons (keyboard switch) |
| Empty states | No data → headline + **"Open the Grades page"** button. Failed scrape → shows the actual error |
| Error crash | Fallback styled on-palette, native Schoology restored under it |
| Escape hatch | Unchanged location/behavior; now shows focus ring when tabbed to |

## Keyboard pass

Tab through: every button/input shows a 2px blue focus ring. Carousel: ← → switch courses. Gradebook ⋯ menu: Escape closes. Nickname editor: Enter saves, Escape cancels.

## Reduced motion

macOS: System Settings → Accessibility → Display → Reduce motion.
Expect: no page-transition slide, no card/dot/bar transitions, reveal-on-hover controls always visible.

## Regression checks

1. Grades still scrape on `/grades/grades` (console: `[BS] Scrape complete and saved!`)
2. Course selection works (carousel card → gradebook, sidebar rows)
3. What-if editing still updates grade + chart live
4. **Show Original Schoology** (eye icon) → native page; ✨ button returns
5. Reload page — overlay does not duplicate (mount guard log)
6. Mono theme revert: `lib/theme.ts` → `ACTIVE_THEME = 'mono-dark' as Theme`
