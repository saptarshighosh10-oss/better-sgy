import './shim';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../components/App';

// Inline the bundled "looks" (chooser + 5 editions) so the single-file demo runs
// fully offline. We turn each into a blob URL and expose a resource-path → URL map
// that LooksFrame.resolveUrl() consults. The looks' own relative in-page links can't
// resolve from a blob, so look-switching in the demo is driven by the chooser /
// settings writing chrome.storage['bsgy-edition'] (the demo shim fires onChanged),
// which re-points the iframe to the matching blob.
// Single-file demo runs each look from an opaque blob: URL, where an external
// `<script src="./*.js">` can't resolve. The bundled public/looks copies have
// their scripts externalized (MV3 CSP needs that); the canonical top-level copies
// still inline their scripts, so import those here to keep the blob demo working.
import chooserHtml from '../choose-your-look.html?raw';
import appleHtml from '../mockup-app-apple.html?raw';
import haloHtml from '../mockup-app-halo.html?raw';
import slateHtml from '../mockup-app-slate.html?raw';
import forgeHtml from '../mockup-app-forge.html?raw';
import carbonHtml from '../mockup-app-carbon.html?raw';

function toBlobUrl(html: string): string {
  return URL.createObjectURL(new Blob([html], { type: 'text/html' }));
}

(globalThis as { __BSGY_LOOKS__?: Record<string, string> }).__BSGY_LOOKS__ = {
  'looks/choose-your-look.html': toBlobUrl(chooserHtml),
  'looks/mockup-app-apple.html': toBlobUrl(appleHtml),
  'looks/mockup-app-halo.html': toBlobUrl(haloHtml),
  'looks/mockup-app-slate.html': toBlobUrl(slateHtml),
  'looks/mockup-app-forge.html': toBlobUrl(forgeHtml),
  'looks/mockup-app-carbon.html': toBlobUrl(carbonHtml),
};

function start() {
  // NOTE: the demo deliberately does NOT write chrome.storage['bsgy_live'], so the
  // looks render their built-in sample data — same picker → look flow, sample grades.
  const root = document.getElementById('root');
  if (root) createRoot(root).render(<App mountCount={1} />);
}

start();
