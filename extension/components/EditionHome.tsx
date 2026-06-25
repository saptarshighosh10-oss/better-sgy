/**
 * EditionHome.tsx — the home/overview surface.
 *
 * Renders the selected edition's polished mockup (looks/mockup-app-<id>.html)
 * full-screen in an iframe. This replaces the old dark OverviewPage dashboard:
 * picking a look in the chooser now actually shows THAT look here, for all five
 * editions (halo, apple, slate, forge, carbon).
 *
 * The looks are sandboxed iframes with their own storage, so the Discord webhook
 * field inside each look can't persist on its own. The look posts the webhook to
 * this parent shell, which saves it to the real settings the background alerts
 * read; on request we post the saved value back so the field stays in sync.
 *
 * The looks' inline scripts are externalized to looks/*.js by build-looks, so the
 * page loads by URL fine under the extension-page CSP (script-src 'self'), and the
 * files are web-accessible on schoology.com (see wxt.config.ts).
 */
import React, { useEffect, useRef, useState } from 'react';
import { loadSettings, saveSettings } from '../lib/settings';
import type { Edition } from '../lib/settings';

const KNOWN = new Set<Edition>(['halo', 'apple', 'slate', 'forge', 'carbon']);

export function EditionHome({ edition }: { edition: Edition }) {
  const id: Edition = KNOWN.has(edition) ? edition : 'halo';
  const [src, setSrc] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const webhookRef = useRef<string>('');

  useEffect(() => {
    loadSettings().then((s) => { webhookRef.current = s.discordWebhook || ''; }).catch(() => {});
  }, []);

  useEffect(() => {
    const getURL = browser.runtime.getURL as (p: string) => string;
    const path = `/looks/mockup-app-${id}.html`;
    try {
      setSrc(getURL(path));
    } catch {
      setSrc(path);
    }
  }, [id]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data as { bsgyDiscordReady?: number; bsgyDiscord?: string } | null;
      if (!d) return;
      if (d.bsgyDiscordReady) {
        // The look just mounted its settings — hand it the saved webhook to display.
        iframeRef.current?.contentWindow?.postMessage({ bsgyDiscordInit: webhookRef.current }, '*');
      } else if (typeof d.bsgyDiscord === 'string') {
        webhookRef.current = d.bsgyDiscord;
        void saveSettings({ discordWebhook: d.bsgyDiscord });
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!src) return null;

  return (
    <iframe
      ref={iframeRef}
      key={id}
      src={src}
      title={`${id} look`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
