# Better SGY — Download & Install

Two downloads available. **Start with the Demo** — no Schoology account
needed, shows all three looks instantly.

---

## Which file do I download?

| File | What it is | Needs login? |
|---|---|---|
| **`Better-SGY-Demo.zip`** ⭐ | Try all three styles with fake data | No |
| `better-sgy-extension-1.0.0-chrome.zip` | Real extension, reads your actual grades | Yes |

Get them from the [Releases page](https://github.com/saptarshighosh10-oss/better-sgy/releases)
or ask whoever shared this.

---

## How to install (same four steps for both)

**1 — Unzip it**

Double-click the zip in your Downloads folder. You get a regular folder.
Don't delete it — Chrome needs it to stay there. Move it somewhere safe
like your Desktop or Documents folder.

**2 — Open Chrome extensions**

Copy this into your address bar and press Enter:

```
chrome://extensions
```

**3 — Turn on Developer mode**

There's a toggle in the top-right corner of that page. Flip it on.
(This just means you're installing it manually instead of from the Store —
it's safe.)

**4 — Load the extension**

Click **Load unpacked**, then pick the folder from step 1.

Done. It's installed.

> **Tip:** click the 🧩 puzzle-piece icon in Chrome's toolbar → find
> Better SGY → click the pin so it's always visible.

---

## The Demo version — try all three looks

Open the **Better SGY — Demo** side panel (click its icon in the toolbar).
A fake gradebook loads instantly — 6 courses, real-looking grades, teacher
messages — no login needed.

Scroll to **Settings → UI style** to switch between:

| Style | What it looks like |
|---|---|
| **Halo** ⭐ | Clean and minimal. Color only for real signals — red for missing work, green when a grade goes up. The default. |
| **Forge** | Compact. Tighter layout, more info per screen. |
| **Slate** | Pure black and white. No color at all. |

Hit **Switch** to change it. Your choice saves and carries over to the real
extension if you install that too.

---

## The real extension — your actual grades

Install `better-sgy-extension-1.0.0-chrome.zip` the same way (same four steps),
then go to **your school's Schoology page** (e.g. `yourschool.schoology.com`) —
the redesigned UI loads over your dashboard automatically.
Whatever style you picked in the Demo is already set.

---

## Something not working?

**"Manifest file is missing or unreadable"** — you selected the zip file
instead of the unzipped folder. Unzip it first, then try again.

**Demo shows nothing** — open it from the 🧩 toolbar icon. The demo side
panel works on any page, not just Schoology.

**Real extension: nothing changed on Schoology** — go to
`chrome://extensions` and check the toggle next to Better SGY is blue.

**Chrome keeps popping up "Disable developer mode extensions"** — that's
normal for manually-installed extensions. Just close the banner. It's safe
to ignore.

**Stopped working out of nowhere** — Chrome sometimes disables manually-
installed extensions after an update. Go to `chrome://extensions` and
turn it back on.

---

<details>
<summary>For developers — building from source</summary>

```bash
git clone https://github.com/saptarshighosh10-oss/better-sgy
cd better-sgy/extension
npm install

npm run build        # real build  → .output/chrome-mv3/
npm run build:demo   # demo build  → .output/chrome-mv3-demo/
npm run zip          # zip real
npm run zip:demo     # zip demo
```

Load the output folder as an unpacked extension.

**Branch notes:**
- `halo` — the active branch. Halo/Forge/Slate are all switchable in Settings.
- `feature/minimalist-mode` / `main` — older separate codebases, not maintained.
  The styles from those branches are now built into `halo` as UI style options.

</details>
