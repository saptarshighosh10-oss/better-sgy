/**
 * load-three.ts — lazy loader for three.js.
 *
 * three.js is ~60% of the content-script bundle but is only needed when an
 * Arcade game is actually launched. WXT bundles content scripts as a single
 * IIFE (no native code-splitting — see https://wxt.dev/guide/essentials/es-modules),
 * so we split manually: three.js is built into its own unlisted-script entrypoint
 * (`entrypoints/three-bundle.ts`) that assigns the namespace to a global, is listed
 * under `web_accessible_resources` (restricted to *.schoology.com), and is pulled
 * in here via a runtime dynamic import the first time a game mounts.
 *
 * No new permissions and no remote code: the chunk ships inside the extension
 * and loads from chrome-extension:// in the content script's isolated world.
 */

import { browser } from 'wxt/browser';

/** The full three.js namespace — same shape as `import * as THREE from 'three'`. */
export type ThreeModule = typeof import('three');

declare global {
  // Set by entrypoints/three-bundle.ts when the chunk evaluates.
  // eslint-disable-next-line no-var
  var __BSGY_THREE__: ThreeModule | undefined;
}

let pending: Promise<ThreeModule> | null = null;

export function loadThree(): Promise<ThreeModule> {
  if (globalThis.__BSGY_THREE__) return Promise.resolve(globalThis.__BSGY_THREE__);
  if (!pending) {
    const url = browser.runtime.getURL('/three-bundle.js');
    // @vite-ignore keeps Vite/Rollup from trying to resolve & inline this at build
    // time — it must stay a native import() of the extension resource.
    pending = import(/* @vite-ignore */ url).then(() => {
      const three = globalThis.__BSGY_THREE__;
      if (!three) {
        pending = null; // allow a retry
        throw new Error('three-bundle.js loaded but did not register three.js');
      }
      return three;
    });
  }
  return pending;
}
