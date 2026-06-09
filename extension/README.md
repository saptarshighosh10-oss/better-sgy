# Better Schoology — Chrome Extension (Phase 0)

A WXT-based Chrome MV3 extension that overlays a cleaner UI on top of `fuhsd.schoology.com`.

## Phase 0 — Safety / Proof Spike

This is a **non-destructive proof of concept**. It does not:
- Scrape or store grades
- Replace the Schoology dashboard
- Integrate with Gmail, Drive, or any external service
- Use `chrome.storage.sync` or telemetry

### What it does

1. **Shadow DOM overlay** — Mounts an isolated React app inside a Shadow DOM on Schoology pages
2. **Escape hatch** — A "Show Original Schoology" button (outside React) that instantly toggles back to native Schoology
3. **Safe DOM hiding** — Hides specific Schoology containers (never `document.body`), preserving original inline styles for exact restoration
4. **Single-mount guard** — Prevents duplicate overlays on SPA navigation or extension reload
5. **ErrorBoundary** — If React crashes, native Schoology is automatically restored
6. **Debug panel** — Shows diagnostics: extension loaded, path, mount count, containers found, DOM readable, storage test, native UI state

### Architecture

```
extension/
├── entrypoints/
│   ├── background.ts              # MV3 service worker (ping/pong)
│   └── schoology.content.ts       # Content script (Shadow DOM + React mount)
├── components/
│   ├── App.tsx                    # Root React component
│   ├── DebugPanel.tsx             # Debug diagnostics panel
│   └── ErrorBoundary.tsx          # React error boundary
├── lib/
│   └── dom-takeover.ts            # Native UI hide/restore
├── wxt.config.ts                  # WXT configuration
├── tsconfig.json                  # TypeScript config
├── package.json                   # Extension dependencies
├── README.md                      # This file
└── TESTING_PHASE_0.md             # Testing guide
```

### Quick start

```bash
cd extension
npm install
npm run dev        # WXT dev mode with HMR
npm run build      # Production build
npm run typecheck  # Type checking
```

See [TESTING_PHASE_0.md](./TESTING_PHASE_0.md) for full testing instructions.
