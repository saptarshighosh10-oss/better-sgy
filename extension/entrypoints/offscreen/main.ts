/**
 * Offscreen document — the only place in the worker world with a DOM. The service
 * worker can fetch the grades HTML but can't parse it (no DOMParser in MV3 SWs),
 * so it ships the HTML here, we parse + scrape, and hand back the structured output.
 */
import { scrapeGradesFromDoc } from '../../lib/scrape-dom';

browser.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== 'object' || (message as { type?: string }).type !== 'bs-parse-grades') {
    return;
  }
  const html = (message as { html?: string }).html ?? '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Promise.resolve({ ok: true, output: scrapeGradesFromDoc(doc) });
  } catch (err) {
    return Promise.resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});
