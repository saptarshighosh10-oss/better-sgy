# Better SGY — Install Guide

This makes Schoology actually look good. Takes about 2 minutes to install.

---

## What you need

Just the zip file — ask whoever sent you this for
**`better-sgy-extension-1.0.0-chrome.zip`**.

---

## How to install

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
page. Turn it on. (It just means you're loading an extension manually
instead of from the Chrome Web Store — totally safe.)

### 4 — Load the extension

Click the **Load unpacked** button that appears after you turn on
Developer mode. A file picker opens — find and select the folder from
step 1.

### 5 — You're done

Go to schoology.com and the new UI loads automatically.

> **Can't find it?** Click the puzzle-piece icon 🧩 in your Chrome toolbar
> and pin Better SGY so it's always one click away.

---

## Changing the look

Open the Better SGY side panel, scroll down to **Settings**, and look for
**UI style**. You'll see three options — hit **Switch** to try any of them:

- **Halo** — clean and minimal, recommended for most people
- **Forge** — shows more information, more compact
- **Slate** — black and white only, no color at all

Your choice saves automatically.

---

## If something goes wrong

**Nothing changed on Schoology** — go back to `chrome://extensions` and
make sure the Better SGY toggle is turned on (it should be blue).

**"Manifest file is missing or unreadable"** — you picked the zip file
itself instead of the unzipped folder. Unzip it first, then try again.

**It stopped working out of nowhere** — Chrome sometimes turns off
manually-installed extensions after an update. Go to
`chrome://extensions` and turn it back on.

---

<details>
<summary>For developers — building from source</summary>

```
git clone https://github.com/saptarshighosh10-oss/better-sgy
cd better-sgy/extension
npm install && npm run build
```

Load `extension/.output/chrome-mv3` as an unpacked extension.

</details>
