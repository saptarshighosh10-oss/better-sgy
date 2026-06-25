/**
 * VersionsPage.tsx — the "previous models" gallery.
 *
 * Every design Better SGY has been through, bundled as standalone prototypes in
 * public/models/. Pick one and it opens full-screen in an iframe so you can use the
 * whole thing live. Lets a demo user browse all the looks from a single download.
 */
import React, { useEffect, useState } from 'react';
import { T } from '../../lib/theme';
import { AT, tileBg, hairline } from '../../lib/halo';
import { haloCardStyle } from '../halo-ui';
import { loadSettings, saveSettings } from '../../lib/settings';
import type { Edition } from '../../lib/settings';

interface Version {
  id: string;
  name: string;
  tagline: string;
  blurb: string;
  swatch: string[];
}

const VERSIONS: Version[] = [
  {
    id: 'halo',
    name: 'Halo',
    tagline: 'The current look',
    blurb: 'Clean and minimal. Color only for real signal — red for missing, green when a grade climbs.',
    swatch: ['#0d1019', '#3b82f6', '#e8eaf0'],
  },
  {
    id: 'apple',
    name: 'Apple',
    tagline: 'The polished concept',
    blurb: 'Glassy and spacious, San-Francisco type. The most refined take on the dashboard.',
    swatch: ['#f5f5f7', '#0a84ff', '#1d1d1f'],
  },
  {
    id: 'forge',
    name: 'Forge',
    tagline: 'The friendly one',
    blurb: 'Warm and conversational. Soft paper tones and a plain-language note on every grade.',
    swatch: ['#fdf4e6', '#4fb286', '#ef6a9b'],
  },
  {
    id: 'slate',
    name: 'Slate',
    tagline: 'Editorial',
    blurb: 'Your grades as a black-and-white broadsheet — "The Grade Review." Quiet and typographic.',
    swatch: ['#ffffff', '#1a1a1a', '#8a8a8e'],
  },
];

/** Version IDs that map to a real installed Edition and can be activated. */
const SELECTABLE = new Set<string>(['halo', 'forge', 'slate']);

function modelUrl(id: string): string {
  const path = `/models/${id}.html`;
  // getURL is typed to a strict union of known public files; widen it to accept the
  // dynamically-built model path (the files exist in public/models/).
  const getURL = browser.runtime.getURL as (p: string) => string;
  try {
    return getURL(path);
  } catch {
    return path.slice(1);
  }
}

/**
 * The prototypes run on heavy inline <script>, which the MV3 extension-page CSP
 * (script-src 'self') blocks when loaded by URL. Loading the HTML into a sandboxed
 * iframe via srcdoc runs it in an opaque origin under the default web CSP, so the
 * inline scripts execute. (localStorage throws there, but the prototypes guard it.)
 */
/**
 * The standalone demo (better-sgy-demo.html) is a single offline file with no server,
 * so fetch() can't reach the bundled prototypes. The demo build inlines them onto
 * globalThis.__BSGY_MODELS__ instead; we use those when present and fall back to
 * fetching the web-accessible resource in the real installed extension.
 */
function inlinedModel(id: string): string | undefined {
  const map = (globalThis as { __BSGY_MODELS__?: Record<string, string> }).__BSGY_MODELS__;
  return map?.[id];
}

