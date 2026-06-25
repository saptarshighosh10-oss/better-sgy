/**
 * discord-alerts.ts — post grade-change events to a user-configured Discord
 * webhook. The background worker calls sendDiscordAlerts() alongside its
 * desktop-notification path; testDiscordWebhook() is called from SettingsPage.
 */
import type { ChangeEvent } from './grade-changes';

function eventLine(e: ChangeEvent): string {
  switch (e.kind) {
    case 'grade': {
      const arrow = e.delta >= 0 ? '▲' : '▼';
      return `${arrow} **${e.course}** ${e.delta >= 0 ? 'rose' : 'fell'} ${Math.abs(e.delta).toFixed(1)}% · ${e.oldPct?.toFixed(1)}% → ${e.newPct?.toFixed(1)}%`;
    }
    case 'graded':
      return `✅ Graded · **${e.name}**${e.pct !== null ? ` — ${e.pct.toFixed(0)}%` : ''} (${e.course})`;
    case 'new-assignment':
      return `📋 New assignment · **${e.name}** (${e.course})`;
  }
}

export async function sendDiscordAlerts(events: ChangeEvent[], webhookUrl: string): Promise<void> {
  if (!webhookUrl || !events.length) return;
  const lines = events.slice(0, 10).map(eventLine);
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Better SGY',
      embeds: [{
        title: events.length === 1 ? 'Schoology update' : `${events.length} Schoology updates`,
        description: lines.join('\n'),
        color: 0x3b82f6,
      }],
    }),
  });
}

export async function testDiscordWebhook(webhookUrl: string): Promise<void> {
  if (!webhookUrl) throw new Error('No webhook URL');
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Better SGY',
      embeds: [{
        title: 'Test notification',
        description: '✅ Webhook is working! Grade alerts will appear here.',
        color: 0x22c55e,
      }],
    }),
  });
}
