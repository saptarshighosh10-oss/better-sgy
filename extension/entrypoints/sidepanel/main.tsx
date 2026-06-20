import React from 'react';
import { createRoot } from 'react-dom/client';
import { SidePanel } from '../../components/SidePanel';
import { setTheme, setAccentColor, type Theme } from '../../lib/theme';

// The side panel is its own extension page with empty localStorage, so it would
// default to the Navy theme. Mirror whatever theme is active on Schoology (saved
// to storage by the content script) so the panel matches the user's UI.
async function hydrateTheme(): Promise<void> {
  try {
    const res = await browser.storage.local.get('bs_theme_state');
    const st = res.bs_theme_state as { theme?: Theme; accent?: string } | undefined;
    if (st?.theme) setTheme(st.theme);
    if (st?.accent) setAccentColor(st.accent);
  } catch { /* ignore */ }
}

async function start() {
  await hydrateTheme();
  const root = document.getElementById('root');
  if (!root) return;
  const r = createRoot(root);
  const paint = () => r.render(<SidePanel key={Date.now()} />);
  paint();

  // Re-skin live when the theme changes on Schoology.
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.bs_theme_state) {
      void hydrateTheme().then(paint);
    }
  });
}

void start();
