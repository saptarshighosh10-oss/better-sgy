import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ExtRouter } from './ExtRouter';
import { GlobalStyles } from './GlobalStyles';
import type { ScrapeResult } from '../lib/scrape-status';
import { INITIAL_SCRAPE_RESULT } from '../lib/scrape-status';
import { isMinimalist, onThemeChange } from '../lib/theme';

const GEIST_LINK_ID = 'bs-geist-font';
const GEIST_HREF = 'https://cdn.jsdelivr.net/npm/geist@1.3.0/dist/fonts/geist-sans/style.css';

/**
 * Loads the Geist @font-face stylesheet into the host document's <head> while
 * minimalist mode is on, and removes it when off. It lives in the main document
 * (not the shadow root) so the registered font faces are available everywhere.
 */
function MinimalistFontLink() {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => onThemeChange(force), []);
  React.useEffect(() => {
    const existing = document.getElementById(GEIST_LINK_ID) as HTMLLinkElement | null;
    if (isMinimalist()) {
      if (!existing) {
        const link = document.createElement('link');
        link.id = GEIST_LINK_ID;
        link.rel = 'stylesheet';
        link.href = GEIST_HREF;
        document.head.appendChild(link);
      }
    } else if (existing) {
      existing.remove();
    }
  });
  return null;
}

interface AppProps {
  mountCount: number;
  scrapeResult?: ScrapeResult;
}

export function App({ mountCount, scrapeResult = INITIAL_SCRAPE_RESULT }: AppProps) {
  return (
    <ErrorBoundary>
      <GlobalStyles />
      <MinimalistFontLink />
      <ExtRouter scrapeResult={scrapeResult} />
    </ErrorBoundary>
  );
}
