import React, { useEffect, useState } from 'react';
import { T } from '../../lib/theme';
import { AT, tileBg, hairline } from '../../lib/halo';
import { haloCardStyle } from '../halo-ui';
import { ORDERABLE_PAGES, PAGE_LABELS } from '../../lib/pages';
import type { Settings, Edition } from '../../lib/settings';
import type { SchoologyData } from '../../lib/schemas';

interface Props {
  settings: Settings;
  onSave: (patch: Partial<Settings>) => Promise<Settings>;
  data: SchoologyData | null;
  /** Open the Versions gallery — a hands-on demo/tutorial with sample data. */
  onOpenTour?: () => void;
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

export function SettingsPage({ settings, onSave, data, onOpenTour }: Props) {
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
        {data && <DetectedSection data={data} />}

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
