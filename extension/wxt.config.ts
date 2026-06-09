import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  browser: 'chrome',
  manifest: {
    name: 'Better Schoology',
    description: 'A cleaner, calmer, faster student dashboard overlay for Schoology (Phase 0 / Safety Probe)',
    version: '0.1.0',
    // Any school's Schoology subdomain + Schoology's CDNs (attachments 302 to
    // files-cdn; the background worker fetches files past CORS) — never broader
    // than schoology.com.
    host_permissions: ['https://*.schoology.com/*'],
    permissions: ['storage'],
  },
});
