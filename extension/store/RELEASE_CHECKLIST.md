# Release checklist — Better SGY

## Already done in the codebase
- [x] Name set to "Better SGY" (manifest + UI), version 1.0.0
- [x] Real store description (no "Phase 0 / Safety Probe" language)
- [x] Icons generated at 16/32/48/128 (`public/icon/`, regenerate with `npm run icons`)
- [x] Toolbar action icon + title
- [x] Dev "fetch experiment" probe removed
- [x] `console.log/info/debug/warn` stripped from the production build
- [x] No analytics / no external servers / data stays local
- [x] Privacy policy written (`store/PRIVACY.md`)
- [x] Listing copy written (`store/LISTING.md`)

## You need to do (outside the code)
1. **Chrome Web Store developer account** — register at
   https://chrome.google.com/webstore/devconsole (one-time $5 fee).
2. **Host the privacy policy** at a public URL (e.g. GitHub Pages, a Gist, or your own
   site) and fill its contact email. Put that URL in the dashboard + in `PRIVACY.md`.
3. **Capture 1–5 screenshots** (1280×800) as listed in `LISTING.md`.
4. **Build the upload zip:** `npm run build && npm run zip`
   → produces `.output/better-sgy-extension-1.0.0-chrome.zip`.
5. **Upload** the zip in the dashboard, paste the listing copy, set the privacy
   practices answers, add screenshots, and submit for review.

## Notes / risks
- "Schoology" is a PowerSchool trademark. The title avoids it ("Better SGY"); the
  description uses it only to state compatibility, with a non-affiliation disclaimer.
  This is the lower-risk approach but is not a guarantee against a takedown request.
- Bundle is ~1.2 MB (three.js powers the Arcade). Well within store limits.
- Review usually takes a few days; extensions with broad host permissions can take
  longer.
