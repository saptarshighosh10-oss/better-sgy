/**
 * ConnectionBanner.tsx — friendly "reconnect to Schoology" prompt.
 *
 * Shows when the data layer detects the AWS WAF bot-challenge or an expired
 * session (see lib/connection-status.ts). Both are fixed by a real page
 * navigation, so the primary action is a reload. Dismissible; re-appears only
 * if the state changes again after recovery.
 */

import React, { useEffect, useState } from 'react';
import { useConnectionState, type ConnectionState } from '../lib/connection-status';
import { T, inkOnAccent } from '../lib/theme';

const COPY: Record<Exclude<ConnectionState, 'ok'>, { title: string; body: string; action: string }> = {
  waf: {
    title: 'Schoology briefly blocked background requests',
    body: "Schoology's bot-check stopped Better SGY from refreshing your data. A normal page reload clears it.",
    action: 'Reload page',
  },
  expired: {
    title: 'Your Schoology session expired',
    body: 'Schoology is asking you to sign in again. Reload to sign in — Better SGY will pick up where you left off.',
    action: 'Reload & sign in',
  },
};

export function ConnectionBanner() {
  const state = useConnectionState();
  const [dismissed, setDismissed] = useState(false);

  // A new problem (or a recovery) resets the dismissal.
  useEffect(() => {
    setDismissed(false);
  }, [state]);

  if (state === 'ok' || dismissed) return null;
  const copy = COPY[state];

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2147483200,
        maxWidth: 460,
        width: 'calc(100% - 48px)',
        background: T.card,
        border: `1px solid ${T.amber}66`,
        borderRadius: 12,
        padding: '14px 16px',
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 18, lineHeight: '22px' }}>⚠️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.35 }}>{copy.title}</div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginTop: 3 }}>{copy.body}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            type="button"
            className="bs-focusable"
            onClick={() => location.reload()}
            style={{
              all: 'unset',
              cursor: 'pointer',
              background: T.primary,
              color: inkOnAccent(),
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 8,
              padding: '7px 14px',
            }}
          >
            {copy.action}
          </button>
          <button
            type="button"
            className="bs-focusable"
            onClick={() => setDismissed(true)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              color: T.muted,
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              padding: '7px 10px',
              border: `1px solid ${T.border}`,
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
