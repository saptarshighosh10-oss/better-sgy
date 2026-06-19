# Scope — Landing / Intro Page Build Brief

> Hand this to a fresh build session **along with the two reference images** (a day and a night
> cave shot with a stone monolith reading "Scope / Press enter"). Goal: build a **more stylized,
> art-directed version** of those references as an interactive intro, with a working
> "zoom-into-the-O" transition that reveals the app. This doc is self-contained.

---

## 0. What you're building (one paragraph)
A cinematic, **cave-themed** landing/intro screen for a product called **Scope**. A monolithic
stone tablet reads **"Scope"** with a **"Press enter"** prompt. When the user presses Enter (or
clicks), the **O of "Scope" becomes a lens/portal**: a circular reveal opens *at the O* and rushes
outward to land the user in the app's dashboard. Day and night variants. Everything is cave-themed
and committed — push the art direction further than the (AI-generated) references.

---

## 1. Product context — so the design has meaning
**Scope** (a rebrand of an extension called "Better SGY") is a private, student-first layer over the
school LMS (Schoology). It turns a student's *own* coursework into **trustworthy, teacher-matched
study practice** — grounded flashcards and practice tests that cite the real source slide and mirror
how the student's actual teachers test. It runs on the student's own logged-in session; nothing is
uploaded; it's free.

**The name is the metaphor — lean into it:**
- A **scope** is something you *look through to see clearly*. So the **O is a lens/aperture** — the
  whole intro is "look through Scope, the chaos of school comes into focus." That's why the reveal
  zooms *through the O*.
- **"In scope"** = the product only ever surfaces/tests what's actually in your real materials
  (nothing hallucinated, nothing off-syllabus). Clarity + trust. Keep the feeling **calm, sharp,
  on-your-side** — never busy or corporate.

**Emotional arc of the intro:** the cave = the dark, buried mess of school (a stressed student, an
LMS that hides everything). Scope = the lit monolith / the way out. Pressing enter = stepping
through the lens into clarity. Awe → calm.

---

## 2. Art direction — what "more stylized" means
The references are good cinematic AI renders but read a little generic/photoreal. Push them into a
**deliberately art-directed look** with these levers:

- **Cohesive, intentional palette** (not muddy photoreal brown):
  - **Day:** warm sand/limestone, soft pale sky through the cave mouth, gentle god-rays.
  - **Night:** deep indigo/navy sky, starfield, **ember-amber torchlight** as the only warm source.
  - Pick **one signature accent = ember amber** and use it consistently (the O glow, torches, CTA).
- **The wordmark "Scope"** = a *designed* carved-stone wordmark, not a default font. Strong display
  serif or a custom chiseled face; carved/engraved depth (inner shadow + faint highlight rim).
- **The O is hero** — treat it as a lens/aperture: a subtle concentric ring, a soft inner glow, and
  (optional) a faint shaft of light passing through it. It should read "look through me."
- **Light direction & atmosphere:** strong directional light from the cave mouth, **dust motes /
  floating particles**, subtle volumetric haze, torch flicker at night. Add **film grain** and
  controlled contrast/vignette so it doesn't look like stock AI art.
- **Depth via parallax layers:** foreground cave rock (frames the scene) → monolith → background
  landscape → sky. These can shift slightly on pointer move for a living 3D feel.
- **Ambient motion (idle):** slow drifting dust, flickering torches, slow cloud/star movement, and a
  gently **breathing glow on the O**. The screen should feel alive before any input.

Keep it **tasteful and restrained** — cinematic, not cluttered. One strong focal point (the O), one
accent color, lots of negative space/atmosphere.

---

## 3. Scene & layout
- Cave-mouth **vignette of rock** frames the viewport; opening reveals a rocky landscape + sky.
- **Central stone monolith/tablet**, slightly off-perfect (cracked, weathered), bearing **"Scope"**
  (large, carved) and **"Press enter"** (small, beneath).
- **Responsive:** recompose for portrait/mobile (monolith centered, cave frame tightens). The O's
  position must stay measurable at any size (see §5).
- **Day/night variants:** same composition, swap background + lighting + accent temperature.

---

## 4. Interaction & states
| State | Behavior |
|---|---|
| **Idle** | Ambient motion (dust, torches, clouds); O **glows/pulses** (~2.5s breathing loop); "Press enter" visible. |
| **Hover/focus monolith** | Intensify the O glow; subtle scale/lift on the tablet; cursor affordance. |
| **Trigger** | **Enter key** or **click** → run the zoom-into-the-O transition (§5). Guard against double-fire. |
| **Day ⇄ Night** | Cycle by time of day, OR switch on `prefers-color-scheme` (dark = night). Crossfade backgrounds. |

Pointer-move parallax on the layers throughout idle/hover.

---

## 5. The "zoom into the O" transition (full spec)

**Concept:** a circular portal opens *at the O of "Scope"* and rushes outward, revealing the
dashboard while the cave falls away behind. The O is a lens you dive through.

### Layer stack (z-order)
1. **App/dashboard** (bottom) — the target view, **already mounted** beneath the intro.
2. **Cave intro** (top) — full-screen cave + **the "Scope" wordmark as live HTML text** (NOT baked
   into the background image) so the O is a real, measurable, crisp DOM element.

