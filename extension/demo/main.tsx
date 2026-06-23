import './shim';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../components/App';
import { seedDemoData } from '../lib/demo-data';
// Inline the edition prototypes so the Versions tab can open them with no server
// (the single-file demo runs offline). VersionsPage reads globalThis.__BSGY_MODELS__.
import appleModel from '../public/models/apple.html?raw';
import haloModel from '../public/models/halo.html?raw';
import forgeModel from '../public/models/forge.html?raw';
import slateModel from '../public/models/slate.html?raw';

(globalThis as { __BSGY_MODELS__?: Record<string, string> }).__BSGY_MODELS__ = {
  apple: appleModel,
  halo: haloModel,
  forge: forgeModel,
  slate: slateModel,
};

async function start() {
  await seedDemoData();
  const root = document.getElementById('root');
  if (root) createRoot(root).render(<App mountCount={1} />);
}

void start();
