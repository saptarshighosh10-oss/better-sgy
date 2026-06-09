import React, { useEffect, useState } from 'react';
import { findSchoologyContainers, isNativeHidden } from '../lib/dom-takeover';
import type { ScrapeResult } from '../lib/scrape-status';
import { INITIAL_SCRAPE_RESULT, statusLabel } from '../lib/scrape-status';

interface DebugInfo {
  extensionLoaded: boolean;
  currentPath: string;
  mountCount: number;
  candidateContainers: { selector: string; found: boolean }[];
  domReadable: boolean;
  storageReadWrite: 'pending' | 'pass' | 'fail';
  nativeUIState: 'hidden' | 'visible';
}

interface DebugPanelProps {
  mountCount: number;
  scrapeResult?: ScrapeResult;
}

/**
 * DebugPanel — Phase 0 + Phase 1
 *
 * Shows diagnostic information for testing:
 *  Phase 0: extension loaded, path, mount count, containers, DOM, storage, native UI
 *  Phase 1: scrape status, course count, assignment count, grading period,
 *           validation result, fetch experiment result
 */
export function DebugPanel({ mountCount, scrapeResult = INITIAL_SCRAPE_RESULT }: DebugPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [info, setInfo] = useState<DebugInfo>({
    extensionLoaded: true,
    currentPath: window.location.pathname,
    mountCount,
    candidateContainers: [],
    domReadable: false,
    storageReadWrite: 'pending',
    nativeUIState: 'visible',
  });

  useEffect(() => {
    // DOM readability check
    const domReadable = !!document.querySelector('body');

    // Candidate containers
    const candidateContainers = findSchoologyContainers();

    // Native UI state
    const nativeUIState = isNativeHidden() ? 'hidden' : 'visible';

    // Update sync info
    setInfo((prev) => ({
      ...prev,
      currentPath: window.location.pathname,
      mountCount,
      domReadable,
      candidateContainers,
      nativeUIState,
    }));

    // browser.storage.local read/write test (async)
    testStorage().then((result) => {
      setInfo((prev) => ({ ...prev, storageReadWrite: result }));
    });
  }, [mountCount]);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed',
          bottom: '12px',
          right: '12px',
          zIndex: 2147483646,
          background: '#16213e',
          color: '#0f3460',
          border: '1px solid #0f3460',
          borderRadius: '8px',
          padding: '6px 12px',
          cursor: 'pointer',
          fontFamily: "'Inter', monospace",
          fontSize: '11px',
        }}
      >
        🔧 BS Debug
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '12px',
        right: '12px',
        zIndex: 2147483646,
        background: '#16213e',
        color: '#e0e0e0',
        border: '1px solid #0f3460',
        borderRadius: '12px',
        padding: '16px',
        fontFamily: "'Inter', monospace",
        fontSize: '12px',
        maxWidth: '420px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        lineHeight: 1.6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <strong style={{ color: '#e94560', fontSize: '13px' }}>🔧 BS Phase 2 Debug</strong>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Phase 0 checks ── */}
      <SectionHeader>Core</SectionHeader>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          <Row label="Extension Loaded" value={badge(info.extensionLoaded, '✅ Yes', '❌ No')} />
          <Row label="Current Path" value={<code style={{ color: '#5bc0de' }}>{info.currentPath}</code>} />
          <Row label="Mount Count" value={<span style={{ color: info.mountCount > 1 ? '#e94560' : '#5cb85c' }}>{info.mountCount}</span>} />
          <Row label="DOM Readable" value={badge(info.domReadable, '✅ Yes', '❌ No')} />
          <Row
            label="Storage R/W"
            value={
              <span style={{ color: info.storageReadWrite === 'pass' ? '#5cb85c' : info.storageReadWrite === 'fail' ? '#e94560' : '#f0ad4e' }}>
                {info.storageReadWrite === 'pass' ? '✅ Pass' : info.storageReadWrite === 'fail' ? '❌ Fail' : '⏳ Testing…'}
              </span>
            }
          />
          <Row label="Native UI" value={<span style={{ color: info.nativeUIState === 'hidden' ? '#5cb85c' : '#f0ad4e' }}>{info.nativeUIState}</span>} />
        </tbody>
      </table>

      {/* ── Phase 1: Scrape status ── */}
      <SectionHeader>Scrape Status</SectionHeader>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          <Row
            label="Status"
            value={
              <span style={{ color: scrapeStatusColor(scrapeResult.status) }}>
                {statusLabel(scrapeResult.status)}
              </span>
            }
          />
          <Row label="Courses" value={<span style={{ color: '#5bc0de' }}>{scrapeResult.courseCount}</span>} />
          <Row label="Assignments" value={<span style={{ color: '#5bc0de' }}>{scrapeResult.assignmentCount}</span>} />
          <Row label="Period" value={<code style={{ color: '#5bc0de' }}>{scrapeResult.gradingPeriod || '—'}</code>} />
          {scrapeResult.scrapedAt && (
            <Row
              label="Scraped At"
              value={<span style={{ color: '#aaa' }}>{new Date(scrapeResult.scrapedAt).toLocaleTimeString()}</span>}
            />
          )}
          {scrapeResult.error && (
            <Row
              label="Error"
              value={
                <span style={{ color: '#e94560', fontSize: '11px', wordBreak: 'break-word' }}>
                  {scrapeResult.error}
                </span>
              }
            />
          )}
        </tbody>
      </table>

      {/* ── Phase 1: Fetch experiment ── */}
      {scrapeResult.fetchExperimentResult !== 'untested' && (
        <>
          <SectionHeader>Fetch Experiment</SectionHeader>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <Row
                label="Result"
                value={
                  <span style={{ color: scrapeResult.fetchExperimentResult === 'success' ? '#5cb85c' : '#e94560' }}>
                    {scrapeResult.fetchExperimentResult === 'success' ? '✅ Success' : '❌ Failed'}
                  </span>
                }
              />
              <Row
                label="Note"
                value={
                  <span style={{ color: '#aaa', fontSize: '11px', wordBreak: 'break-word' }}>
                    {scrapeResult.fetchExperimentNote}
                  </span>
                }
              />
            </tbody>
          </table>
        </>
      )}

      {/* ── Candidate containers ── */}
      <SectionHeader>Candidate Containers</SectionHeader>
      {info.candidateContainers.length === 0 ? (
        <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>None checked yet</div>
      ) : (
        <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
          {info.candidateContainers.map((c) => (
            <li key={c.selector} style={{ color: c.found ? '#5cb85c' : '#888', fontSize: '11px' }}>
              <code>{c.selector}</code> {c.found ? '✅' : '—'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Helpers ---

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: '#e94560',
        fontSize: '11px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginTop: '12px',
        marginBottom: '4px',
        borderTop: '1px solid #0f3460',
        paddingTop: '8px',
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td style={{ color: '#aaa', paddingRight: '12px', paddingBottom: '4px', whiteSpace: 'nowrap' }}>{label}</td>
      <td style={{ paddingBottom: '4px' }}>{value}</td>
    </tr>
  );
}

function badge(ok: boolean, yes: string, no: string) {
  return <span style={{ color: ok ? '#5cb85c' : '#e94560' }}>{ok ? yes : no}</span>;
}

function scrapeStatusColor(status: string): string {
  if (status === 'fresh') return '#5cb85c';
  if (status === 'stale') return '#f0ad4e';
  if (status === 'failed') return '#e94560';
  if (status === 'idle') return '#888';
  return '#5bc0de'; // in-progress states
}

async function testStorage(): Promise<'pass' | 'fail'> {
  try {
    const testKey = '__bs_phase0_test__';
    const testVal = Date.now();
    await browser.storage.local.set({ [testKey]: testVal });
    const result = await browser.storage.local.get(testKey);
    await browser.storage.local.remove(testKey);
    return result[testKey] === testVal ? 'pass' : 'fail';
  } catch (e) {
    console.warn('[BS] storage test failed:', e);
    return 'fail';
  }
}
