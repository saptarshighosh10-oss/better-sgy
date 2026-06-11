# Better SGY

A cleaner, faster, student-first redesign of your school's **Schoology** — grades,
assignments, materials, calendar, announcements, and more, all in one calm dashboard.
Runs entirely in your browser; nothing leaves your device.

> 🧪 **This is a test build.** It installs manually (sideload), not from the Chrome Web
> Store yet. Works in **Chrome, Edge, Brave**, or any Chromium browser.

## 📸 Screenshots

<!-- Add a hero image here: drop a PNG into a /docs folder and reference it, e.g.
     ![Better SGY dashboard](docs/dashboard.png)
     Blur out your real name/grades first. A before/after GIF works even better. -->
_Coming soon — a peek at the dashboard. (Want to help? Send a screenshot!)_

## ⬇️ Download & install

> ⭐ **Recommended (developer's pick): Better SGY v2 — the redesign.** The
> `releases/latest` download below *is* the v2 redesign — the version the developer
> prefers and recommends. A lighter alternative that keeps Schoology's original look
> (with the same quality-of-life features) is available on the
> [`improve` branch](../../tree/improve/arcade-split-robustness-calculator) ·
> [PR #1](../../pull/1). The redesign lives in [PR #2](../../pull/2).

1. **[Download the latest release](../../releases/latest)** (`better-sgy-chrome.zip`)
   and unzip it → you'll get a folder with a `manifest.json` inside.
2. Go to **`chrome://extensions`** (Edge: `edge://extensions`).
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** → select the **unzipped folder**.
5. Open your Schoology site (e.g. `yourschool.schoology.com`). Done. 🎉

Full steps and troubleshooting: **[INSTALL.md](./INSTALL.md)**

## 🔒 Privacy & safety

Better SGY reads your Schoology pages using **your own logged-in session** and keeps
everything **on your device** — no accounts, no servers, no analytics, no tracking. It
makes no network requests except to your own Schoology site. See the full
**[privacy policy](./PRIVACY.md)**.

> **Verify it yourself:** the full extension source is in [`extension/`](./extension) —
> read it, or build it from scratch (see below). It only ever talks to your own
> Schoology site.

## 🛠️ Build from source

The full source is in [`extension/`](./extension) — a [WXT](https://wxt.dev) + React
(MV3) project. To build it yourself:

```bash
cd extension
npm install
npm run build      # → extension/.output/chrome-mv3
```

Then load `extension/.output/chrome-mv3` via **Load unpacked**. `npm run zip` packages a
distributable zip. (No license is set yet, so all rights are reserved for now — the
source is published for transparency and testing.)

## 🐞 Feedback

Found a bug? [Open an issue](../../issues) with your browser, the Schoology page/URL, and
what went wrong (a screenshot helps).

## Changelog

See **[CHANGELOG.md](./CHANGELOG.md)**.

---

*Not affiliated with, endorsed by, or sponsored by Schoology or PowerSchool. "Schoology"
is a trademark of its respective owner and is used here only to describe compatibility.*
