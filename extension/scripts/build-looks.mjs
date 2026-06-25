/**
 * build-looks.mjs — regenerate extension/public/looks/ from the canonical looks.
 *
 * WHY THIS EXISTS
 * MV3 extension pages enforce `script-src 'self'` (we set no custom CSP), which
 * BLOCKS inline <script>. The looks (chooser + 5 editions) are inline-script
 * heavy, so when loaded from chrome-extension:// their JS never runs and the UI
 * comes up blank (only static HTML shows). This script "externalizes" each look:
 * every inline <script> is written to a sibling .js file and referenced via
 * <script src="…">, which `script-src 'self'` allows.
 *
 * SOURCE OF TRUTH = the canonical look HTML at the extension root
 * (choose-your-look.html, mockup-app-*.html). Edit THOSE. The files under
 * public/looks/ are GENERATED — do not hand-edit them; your changes will be
 * overwritten on the next build.
 *
 * Runs automatically before every build/zip (see package.json scripts).
 */
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'); // extension/
const OUT = join(ROOT, 'public', 'looks');
const LOOKS = [
  'choose-your-look',
  'mockup-app-apple',
  'mockup-app-halo',
  'mockup-app-slate',
  'mockup-app-forge',
  'mockup-app-carbon',
];

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// Drop previously-generated .js so renamed/removed scripts can't leave orphans.
for (const f of readdirSync(OUT)) {
  if (f.endsWith('.js')) rmSync(join(OUT, f));
}

let totalJs = 0;
for (const base of LOOKS) {
  const srcPath = join(ROOT, `${base}.html`);
  if (!existsSync(srcPath)) {
    console.error(`[build-looks] missing canonical source: ${base}.html`);
    process.exit(1);
  }
  let html = readFileSync(srcPath, 'utf8');
  let i = 0;
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g, (m, attrs, body) => {
    if (/\bsrc\s*=/.test(attrs)) return m; // already external — leave as-is
    if (!body.trim()) return m; // empty tag — leave as-is
    const jsName = `${base}.s${i}.js`;
    // Preserve load order + shared global scope (classic, non-module scripts).
    writeFileSync(join(OUT, jsName), body);
    i++;
    totalJs++;
    return `<script${attrs.replace(/\s+$/, '')} src="./${jsName}"></script>`;
  });
  writeFileSync(join(OUT, `${base}.html`), html);
  console.log(`[build-looks] ${base}: ${i} inline script(s) externalized`);
}
console.log(`[build-looks] synced ${LOOKS.length} looks → public/looks (${totalJs} .js)`);
