import { defineConfig } from 'wxt';
import removeConsole from 'vite-plugin-remove-console';

// Set by the build:demo npm script via DEMO=true env var.
const isDemo = process.env.DEMO === 'true';

const ICONS = {
  16: 'icon/16.png',
  32: 'icon/32.png',
  48: 'icon/48.png',
  128: 'icon/128.png',
};

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  browser: 'chrome',
  manifest: {
    name: isDemo ? 'Better SGY — Demo' : 'Better SGY',
    description: isDemo
      ? 'Better SGY preloaded with sample data — try it without a Schoology account.'
      : 'A cleaner, faster dashboard for Schoology — grades, assignments, materials & calendar, redesigned. Runs locally on your device.',
    version: '1.0.0',
    // Only ever runs on a school's own Schoology site (any *.schoology.com subdomain).
    // The background worker fetches attachments/feeds with the user's own session.
    host_permissions: [
      'https://*.schoology.com/*',
    ],
    permissions: ['storage', 'notifications', 'sidePanel', 'alarms', 'offscreen'],
    // pdf.js loads its parser worker by URL from the content script — must be web-accessible.
    web_accessible_resources: [
      { resources: ['pdf.worker.min.mjs'], matches: ['https://*.schoology.com/*'] },
    ],
    icons: ICONS,
    action: {
      default_title: 'Better SGY',
      default_icon: ICONS,
    },
    commands: {
      _execute_side_panel: {
        suggested_key: { mac: 'Command+Shift+S', default: 'Ctrl+Shift+S' },
        description: 'Open Better SGY side panel',
      },
    },
  },
  // Strip chatty console.log/info/debug/warn from the production bundle (kept in dev).
  // console.error survives so genuine failures are still reportable. WXT builds each
  // entrypoint separately, so this must be a Vite plugin (esbuild.drop is ignored here).
  vite: (env) => ({
    plugins:
      env.mode === 'production'
        ? [removeConsole({ includes: ['log', 'info', 'debug', 'warn'] })]
        : [],
  }),
});
