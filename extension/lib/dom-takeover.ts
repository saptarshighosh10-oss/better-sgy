/**
 * dom-takeover.ts — Phase 0
 *
 * Hides specific Schoology UI containers and restores them on demand.
 * NEVER hides document.body — only known container selectors.
 * Preserves previous inline styles so restore is pixel-exact.
 */

/** Selectors for the main Schoology UI containers we want to hide */
const SCHOOLOGY_SELECTORS = [
  '#center-top',        // main content area
  '#center-bottom',     // below-content area
  '#right-column',      // right sidebar
  '#navigation-top',    // top nav (optional — keep if you want nav visible)
  '.content-top-upper', // upper content strip
] as const;

export interface HiddenContainer {
  element: HTMLElement;
  previousDisplay: string;
  previousVisibility: string;
  selector: string;
}

let hiddenContainers: HiddenContainer[] = [];
let nativeHidden = false;

/**
 * Find candidate Schoology containers on the page.
 * Useful for the debug panel.
 */
export function findSchoologyContainers(): { selector: string; found: boolean }[] {
  return SCHOOLOGY_SELECTORS.map((selector) => ({
    selector,
    found: !!document.querySelector(selector),
  }));
}

/**
 * Hide detected Schoology containers.
 * Returns count of containers actually hidden.
 */
export function hideNativeUI(): number {
  if (nativeHidden) return hiddenContainers.length;

  hiddenContainers = [];

  for (const selector of SCHOOLOGY_SELECTORS) {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) continue;

    hiddenContainers.push({
      element: el,
      previousDisplay: el.style.display,
      previousVisibility: el.style.visibility,
      selector,
    });

    el.style.display = 'none';
  }

  nativeHidden = true;
  return hiddenContainers.length;
}

/**
 * Restore all previously hidden containers to their exact prior state.
 */
export function restoreNativeUI(): void {
  for (const { element, previousDisplay, previousVisibility } of hiddenContainers) {
    element.style.display = previousDisplay;
    element.style.visibility = previousVisibility;
  }

  hiddenContainers = [];
  nativeHidden = false;
}

/**
 * Whether native UI is currently hidden.
 */
export function isNativeHidden(): boolean {
  return nativeHidden;
}
