/**
 * three-bundle.ts — unlisted script that carries three.js.
 *
 * Built as its own file (.output/chrome-mv3/three-bundle.js) so the main content
 * script doesn't pay for three.js up front. The content script lazy-imports this
 * via `lib/load-three.ts` the first time an Arcade game mounts; evaluating it
 * registers the namespace on a global. It runs in the content script's isolated
 * world — never injected into the page's main world.
 */

import * as THREE from 'three';

export default defineUnlistedScript(() => {
  (globalThis as { __BSGY_THREE__?: typeof THREE }).__BSGY_THREE__ = THREE;
});
