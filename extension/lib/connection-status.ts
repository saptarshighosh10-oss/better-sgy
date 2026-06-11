/**
 * connection-status.ts — a tiny global store for "can we still talk to Schoology?"
 *
 * Two things quietly break the data layer and used to fail with nothing but a
 * console.warn:
 *   - the AWS WAF bot-challenge (fetches get a ~2KB JS challenge page instead of
 *     content — only a real navigation can solve it), and
 *   - an expired session (fetches get the login page back).
 *
 * Detection sites (the content script's background scrape, and isWafChallenge in
 * fetch-materials, which every page-fetching caller already runs) report here;
 * the ConnectionBanner component subscribes and shows a friendly reconnect
 * prompt instead of leaving the user staring at stale data.
 *
 * Local-only: this is an in-memory flag, nothing is stored or transmitted.
 */

import { useSyncExternalStore } from 'react';

export type ConnectionState = 'ok' | 'waf' | 'expired';

let state: ConnectionState = 'ok';
const listeners = new Set<() => void>();

function set(next: ConnectionState) {
  if (next === state) return;
  state = next;
  listeners.forEach((fn) => fn());
}

export function getConnectionState(): ConnectionState {
  return state;
}

/** A fetched page turned out to be the AWS WAF bot-challenge. */
export function reportWafChallenge(): void {
  set('waf');
}

/** A fetched page turned out to be the Schoology login page — session expired. */
export function reportSessionExpired(): void {
  set('expired');
}

/** A Schoology fetch came back with real content — clear any warning. */
export function reportConnectionOk(): void {
  set('ok');
}

export function subscribeConnection(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** React hook — re-renders when the connection state changes. */
export function useConnectionState(): ConnectionState {
  return useSyncExternalStore(subscribeConnection, getConnectionState, getConnectionState);
}

/**
 * Heuristic for "this HTML is the login page, not real content" — the same
 * markers the background scrape has always used, centralized.
 */
export function looksLikeLoginPage(html: string): boolean {
  return (
    html.includes('id="edit-mail"') ||
    html.includes('accounts.google.com') ||
    html.includes('Sign in')
  );
}
