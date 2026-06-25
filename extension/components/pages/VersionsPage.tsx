/**
 * VersionsPage.tsx — the look-chooser.
 *
 * Renders choose-your-look.html full-screen in an iframe. When the user picks
 * a look, the iframe posts { bsgyChooseLook: id } to the parent, we save the
 * edition, and notify the caller so it can navigate away.
 */
import React, { useEffect, useRef, useState } from 'react';
import { saveSettings } from '../../lib/settings';
import type { Edition } from '../../lib/settings';

interface Props {
  onEditionPicked?: (edition: Edition) => void;
}

export function VersionsPage({ onEditionPicked }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const callbackRef = useRef(onEditionPicked);
  callbackRef.current = onEditionPicked;

  useEffect(() => {
    const getURL = browser.runtime.getURL as (p: string) => string;
    try {
      setSrc(getURL('/looks/choose-your-look.html'));
    } catch {
      setSrc('/looks/choose-your-look.html');
    }
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const id = (e.data as { bsgyChooseLook?: string })?.bsgyChooseLook;
      if (!id) return;
      void saveSettings({ edition: id as Edition }).then(() => {
        callbackRef.current?.(id as Edition);
      });
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!src) return null;

  return (
    <iframe
      src={src}
      title="Choose your look"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
