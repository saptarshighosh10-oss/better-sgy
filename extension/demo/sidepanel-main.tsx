import './shim';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SidePanel } from '../components/SidePanel';
import { seedDemoData } from '../lib/demo-data';

async function start() {
  await seedDemoData();
  const now = Date.now();
  await browser.storage.local.set({
    bs_grade_changes: [
      { course: 'AP Physics C: Mechanics', oldPct: 92.0, newPct: 89.0, delta: -3.0, ts: now - 1000 * 60 * 12 },
      { course: 'AP Calculus BC', oldPct: 95.1, newPct: 96.2, delta: 1.1, ts: now - 1000 * 60 * 60 * 3 },
      { course: 'U.S. History', oldPct: 93.4, newPct: 94.0, delta: 0.6, ts: now - 1000 * 60 * 60 * 26 },
    ],
    bs_announcements_cache: [
      { id: 'a1', kind: 'message', author: 'Dr. Nguyen', courseName: 'AP Calculus BC', body: 'Reminder: Unit 8 test moved to Friday. Review the polar-area problems from the packet.', bodyHtml: '', timeText: '2h ago', timestamp: now - 1000 * 60 * 120, link: null },
      { id: 'a2', kind: 'class-update', author: 'Mr. Patel', courseName: 'AP Physics C: Mechanics', body: 'Lab reports are graded — check your dropbox feedback before the retake on Thursday.', bodyHtml: '', timeText: '1d ago', timestamp: now - 1000 * 60 * 60 * 24, link: null },
      { id: 'a3', kind: 'update', author: 'Mme. Laurent', courseName: 'French 4 Honors', body: 'Nouvelle ressource ajoutee: conjugation practice set 5 is posted under Materials.', bodyHtml: '', timeText: '2d ago', timestamp: now - 1000 * 60 * 60 * 48, link: null },
    ],
  });
  const root = document.getElementById('root');
  if (root) createRoot(root).render(<SidePanel />);
}

void start();
