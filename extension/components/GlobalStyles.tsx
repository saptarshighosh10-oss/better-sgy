import React from 'react';

/**
 * Shared keyframes + interaction styles for the whole extension UI.
 * Rendered once near the root so this <style> tag lives inside the
 * shadow root and stays scoped to it (no leakage onto the host page).
 */
export function GlobalStyles() {
  return (
    <style>{`
      @keyframes bsPageEnter {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes bsRowEnter {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes bsFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      .bs-page-enter { animation: bsPageEnter 260ms cubic-bezier(0.16, 1, 0.3, 1); }
      .bs-row-enter  { animation: bsRowEnter 260ms cubic-bezier(0.16, 1, 0.3, 1) backwards; }
      .bs-fade-in    { animation: bsFadeIn 200ms ease-out; }

      /* Accordion-style expand/collapse without measuring heights in JS */
      .bs-collapse {
        display: grid;
        transition: grid-template-rows 260ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .bs-collapse > div { overflow: hidden; min-height: 0; }
      .bs-collapse-content { transition: opacity 220ms ease-out; }

      /* Folder-open reveal: grows from 0 height + fades in, replays on every expand */
      @keyframes bsExpandIn {
        from { grid-template-rows: 0fr; opacity: 0.4; }
        to   { grid-template-rows: 1fr; opacity: 1; }
      }
      .bs-expand-in {
        display: grid;
        animation: bsExpandIn 280ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .bs-expand-in > div { overflow: hidden; min-height: 0; }

      /* Nav button hover/press feedback (active-state colors stay inline) */
      .bs-nav-btn {
        transition: background-color 180ms ease-out, color 180ms ease-out,
          transform 150ms cubic-bezier(0.16, 1, 0.3, 1), filter 150ms ease-out;
      }
      .bs-nav-btn:hover { filter: brightness(1.4); }
      .bs-nav-btn:active { transform: scale(0.88); }
      .bs-nav-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }

      /* Shared keyboard focus ring — apply to every interactive element.
         'all: unset' wipes the UA outline, so this restores a visible one. */
      .bs-focusable:focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
        border-radius: 6px;
      }
      input.bs-focusable:focus-visible,
      .bs-focusable input:focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 1px;
      }

      /* Reveal-on-hover controls must also reveal on keyboard focus */
      .bs-reveal { opacity: 0; transition: opacity 150ms ease-out; }
      .bs-reveal-parent:hover .bs-reveal,
      .bs-reveal-parent:focus-within .bs-reveal,
      .bs-reveal:focus-visible { opacity: 1; }

      /* Subtle lift on hover — transform/opacity only */
      .bs-lift { transition: transform 160ms ease-out, box-shadow 160ms ease-out; }
      .bs-lift:hover { transform: translateY(-2px); }
      .bs-lift:active { transform: translateY(0) scale(0.98); }

      /* ── Apple-style motion + interactions ───────────────────────────
         Calm fade-up entrance (replaces the flashy 3D fly-in), gentle press
         feedback on pills, and underline-on-hover for chevron text links. */
      @keyframes bsAppleIn {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .bs-apple-in {
        animation: bsAppleIn 620ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
      }
      .bs-press { transition: transform 140ms cubic-bezier(0.22,1,0.36,1), filter 140ms ease-out; }
      .bs-press:hover { filter: brightness(1.05); }
      .bs-press:active { transform: scale(0.97); }
      .bs-applink { transition: opacity 140ms ease-out; }
      .bs-applink:hover { opacity: 0.6; }
      .bs-applink:hover > span:first-child { text-decoration: underline; text-underline-offset: 3px; }
      /* Apple card hover lift — soft and slow */
      .bs-apple-card { transition: transform 240ms cubic-bezier(0.22,1,0.36,1), box-shadow 240ms ease-out, border-color 240ms ease-out; }

      /* Tiny loading spinner — rotate only (compositor-safe) */
      @keyframes bsSpin { to { transform: rotate(360deg); } }
      @keyframes bsSpinRev { to { transform: rotate(-360deg); } }
      /* Boot screen: concentric counter-rotating rings (the starting-screen anim) */
      .bs-boot-ring {
        position: absolute; border-radius: 50%; box-sizing: border-box;
      }

      /* Overview cards: each card FLIES IN from its own off-screen spot (set per
         card via --fx/--fy/--fr/--fs) and lands in its carousel position. Outer
         cards lead, inner ones follow (staggered via animation-delay). 'backwards'
         fill holds the start state during the delay so nothing flashes early.
         Parent supplies perspective; preserve-3d keeps each card's own tilt. */
      @keyframes bsCardFly {
        from {
          opacity: 0;
          transform: translate3d(var(--fx, 0), var(--fy, 120%), 0) rotate(var(--fr, 0deg)) scale(var(--fs, 0.7));
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
        }
      }
      .bs-card-fly {
        animation: bsCardFly 760ms cubic-bezier(0.18, 0.92, 0.25, 1.05) backwards;
        transform-style: preserve-3d;
      }

      /* Ambient side decoration: slow vertical drift + gentle tilt */
      @keyframes bsDrift {
        0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)); }
        50%      { transform: translateY(-16px) rotate(calc(var(--r, 0deg) + 5deg)); }
      }

      /* Parallax triangles drifting across the game background. Forward = drift
         left→right while scaling UP (comes closer); backward = right→left scaling
         DOWN (recedes). Both enter & exit fully off-screen (opacity 0 at the loop
         boundary) so the loop is seamless and shapes feel "replaced". */
      @keyframes bsTriFwd {
        0%   { transform: translateX(-140%) rotate(var(--r0, 0deg)) scale(0.55); opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 1; }
        100% { transform: translateX(calc(100vw + 140%)) rotate(var(--r1, 30deg)) scale(1.32); opacity: 0; }
      }
      @keyframes bsTriBwd {
        0%   { transform: translateX(calc(100vw + 140%)) rotate(var(--r0, 0deg)) scale(1.32); opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 1; }
        100% { transform: translateX(-140%) rotate(var(--r1, -30deg)) scale(0.55); opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) { .bs-game-bg { display: none; } }
      .bs-spinner {
        display: inline-block;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        border: 1.5px solid currentColor;
        border-top-color: transparent;
        box-sizing: border-box;
        opacity: 0.75;
        animation: bsSpin 700ms linear infinite;
        flex-shrink: 0;
      }

      @media (prefers-reduced-motion: reduce) {
        .bs-page-enter, .bs-row-enter, .bs-fade-in, .bs-collapse,
        .bs-collapse-content, .bs-expand-in, .bs-nav-btn, .bs-card-fly,
        .bs-decor, .bs-decor *,
        .bs-apple-in, .bs-press, .bs-applink, .bs-apple-card,
        .bs-motion, .bs-reveal, .bs-lift {
          animation: none !important;
          transition: none !important;
        }
        .bs-reveal { opacity: 1 !important; }
        .bs-lift:hover, .bs-lift:active { transform: none !important; }
        /* spinner keeps spinning under reduced motion but slower — it conveys state */
        .bs-spinner { animation: bsSpin 1.4s linear infinite !important; }
      }
    `}</style>
  );
}
