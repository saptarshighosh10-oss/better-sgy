import React, { useEffect, useRef, useState } from 'react';
import { T } from '../../lib/theme';
import { AT, tileBg, hairline } from '../../lib/halo';
import { haloCardStyle } from '../halo-ui';
import { ORDERABLE_PAGES, PAGE_LABELS } from '../../lib/pages';
import type { Page } from '../../lib/pages';
import type { Settings, Edition } from '../../lib/settings';
import type { SchoologyData } from '../../lib/schemas';
import { testDiscordWebhook } from '../../lib/discord-alerts';

interface Props {
  settings: Settings;
  onSave: (patch: Partial<Settings>) => Promise<Settings>;
  data: SchoologyData | null;
  /** Open the Versions gallery — a hands-on demo/tutorial with sample data. */
  onOpenTour?: () => void;
  /** Navigate to another page (wired by ExtRouter to its navigate()). */
  onNavigate?: (p: Page) => void;
  /** Effective tab order (hidden tabs already filtered out) — orders the "Go to" grid. */
  pageOrder?: Page[];
  /** Unread announcements, surfaced as a badge on the Announcements jump tile. */
  announcementsUnread?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Shared row/section primitives ────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: '32px 0 10px', fontSize: AT.sub, fontWeight: AT.semibold, color: T.muted, letterSpacing: AT.trackBody }}>
      {children}
    </h2>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '13px 18px', borderBottom: last ? 'none' : `1px solid ${hairline()}`,
    }}>
      <span style={{ fontSize: AT.sub, color: T.text }}>{label}</span>
      <span style={{ fontSize: AT.sub, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

// ── "Go to" navigation section ───────────────────────────────────────────────
// Every page is reachable here (the floating pill is gone). Ordered by the user's
// tab order, then the utility pages (Nostalgia/Versions) that aren't always pinned.

const NAV_ICON: Record<string, string> = {
  overview: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  grades: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  assignments: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  materials: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  announcements: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  nostalgia: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  game: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
  versions: 'M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5',
};

function GoToSection({ onNavigate, pageOrder, announcementsUnread = 0 }: {
  onNavigate: (p: Page) => void;
  pageOrder?: Page[];
  announcementsUnread?: number;
}) {
  // User's tab order first (respecting hidden tabs), then append any orderable
  // pages they've hidden plus the always-available utility pages (versions).
  const base = (pageOrder && pageOrder.length > 0 ? pageOrder : (ORDERABLE_PAGES as Page[])).slice();
  const extras = (['overview', 'grades', 'assignments', 'calendar', 'materials', 'announcements', 'nostalgia', 'game', 'versions'] as Page[])
    .filter((p) => !base.includes(p));
  const pages = [...base, ...extras];

  return (
    <>
      <SectionTitle>Go to</SectionTitle>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 8,
      }}>
        {pages.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className="bs-focusable bs-press"
            style={{
              all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', gap: 10, position: 'relative',
              padding: '12px 14px', borderRadius: 14,
              background: tileBg(), border: `1px solid ${hairline()}`,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.primary}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d={NAV_ICON[id] ?? NAV_ICON.overview} />
            </svg>
            <span style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text }}>
              {PAGE_LABELS[id] ?? id}
            </span>
            {id === 'announcements' && announcementsUnread > 0 && (
              <span aria-hidden="true" style={{
                position: 'absolute', top: 8, right: 8, minWidth: 16, height: 16, padding: '0 4px',
                boxSizing: 'border-box', borderRadius: 999, background: '#ef4444', color: '#fff',
                fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}>
                {announcementsUnread > 9 ? '9+' : announcementsUnread}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

// ── "Show original Schoology" section ────────────────────────────────────────

function ShowOriginalSection() {
  return (
    <>
      <SectionTitle>Schoology</SectionTitle>
      <div style={{
        ...haloCardStyle(), padding: '16px 18px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: 14,
      }}>
        <div>
          <div style={{ fontSize: AT.sub, fontWeight: AT.semibold, color: T.text }}>Show original Schoology</div>
          <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 2, lineHeight: 1.45 }}>
            Hide the Better SGY overlay and return to the native Schoology page.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const w = window as any;
            if (typeof w.__toggleSchoologyOverlay === 'function') w.__toggleSchoologyOverlay(false);
          }}
          className="bs-focusable bs-press"
          style={{
            all: 'unset', cursor: 'pointer', flexShrink: 0,
            fontSize: AT.caption, fontWeight: AT.semibold, color: T.text,
            border: `1px solid ${hairline()}`, background: tileBg(),
            borderRadius: AT.rPill, padding: '8px 16px',
          }}
        >
          Show original
        </button>
      </div>
    </>
  );
}

// ── Tab order section ────────────────────────────────────────────────────────

function TabOrderSection({ settings, onSave }: { settings: Settings; onSave: (patch: Partial<Settings>) => Promise<Settings> }) {
  // Normalise: ensure all orderable pages are present (handles fresh installs and
  // newly-added pages that weren't in the user's saved order).
  const normalise = (order: string[], hidden: string[]): string[] => {
    const existing = new Set(order);
    const missing = (ORDERABLE_PAGES as string[]).filter((p) => !existing.has(p));
    return [...order, ...missing].filter((p) => (ORDERABLE_PAGES as string[]).includes(p));
  };

  const [order, setOrder] = useState<string[]>(() => normalise(settings.tabOrder, settings.hiddenTabs));
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(settings.hiddenTabs));

  // Keep local state in sync when settings change externally.
  useEffect(() => {
    setOrder(normalise(settings.tabOrder, settings.hiddenTabs));
    setHidden(new Set(settings.hiddenTabs));
  }, [settings.tabOrder, settings.hiddenTabs]);

  function move(idx: number, dir: -1 | 1) {
    const next = [...order];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setOrder(next);
    void onSave({ tabOrder: next });
  }

  function toggleHide(id: string) {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHidden(next);
    void onSave({ hiddenTabs: Array.from(next) });
  }

  function resetOrder() {
    const defaultOrder = ORDERABLE_PAGES as string[];
    setOrder([...defaultOrder]);
    setHidden(new Set());
    void onSave({ tabOrder: [...defaultOrder], hiddenTabs: [] });
  }

  const isDefault =
    order.join(',') === (ORDERABLE_PAGES as string[]).join(',') && hidden.size === 0;

  return (
    <>
      <SectionTitle>Tabs</SectionTitle>
      <p style={{ fontSize: AT.caption, color: T.muted, margin: '0 0 12px', lineHeight: 1.55 }}>
        Reorder tabs and hide the ones you don't need.
      </p>
      <div style={{ ...haloCardStyle(), overflow: 'hidden' }}>
        {order.map((id, i) => {
          const isHidden = hidden.has(id);
          return (
            <div
              key={id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                borderBottom: i < order.length - 1 ? `1px solid ${hairline()}` : 'none',
                opacity: isHidden ? 0.45 : 1,
              }}
            >
              {/* Drag-handle dots (visual only) */}
              <svg width="12" height="16" viewBox="0 0 12 16" fill={T.muted} aria-hidden="true" style={{ flexShrink: 0 }}>
                {[2, 6, 10].map((y) => (
                  <React.Fragment key={y}>
                    <circle cx="3" cy={y} r="1.5" />
                    <circle cx="9" cy={y} r="1.5" />
                  </React.Fragment>
                ))}
              </svg>

              <span style={{ flex: 1, fontSize: AT.sub, color: T.text, fontWeight: AT.medium }}>
                {PAGE_LABELS[id] ?? id}
              </span>

              {/* Show / hide toggle */}
              <button
                type="button"
                onClick={() => toggleHide(id)}
                title={isHidden ? 'Show tab' : 'Hide tab'}
                aria-label={isHidden ? `Show ${PAGE_LABELS[id] ?? id}` : `Hide ${PAGE_LABELS[id] ?? id}`}
                className="bs-focusable"
                style={{
                  all: 'unset', cursor: 'pointer', fontSize: AT.caption, fontWeight: AT.medium,
                  color: isHidden ? T.muted : T.primary,
                  background: isHidden ? tileBg() : `${T.primary}18`,
                  borderRadius: AT.rPill, padding: '4px 10px',
                }}
              >
                {isHidden ? 'Hidden' : 'Visible'}
              </button>

              {/* Up / down */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[{ dir: -1 as const, label: '↑', disabled: i === 0 }, { dir: 1 as const, label: '↓', disabled: i === order.length - 1 }].map(({ dir, label, disabled }) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => move(i, dir)}
                    disabled={disabled}
                    aria-label={dir === -1 ? 'Move up' : 'Move down'}
                    className="bs-focusable"
                    style={{
                      all: 'unset', cursor: disabled ? 'default' : 'pointer',
                      width: 22, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 5, background: tileBg(),
                      fontSize: 11, color: disabled ? T.muted : T.text, lineHeight: 1,
                      opacity: disabled ? 0.35 : 1,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!isDefault && (
        <button
          type="button"
          onClick={resetOrder}
          className="bs-focusable"
          style={{
            all: 'unset', cursor: 'pointer', marginTop: 10, fontSize: AT.caption,
            color: T.muted, textDecoration: 'underline',
          }}
        >
          Reset to default order
        </button>
      )}
    </>
  );
}

// ── UI style section ─────────────────────────────────────────────────────────

const EDITIONS: Array<{ id: Edition; label: string; note: string }> = [
  { id: 'halo', label: 'Halo', note: 'Clean and minimal — the Better SGY look' },
  { id: 'forge', label: 'Forge', note: 'Canvas-style dashboard with course cards' },
  { id: 'slate', label: 'Slate', note: 'Classic Schoology layout & activity feed' },
];

function UIStyleSection({ settings, onSave }: { settings: Settings; onSave: (patch: Partial<Settings>) => Promise<Settings> }) {
  return (
    <>
      <SectionTitle>UI Style</SectionTitle>
      <div style={{ ...haloCardStyle(), overflow: 'hidden' }}>
        {EDITIONS.map((e, i) => (
          <div
            key={e.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 18px',
              borderBottom: i < EDITIONS.length - 1 ? `1px solid ${hairline()}` : 'none',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: AT.sub, fontWeight: AT.medium, color: T.text }}>{e.label}</div>
              <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 2 }}>{e.note}</div>
            </div>
            {settings.edition === e.id ? (
              <span style={{ fontSize: AT.caption, fontWeight: AT.semibold, color: T.primary }}>Active</span>
            ) : (
              <button
                type="button"
                className="bs-focusable bs-press"
                onClick={() => void onSave({ edition: e.id })}
                style={{
                  all: 'unset', cursor: 'pointer', fontSize: AT.caption, fontWeight: AT.medium,
                  color: T.primary, padding: '5px 12px', borderRadius: 8, background: `${T.primary}18`,
                }}
              >
                Switch
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Discord section ───────────────────────────────────────────────────────────

function DiscordSection({ settings, onSave }: { settings: Settings; onSave: (patch: Partial<Settings>) => Promise<Settings> }) {
  const [url, setUrl] = useState(settings.discordWebhook);
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setUrl(settings.discordWebhook); }, [settings.discordWebhook]);

  function handleChange(v: string) {
    setUrl(v);
    setTestState('idle');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void onSave({ discordWebhook: v.trim() }); }, 600);
  }

  async function handleTest() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setTestState('testing');
    try {
      await testDiscordWebhook(trimmed);
      setTestState('ok');
    } catch {
      setTestState('fail');
    }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, padding: '8px 12px',
    fontSize: AT.sub, fontFamily: AT.font,
    background: T.bg, color: T.text,
    border: `1px solid ${hairline()}`, borderRadius: 8,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <>
      <SectionTitle>Discord alerts</SectionTitle>
      <div style={{ ...haloCardStyle(), padding: '16px 18px' }}>
        <p style={{ margin: '0 0 12px', fontSize: AT.caption, color: T.muted, lineHeight: 1.55 }}>
          Paste a Discord webhook URL to get grade alerts posted straight to a channel. Leave blank to disable.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="url"
            placeholder="https://discord.com/api/webhooks/…"
            value={url}
            onChange={(e) => handleChange(e.target.value)}
            style={inputStyle}
            aria-label="Discord webhook URL"
          />
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={!url.trim() || testState === 'testing'}
            className="bs-focusable bs-press"
            style={{
              all: 'unset', cursor: url.trim() && testState !== 'testing' ? 'pointer' : 'default',
              flexShrink: 0, fontSize: AT.caption, fontWeight: AT.medium,
              color: T.primary, padding: '8px 14px', borderRadius: 8,
              background: `${T.primary}18`,
              opacity: !url.trim() || testState === 'testing' ? 0.45 : 1,
            }}
          >
            {testState === 'testing' ? 'Sending…' : testState === 'ok' ? '✓ Sent' : testState === 'fail' ? '✗ Failed' : 'Test'}
          </button>
        </div>
        {testState === 'fail' && (
          <p style={{ margin: '8px 0 0', fontSize: AT.caption, color: '#ef4444' }}>
            Couldn't reach the webhook — check the URL and try again.
          </p>
        )}
      </div>
    </>
  );
}

// ── Detected section ─────────────────────────────────────────────────────────

function DetectedSection({ data }: { data: SchoologyData }) {
  const totalAssignments = data.courses.reduce(
    (sum, c) => sum + c.categories.reduce((s, cat) => s + cat.assignments.length, 0), 0,
  );
  const rows: Array<{ label: string; value: string; last?: boolean }> = [
    { label: 'Last synced', value: timeAgo(data.scrapedAt) },
    { label: 'Grading period', value: data.gradingPeriod || '—' },
    { label: 'Courses', value: String(data.courses.length) },
    { label: 'Assignments', value: String(totalAssignments), last: true },
  ];
  return (
    <>
      <SectionTitle>Detected</SectionTitle>
      <div style={{ ...haloCardStyle(), overflow: 'hidden' }}>
        {rows.map((r) => <InfoRow key={r.label} label={r.label} value={r.value} last={r.last} />)}
      </div>
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function SettingsPage({ settings, onSave, data, onOpenTour, onNavigate, pageOrder, announcementsUnread }: Props) {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflowY: 'auto',
      background: T.bg, fontFamily: AT.font,
    }}>
      <div style={{
        maxWidth: 680, width: '100%', margin: '0 auto',
        padding: '40px clamp(20px, 4vw, 40px) 80px',
        boxSizing: 'border-box',
      }}>
        <h1 style={{ margin: '0 0 4px', fontSize: AT.h1, fontWeight: AT.semibold, color: T.text, letterSpacing: AT.trackHead }}>
          Settings
        </h1>
        <p style={{ margin: '0 0 8px', fontSize: AT.caption, color: T.muted }}>
          Customise Better SGY to fit how you use it.
        </p>

        {onNavigate && (
          <GoToSection onNavigate={onNavigate} pageOrder={pageOrder} announcementsUnread={announcementsUnread} />
        )}

        <ShowOriginalSection />

        {onOpenTour && (
          <>
            <SectionTitle>Demo &amp; tutorial</SectionTitle>
            <div style={{
              ...haloCardStyle(), padding: '16px 18px', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between', gap: 14,
            }}>
              <div>
                <div style={{ fontSize: AT.sub, fontWeight: AT.semibold, color: T.text }}>Take a tour</div>
                <div style={{ fontSize: AT.caption, color: T.muted, marginTop: 2, lineHeight: 1.45 }}>
                  Explore the looks with sample grades and a guided walkthrough of the shortcuts. Nothing to log into.
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenTour}
                className="bs-focusable bs-press"
                style={{
                  all: 'unset', cursor: 'pointer', flexShrink: 0,
                  fontSize: AT.sub, fontWeight: AT.semibold, color: '#fff',
                  background: T.primary, borderRadius: AT.rPill, padding: '9px 18px',
                }}
              >
                Open
              </button>
            </div>
          </>
        )}

        <TabOrderSection settings={settings} onSave={onSave} />
        <UIStyleSection settings={settings} onSave={onSave} />
        <DiscordSection settings={settings} onSave={onSave} />
        {data && <DetectedSection data={data} />}

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
