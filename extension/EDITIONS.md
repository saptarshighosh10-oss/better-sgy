# Better SGY — Editions

Better SGY is a Chrome extension that replaces the Schoology dashboard. It comes
in a few flavors. **Halo** is the one we recommend and the one that ships as a
real, installable extension today; the others are described honestly below.

---

## ⭐ Halo — *the recommended edition* (installable extension)

**The Apple-Store-clean edition.** iOS-Settings restraint: ink typography,
grouped surfaces with hairline dividers, generous whitespace, and color used
**only when it means something** — red for missing/overdue, green for a grade
that went up. SF Pro throughout. Live grade watcher, side panel, floating grade
card, due-soon reminders, skeleton loaders.

- **Who it's for:** basically everyone — anyone who finds school dashboards loud
  and just wants to glance and *know*.
- **Why it's the best:** signal over noise. Because color is rare, your eye goes
  straight to what changed. It doesn't look "AI-generated," it ages well, and it
  carries the most features.
- **Prefer pure black-and-white?** Halo ships a **Mono** accent — Slate's
  monochrome look without giving up the red/green that actually helps.

**Install (load unpacked):**
1. Build it: `cd extension && npm install && npm run build`
2. Open `chrome://extensions`, turn on **Developer mode**
3. **Load unpacked** → select `extension/.output/chrome-mv3`

**Install (from the zip):** unzip `extension/.output/better-sgy-extension-1.0.0-chrome.zip`,
then **Load unpacked** the unzipped folder. (Same MV3 build, just packaged.)

---

## Forge — *the power UI* (a branch of this extension, not a separate install)

**The dense, do-everything dashboard:** grade-change feed, ⌘K command palette,
GPA planner, personal tasks. Lives on the `redesign/v2-ui` branch — it's the
**same** Better SGY extension with a different UI, so you build/install it the
same way as Halo after `git checkout redesign/v2-ui`.

- **Who it's for:** power users who want every number on screen at once.
- **Why Halo does it better:** density is cognitive load. Halo shows the same
  info with room to breathe and spends your attention only on what moved.

---

## Slate — *the bare UI* (a mode/branch, not a separate install)

**Monochrome minimalist:** black, white, grays — zero color, zero ornament.
Shipped as minimalist mode on the `feature/minimalist-mode` branch. Again, the
**same** extension, different skin.

- **Who it's for:** deep-focus people, e-ink fans.
- **Why Halo does it better:** Halo is already minimalist but keeps the one bit
  of color that carries meaning. You can also just flip Halo's **Mono** accent
  for nearly the same look without losing that signal.

---

## Scope — *the fun one* (NOT an extension — a standalone web app)

**The Y2K retro-OS edition:** a boot screen, fleet carousel, `.SYS` tabs, and a
built-in **Grade Breaker** arcade game. This one is **not** a browser extension —
it's a self-contained HTML app (`Scope_Y2K_v19_full_os.html`). You open the file
in a browser; there's nothing to install and it doesn't read live Schoology data.

- **Who it's for:** people who want pure personality and a game.
- **Why Halo does it better:** Scope is a vibe to show off; Halo is the tool you
  actually open every day to check real grades.

---

### TL;DR

| Edition | Form | Best for | Verdict |
|---|---|---|---|
| **Halo** ⭐ | Installable extension | Almost everyone | **Recommended** |
| Forge | Branch of the extension | Data nerds, planners | Powerful, busy |
| Slate | Branch / mode | Deep-focus minimalists | Calm; loses useful signal |
| Scope | Standalone HTML app | Fun-seekers | Delightful, not a daily tool |

*Only Halo is packaged as an installable extension right now. Names are working titles.*
