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
  // In demo builds (VITE_DEMO=true) seed fake grade data before first paint
  // so the panel shows content without a real Schoology account.
  // Vite eliminates this block entirely in non-demo builds (dead code).
  if (import.meta.env.VITE_DEMO === 'true') {
    const { seedDemoData } = await import('../../lib/demo-data');
    await seedDemoData();
  }

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
