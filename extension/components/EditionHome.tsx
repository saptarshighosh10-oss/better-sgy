/**
 * EditionHome.tsx — the home/overview surface.
 *
 * Renders the selected edition's polished mockup (looks/mockup-app-<id>.html)
 * full-screen in an iframe. This replaces the old dark OverviewPage dashboard:
 * picking a look in the chooser now actually shows THAT look here, for all five
 * editions (halo, apple, slate, forge, carbon).
 *
 * The looks' inline scripts are externalized to looks/*.js by build-looks, so the
 * page loads by URL fine under the extension-page CSP (script-src 'self'), and the
 * files are web-accessible on schoology.com (see wxt.config.ts).
 */
import React, { useEffect, useState } from 'react';
import type { Edition } from '../lib/settings';

const KNOWN = new Set<Edition>(['halo', 'apple', 'slate', 'forge', 'carbon']);

export function EditionHome({ edition }: { edition: Edition }) {
  const id: Edition = KNOWN.has(edition) ? edition : 'halo';
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const getURL = browser.runtime.getURL as (p: string) => string;
    const path = `/looks/mockup-app-${id}.html`;
    try {
      setSrc(getURL(path));
    } catch {
      setSrc(path);
    }
  }, [id]);

  if (!src) return null;

  return (
    <iframe
      key={id}
      src={src}
      title={`${id} look`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
