import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ExtRouter } from './ExtRouter';
import { GlobalStyles } from './GlobalStyles';
import type { ScrapeResult } from '../lib/scrape-status';
import { INITIAL_SCRAPE_RESULT } from '../lib/scrape-status';

interface AppProps {
  mountCount: number;
  scrapeResult?: ScrapeResult;
}

export function App({ mountCount, scrapeResult = INITIAL_SCRAPE_RESULT }: AppProps) {
  return (
    <ErrorBoundary>
      <GlobalStyles />
      <ExtRouter scrapeResult={scrapeResult} />
    </ErrorBoundary>
  );
}
