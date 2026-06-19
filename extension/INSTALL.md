# Install Better SGY (test build)

A redesigned dashboard for your school's Schoology. This is a pre-release test build,
so it installs manually (not from the Chrome Web Store yet).

> Works in **Chrome, Edge, Brave, or any Chromium browser.**

## Install (2 minutes)

1. **Download** `better-sgy-1.0.0-chrome.zip` from the
   [Releases page](../../releases) and **unzip it.** You'll get a folder
   (e.g. `better-sgy-1.0.0-chrome/`) with a `manifest.json` inside.
2. Open your browser and go to **`chrome://extensions`**
   (Edge: `edge://extensions`).
3. Turn on **Developer mode** (toggle, top-right).
4. Click **Load unpacked** and select the **unzipped folder**.
5. Open your Schoology site (e.g. `yourschool.schoology.com`) and you're in. 🎉

That's it. To turn it off, click **Show Original Schoology** in the floating bar, or
toggle the extension off on the extensions page.

## Notes for testers
- It only runs on `*.schoology.com` and keeps everything **on your device** — no
  accounts, no servers, nothing is sent anywhere.
- Because it's loaded unpacked, Chrome may show a "Disable developer mode extensions"
  popup on startup — that's normal for test builds; just close it.
- It won't auto-update. To get a new version, download the new zip and click the
  **refresh** icon on the extension card (or remove + Load unpacked again).

## Found a bug?
Open an [issue](../../issues) with: your browser, your Schoology page/URL, and what went
wrong (a screenshot helps a lot).
