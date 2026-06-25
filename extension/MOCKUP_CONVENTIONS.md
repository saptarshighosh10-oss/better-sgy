# Mockup conventions (shared across all editions)

These keep the four editions, the adaptive portable widget, and the website
debug hub interoperable. Today = Mon Jun 22 2026. Data lives in MOCKUP_DATA.md.

## Editions
ids: `apple`, `halo`, `slate`, `forge` (forge = the Friendly edition).
Files: `mockup-app-<id>.html`, `mockup-portable-<id>.html`, `mockup-overview-<id>.html`.

## Active edition (for "detect what mode it's on")
- localStorage key: `bsgy-edition` = one of apple|halo|slate|forge.
- Each app WRITES this key on load and whenever the edition is changed in Settings.
- The adaptive widget `mockup-portable.html` READS it (with `?mode=` query override) to theme itself.

## Deep linking (for the debug hub)
- Apps read `?screen=<id>` on load and open that screen. screen ids:
  `overview, grades, assignments, calendar, announcements, materials, games, settings`.
- Apps may also read `?game=<id>` to open a specific arcade game.
- Adaptive widget reads `?mode=apple|halo|slate|forge` and `?open=1`.

## Global search (⌘K command palette)
- Open with ⌘K / Ctrl+K; close with Esc.
- Searches: courses, assignments, announcements, materials, screens. Enter jumps to the result.

## Keyboard shortcuts
- `?` opens a shortcuts help overlay.
- `g` then a letter jumps screens: o=overview, g=grades, a=assignments, c=calendar, n=announcements, m=materials, e=games, s=settings.
- `⌘K`/`Ctrl+K` = search. `Esc` closes overlays.

## Arcade
- localStorage best-score keys namespaced per edition, e.g. `bsgy-<id>-arcade`.
- Every game: keyboard + click/tap, restart, win/lose overlay, best score saved.
