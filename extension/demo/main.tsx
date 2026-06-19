import './shim';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../components/App';
import { seedDemoData } from '../lib/demo-data';

async function start() {
  await seedDemoData();
  const root = document.getElementById('root');
  if (root) createRoot(root).render(<App mountCount={1} />);
}

void start();
