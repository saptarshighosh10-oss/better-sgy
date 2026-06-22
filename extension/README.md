# Better SGY — Extension

> **For install instructions, see [EDITIONS.md](./EDITIONS.md) or the
> [root README](../README.md).**

WXT / React / Chrome MV3 extension. Built on the `halo` branch.

## Dev setup

```bash
npm install
npm run dev        # dev build with HMR
npm run build      # production build → .output/chrome-mv3/
npm run build:demo # demo build       → .output/chrome-mv3-demo/
npm run zip        # zip real build
npm run zip:demo   # zip demo build
npm run typecheck  # tsc --noEmit
```

Load `.output/chrome-mv3/` (or `chrome-mv3-demo/`) as an unpacked extension
in `chrome://extensions` with Developer mode on.

## Key files

```
entrypoints/
  background.ts              service worker — grade polling, alarms, notifications
  schoology.content.ts       main content script — renders full UI on Schoology
  floatingwidget.content.ts  floating grade card on non-Schoology pages
  sidepanel/                 Chrome side panel page

components/
  SidePanel.tsx              side panel UI — grades, activity, settings
  QuickNav.tsx               ⌘K fuzzy-search nav drawer
  GlobalStyles.tsx           shared CSS keyframes + utility classes
  pages/                     full-page views (Overview, Grades, Assignments…)
  halo-ui.tsx                shared Halo design primitives

lib/
  halo.ts                    design tokens (type scale, radii, surfaces)
  theme.ts                   theme system (Original / Mono Light / Mono Dark)
  settings.ts                user settings (notifications, edition, poll interval…)
  demo-data.ts               fake gradebook data for the Demo build
  grade-changes.ts           detect + store grade moves between scrapes
  safe-url.ts                URL allowlist (blocks javascript: / data: etc.)
```
