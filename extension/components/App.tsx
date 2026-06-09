import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { DebugPanel } from './DebugPanel';
import { ExtRouter } from './ExtRouter';
import type { ScrapeResult } from '../lib/scrape-status';
import { INITIAL_SCRAPE_RESULT } from '../lib/scrape-status';

interface AppProps {
  mountCount: number;
  scrapeResult?: ScrapeResult;
}

export function App({ mountCount, scrapeResult = INITIAL_SCRAPE_RESULT }: AppProps) {
  return (
    <ErrorBoundary>
      <ExtRouter scrapeResult={scrapeResult} />
      <DebugPanel mountCount={mountCount} scrapeResult={scrapeResult} />
    </ErrorBoundary>
  );
}