### Measure the O
Wrap the O in its own element: `Sc<span class="scope-o">o</span>pe`. On mount/resize:
```js
const r = oEl.getBoundingClientRect();
const Xo = r.left + r.width / 2;          // O center (viewport px)
const Yo = r.top  + r.height / 2;
const R0 = r.width * 0.18;                // ~the O's inner-hole radius (portal starts here)
const Rfinal = Math.hypot(Math.max(Xo, innerWidth - Xo),
                          Math.max(Yo, innerHeight - Yo)) * 1.05; // reaches farthest corner
```

### Portal structure (two nested elements so clip & zoom don't fight)
```html
<div class="portal">         <!-- position:fixed; inset:0; z above cave; clip-path grows -->
  <div class="portal-zoom">  <!-- transform:scale() — the dashboard "rushes in / lands" -->
    <Dashboard/>
  </div>
</div>
```
- **`.portal`** → animate `clip-path: circle(R0 at Xo Yo)` → `circle(Rfinal at Xo Yo)`. Clip lives on
  the non-transformed wrapper so it stays stable in screen space.
- **`.portal-zoom`** → `transform: scale(1.12 → 1.0)`.

### Cave falls away (sell the dive)
On the **cave layer**: `transform-origin: Xo Yo`, `transform: scale(1 → 1.6)`, and
`opacity: 1 → 0` over the **last 40% only** (edges shouldn't linger). Remove from DOM on finish.

### Timeline — ~1200ms, easing `cubic-bezier(.7,0,.25,1)` (grip → whoosh)
| offset | `.portal` radius | `.portal-zoom` scale | cave scale | cave opacity |
|---|---|---|---|---|
| 0% | R0 | 1.12 | 1.0 | 1 |
| 60% | ~0.5·Rfinal | — | ~1.35 | 1 |
| 100% | Rfinal | 1.0 | 1.6 | 0 |

### Minimal driver (Web Animations API — dependency-free)
```js
function enterScope() {
  const cave = document.querySelector('.cave');
  const portal = document.querySelector('.portal');
  const zoom = document.querySelector('.portal-zoom');
  const D = 1200, ease = 'cubic-bezier(.7,0,.25,1)';

  portal.animate(
    [{ clipPath:`circle(${R0}px at ${Xo}px ${Yo}px)` },
     { clipPath:`circle(${Rfinal}px at ${Xo}px ${Yo}px)` }],
    { duration: D, easing: ease, fill: 'forwards' });

  zoom.animate([{ transform:'scale(1.12)' }, { transform:'scale(1)' }],
    { duration: D, easing: ease, fill: 'forwards' });

  cave.animate(
    [{ transform:'scale(1)', opacity:1, offset:0 },
     { opacity:1, offset:0.6 },
     { transform:'scale(1.6)', opacity:0, offset:1 }],
    { duration: D, easing: ease, fill:'forwards' }).onfinish = () => cave.remove();
}
```
Set `.cave { transform-origin: <Xo>px <Yo>px }` inline from the measurement. (Framer Motion is fine
too if preferred — but keep it portable; see §7.)

### Accessibility
`@media (prefers-reduced-motion: reduce)` → skip the zoom; **crossfade** cave → dashboard (~300ms),
same end state. Keyboard: focus a hidden button on load so Enter works immediately; manage focus into
the dashboard after.

---

## 6. What the portal reveals
The **grades dashboard** — **not built into this page yet**. For this build, reveal a **placeholder
dashboard screen** (a simple cave-themed "Grades" stub) as the target layer, with a clear seam so the
real dashboard can be dropped in later. (In the real product the dashboard already exists; the intro
just portals away to expose it.)

---

## 7. Tech context & constraints (so it ports into the real app)
- Final home: a **WXT + React 18 + TypeScript** Chrome MV3 extension, mounted inside a **Shadow DOM**.
  So: **prefer scoped/inline styles or a single scoped stylesheet — avoid global selectors and
  `:root`/`body` assumptions.** Keep assets self-contained.
- **Performance:** animate **transform / opacity / clip-path only** (GPU-friendly); it's a one-shot.
  No layout thrashing, no scroll-jank.
- **No heavy 3D libs needed** — CSS/WAAPI + layered images + parallax is enough. (If you want true
  volumetric depth, a light canvas/three.js layer is acceptable but keep bundle small; three.js is
  already used elsewhere in the project and is lazy-loaded.)
- **Fire once:** persist a `scope_intro_seen` flag (localStorage) so returning users skip straight to
  the dashboard — the cave is a first-run / marketing moment, not a daily gate.
- **Assets:** day + night cave backgrounds (user provides references to stylize from), torch sprites,
  optional dust/particle layer.

---

## 8. Deliverable for this session
1. The **stylized cave intro** (day + night) with the live "Scope" wordmark + glowing-O affordance +
   "Press enter" + ambient motion + pointer parallax.
2. The **working zoom-into-the-O transition** (§5) revealing a **placeholder dashboard**.
3. Reduced-motion fallback, responsive layout, fire-once flag.
4. Keep it **portable and Shadow-DOM-friendly** (§7).

**Stretch:** day↔night auto by `prefers-color-scheme`; a faint light-shaft through the O; subtle
sound (toggle-off by default).
