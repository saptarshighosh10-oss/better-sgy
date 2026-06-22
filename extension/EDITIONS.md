# Better SGY — How to Install

Better SGY is a Chrome extension that replaces the Schoology dashboard with
something that actually looks good. One install, three looks — you pick the
style in the Settings tab after it's running.

---

## Installing the extension

**You'll need the zip file.** Get `better-sgy-extension-1.0.0-chrome.zip`
from whoever shared this with you (or build it yourself — see bottom of page).

### Step-by-step

1. **Unzip the file** — double-click it. You'll get a folder called
   `better-sgy-1.0.0-chrome` (or similar). Put it somewhere you won't
   accidentally delete it, like your Documents folder.

2. **Open Chrome** and go to **`chrome://extensions`** in the address bar.

3. **Turn on Developer mode** — there's a toggle in the top-right corner of
   that page. Flip it on.

4. **Click "Load unpacked"** — a file picker opens. Navigate to the folder
   you unzipped in step 1 and select it.

5. **Done.** The extension is installed. Go to any Schoology page and the
   new UI loads automatically.

> **Tip:** click the puzzle-piece icon in Chrome's toolbar and pin Better SGY
> so you can open the side panel any time.

---

## Switching looks

Once it's running, open the Better SGY side panel and scroll down to
**Settings → UI style**. Three options:

| Style | What it looks like |
|---|---|
| **Halo** ⭐ | Clean Apple-minimal. Color only where it means something — red for missing work, green for a grade that went up. The default. |
| **Forge** | Dense view. Everything tighter and smaller — more info per screen, less whitespace. Good if you want all your numbers at once. |
| **Slate** | Pure black and white. Zero color, zero ornament. Good for focus. |

Hit **Switch** next to the style you want. It changes instantly and sticks.

---

## Troubleshooting

**"Manifest file is missing or unreadable"** — you selected the zip itself
instead of the unzipped folder. Make sure you unzip first, then load the
folder.

**The UI doesn't appear on Schoology** — make sure the extension is enabled
on the `chrome://extensions` page (the toggle next to it should be blue).

**It stopped working after a Chrome update** — Chrome occasionally disables
unpacked extensions. Go back to `chrome://extensions` and re-enable it.

---

## Building from source (optional)

If you want to build it yourself instead of using the zip:

```
git clone https://github.com/saptarshighosh10-oss/better-sgy
cd better-sgy/extension
npm install
npm run build
```

Then load the `extension/.output/chrome-mv3` folder as "Load unpacked" in
step 4 above.

---

*Better SGY — Halo edition. Branch: `halo`.*
