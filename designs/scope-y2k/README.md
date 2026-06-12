# Scope OS — Y2K-era Schoology

This is the **Y2K-era Schoology** concept: the whole grade dashboard reimagined as a
retro late-90s operating system ("SCOPE OS"), with a fake boot sequence, CRT-flavored
visuals, and every feature presented as a `.SYS` program.

**This is a heavily themed design.** If you prefer a less themed, cleaner UI, choose
the other ones — the regular extension builds on the [`main`](../../../../tree/main)
branch and the [`redesign/v2-ui`](../../../../tree/redesign/v2-ui) branch.

## Run it

Open `Scope_Y2K_v18_full_os.html` in any browser. It's a single self-contained file —
fonts and code are bundled inside, nothing is fetched from the network, and all data
is authored mock data shaped 1:1 like the extension's real scrapers.

## What's inside

| Tab | What it does |
| --- | --- |
| `GRADES.SYS` | Course "fleet" with a live what-if console — type over any score and the graph, GPA, pods and Smart Priorities all recalculate |
| `MISSING.SYS` | Missing / to-do / done bays with search and course filters |
| `MATERIALS.SYS` | Folder-tree manifest per course with pinned folders |
| `NOTIFY.SYS` | Inbox + "what changed" rail + full-transmission modal, with live incoming toasts |
| `CALENDAR.SYS` | Month grid built from the same assignment data |
| `STUDY.SYS` | Grounded flashcards — every card cites its source slides |
| `ARCADE.SYS` | Four playable cartridges: Traffic Run, Grade Breaker, Caveman Canyon Run, Neon Protocol |
| `CONFIG.SYS` | Display toggles (motion, scanlines, ads, alerts) saved to localStorage |

## This build (v18, fixed)

Replaces the earlier v16/v17/v18 uploads. On top of the v18 feature set it fixes:

- Enter key no longer swallowed OS-wide after boot (buttons are keyboard-usable)
- Smart Priorities is computed live from the what-if model instead of hardcoded
- AP Calc grade data made self-consistent (93.8%) across header, graph and feed
- Honest weighted GPA (AP +1.0, Honors +0.5) instead of a flat +0.8
- DUE TODAY pod derived from real assignment data
- All scraped-shaped strings escaped before `innerHTML` + announcement HTML sanitized
  (port-safety for the real extension)
- Boot-screen intervals/listeners torn down after launch; no duplicate ids during the
  split animation
- Keyboard access + focus management: pillars, folders, notification rows, bays and
  the notice modal
- The three arcade games from the previous `v18_arcade` build merged back in alongside
  Traffic Run
