# Better SGY — Install Guide

Better SGY is a Chrome extension that replaces the Schoology dashboard with
something that actually looks good. Takes about 2 minutes to install.

There are two versions — pick one below.

---

## Version 1 — Regular (needs your Schoology login)

This is the real extension. It reads your actual grades and courses. You need
to already have a Schoology account and be logged in for it to work.

**Get the file:** go to the GitHub page below, find the file called
`better-sgy-extension-1.0.0-chrome.zip`, and click to download it.

```
https://github.com/saptarshighosh10-oss/better-sgy
```

*(Click the green Code button → there's no release yet, so ask whoever
shared this with you for the zip directly.)*

---

## Version 2 — Demo (fake data, no login needed) ⭐ try this first

**This one works without a Schoology account.** It comes preloaded with a
full fake gradebook — 6 courses, real-looking grades, teacher messages,
grade history charts — so you can see exactly what the extension looks like
before committing to installing the real one.

**Get the file:** download `Better-SGY-Demo.zip` from the releases page, or
ask whoever shared this for it.

---

## How to install (same steps for both versions)

### 1 — Unzip the file

Find the zip in your Downloads folder and double-click it.
It turns into a regular folder. **Don't delete that folder** — Chrome
needs it to stay there. Move it somewhere safe like your Desktop or
Documents.

### 2 — Open the extensions page in Chrome

Copy and paste this into your Chrome address bar and press Enter:

```
chrome://extensions
```

### 3 — Turn on Developer mode

Look for the **Developer mode** toggle in the top-right corner of that
page. Turn it on. (This just means you're loading an extension manually
instead of from the Chrome Web Store — totally safe.)

### 4 — Load the extension

Click the **Load unpacked** button that appears. A file picker opens —
find and select the folder you unzipped in step 1.

### 5 — You're done

**Regular version:** go to schoology.com and the new UI loads automatically.

**Demo version:** click the puzzle-piece icon 🧩 in your Chrome toolbar,
find "Better SGY — Demo", and open the side panel. Your fake gradebook
loads straight away — no login needed.

> **Tip:** pin Better SGY from the 🧩 toolbar icon so it's always one click away.

---

## Changing the look

Open the Better SGY side panel, scroll down to **Settings → UI style**.
Three options — hit **Switch** to try any of them:

| Style | What it looks like |
|---|---|
| **Halo** ⭐ | Clean and minimal. Recommended for most people. |
| **Forge** | More compact — shows more info per screen. |
| **Slate** | Pure black and white. No color at all. |

Your choice saves automatically.

---

## If something goes wrong

**"Manifest file is missing or unreadable"** — you picked the zip file itself
instead of the unzipped folder. Unzip it first, then try again.

**Nothing changed on Schoology** — go to `chrome://extensions` and make
sure the Better SGY toggle is blue (enabled).

**Demo version shows nothing** — open the side panel from the 🧩 toolbar
icon, not by going to Schoology.

**It stopped working after a Chrome update** — Chrome sometimes turns off
manually-installed extensions. Go to `chrome://extensions` and turn it
back on.

---

<details>
<summary>For developers — building from source</summary>

```bash
git clone https://github.com/saptarshighosh10-oss/better-sgy
cd better-sgy/extension
npm install

npm run build        # regular build → .output/chrome-mv3/
npm run build:demo   # demo build   → .output/chrome-mv3-demo/
npm run zip          # zip regular
npm run zip:demo     # zip demo
```

Load the output folder as an unpacked extension in `chrome://extensions`.

</details>