function VersionViewer({
  version,
  onBack,
  activeEdition,
  onEditionChange,
}: {
  version: Version;
  onBack: () => void;
  activeEdition: Edition;
  onEditionChange: (id: Edition) => void;
}) {
  const [html, setHtml] = useState<string | null>(() => inlinedModel(version.id) ?? null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const canUse = SELECTABLE.has(version.id);
  const isActive = version.id === activeEdition;

  useEffect(() => {
    let alive = true;
    const inlined = inlinedModel(version.id);
    if (inlined) { setHtml(inlined); setFailed(false); return; }
    setHtml(null);
    setFailed(false);
    fetch(modelUrl(version.id))
      .then((r) => r.text())
      .then((t) => { if (alive) setHtml(t); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [version.id]);

  async function handleUse() {
    if (!canUse || isActive || saving) return;
    setSaving(true);
    try {
      await saveSettings({ edition: version.id as Edition });
      onEditionChange(version.id as Edition);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: T.bg }}>
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        borderBottom: `1px solid ${hairline()}`, background: T.panel, fontFamily: AT.font,
      }}>
        <button type="button" onClick={onBack} className="bs-focusable bs-press"
          style={{ all: 'unset', cursor: 'pointer', fontSize: AT.sub, fontWeight: AT.semibold, color: T.primary }}>
          ← All versions
        </button>
        <span style={{ fontSize: AT.sub, fontWeight: AT.semibold, color: T.text }}>{version.name}</span>
        <span style={{ fontSize: AT.caption, color: T.muted, flex: 1 }}>{version.tagline}</span>
        {canUse && (
          isActive ? (
            <span style={{ fontSize: AT.caption, fontWeight: AT.semibold, color: T.primary, flexShrink: 0 }}>
              Active
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void handleUse()}
              disabled={saving}
              className="bs-focusable bs-press"
              style={{
                all: 'unset', flexShrink: 0,
                cursor: saving ? 'default' : 'pointer',
                fontSize: AT.caption, fontWeight: AT.medium,
                color: T.primary, padding: '5px 12px',
                borderRadius: 8, background: `${T.primary}18`,
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Use this look'}
            </button>
          )
        )}
      </div>
      {failed ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: AT.body, fontFamily: AT.font }}>
          Couldn't load this version.
        </div>
      ) : html === null ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: AT.body, fontFamily: AT.font }}>
          Loading {version.name}…
        </div>
      ) : (
        <iframe
          key={version.id}
          title={`${version.name} prototype`}
          srcDoc={html}
          // allow-same-origin so the prototypes' localStorage calls don't throw and
          // halt their render. These are our own trusted bundled files.
          sandbox="allow-scripts allow-same-origin allow-popups allow-modals allow-forms"
          style={{ flex: 1, width: '100%', border: 'none', display: 'block' }}
        />
      )}
    </div>
  );
}

export function VersionsPage() {
  const [open, setOpen] = useState<Version | null>(null);
  const [edition, setEdition] = useState<Edition>('halo');

  useEffect(() => {
    loadSettings().then((s) => setEdition(s.edition));
  }, []);

  if (open) {
    return (
      <VersionViewer
        version={open}
        onBack={() => setOpen(null)}
        activeEdition={edition}
        onEditionChange={setEdition}
      />
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: T.bg, fontFamily: AT.font }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '48px clamp(20px, 4vw, 40px) 96px' }}>
        <h1 style={{ margin: 0, fontSize: AT.h1, fontWeight: AT.semibold, letterSpacing: AT.trackHead, color: T.text }}>
          Versions
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: AT.h3, color: T.muted, letterSpacing: AT.trackBody, lineHeight: 1.5 }}>
          Every design Better SGY has been through. Tap one to explore the whole thing, live.
        </p>

        <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {VERSIONS.map((v, i) => {
            const isActive = SELECTABLE.has(v.id) && v.id === edition;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setOpen(v)}
                className="bs-focusable bs-halo-in"
                style={{
                  all: 'unset', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
                  ...haloCardStyle(), overflow: 'hidden', animationDelay: `${i * 60}ms`,
                }}
              >
                {/* Swatch band — a quick visual hint of each look */}
                <div style={{ display: 'flex', height: 84, position: 'relative' }}>
                  {v.swatch.map((c, j) => (
                    <div key={j} style={{ flex: 1, background: c }} />
                  ))}
                  {isActive && (
                    <span style={{
                      position: 'absolute', top: 10, right: 12,
                      fontSize: AT.caption, fontWeight: AT.semibold, color: '#fff',
                      background: T.primary, borderRadius: AT.rPill, padding: '3px 10px',
                    }}>
                      Active
                    </span>
                  )}
                </div>
                <div style={{ padding: '18px 20px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                    <span style={{ fontSize: AT.h3, fontWeight: AT.semibold, color: T.text, letterSpacing: AT.trackHead }}>{v.name}</span>
                    <span style={{ fontSize: AT.caption, fontWeight: AT.medium, color: T.muted, background: tileBg(), borderRadius: AT.rPill, padding: '3px 10px' }}>
                      {v.tagline}
                    </span>
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: AT.sub, color: T.muted, lineHeight: 1.55 }}>{v.blurb}</p>
                  <span style={{ display: 'inline-flex', gap: 4, marginTop: 14, fontSize: AT.sub, color: T.primary, letterSpacing: AT.trackBody }}>
                    {isActive ? 'Currently active' : 'Open this version'} <span aria-hidden="true">›</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
