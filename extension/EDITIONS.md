# Better SGY — Download & Install

**Better SGY doesn't replace Schoology — it redraws your real Schoology page
on top of itself.** Same login, same grades, a cleaner view drawn over the
page you already use. Nothing moves; the numbers come from the same place.

**Start with the Demo.** It shows exactly that overlay, loaded with sample
grades, so you can see how it works without a Schoology account. Install the
real version after, to see your own grades.

---

## Which file do I download?

| File | What it is | Needs login? |
|---|---|---|
| **`Better-SGY-Demo.zip`** ⭐ | Fake demo grades loaded in — no login needed | No |
| `better-sgy-extension-1.0.0-chrome.zip` | Log into Schoology normally — shows your real grades | Yes |

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

## The Demo — see the overlay, no login

Open the **Better SGY — Demo** side panel (click its icon in the toolbar).
A sample gradebook loads instantly — 6 courses, real-looking grades, teacher
messages — no login needed. This is the same view the real extension draws
over your Schoology; only the grades are fake.

**Try the looks.** Go to **Settings → UI style** to switch between the four
designs, or open the **Versions** tab to browse every look the project has
been through:

| Look | What it's like |
|---|---|
| **Apple** | Spare and confident. Lots of space, one calm blue. |
| **Halo** ⭐ | Clean and minimal. Color only for real signals — red for missing, green for a climb. The default. |
| **Slate** | Black-and-white editorial. Serif type, like a printed page. |
| **Friendly** | Warm and chatty — a plain-language note on every grade. |

Your choice saves and carries over to the real extension if you install it too.

---

## The real extension — your actual grades

Install `better-sgy-extension-1.0.0-chrome.zip` the same way (same four steps),
then go to **your school's Schoology page** (e.g. `yourschool.schoology.com`) —
the redesigned UI draws itself over your real dashboard automatically. Nothing
on Schoology changes; Better SGY just lays a cleaner view on top, with your
actual grades. Whatever style you picked in the Demo is already set.

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
