import React, { useState } from 'react';
import { T, inkOnAccent } from '../lib/theme';
import { exportGrades, pickAndImportGrades } from '../lib/grade-transfer';

/**
 * Transfer control. Two looks:
 *  - 'inline' → a single "Import a backup" button (used on the no-data screen so a
 *    fresh install / wiped term can restore grades).
 *  - 'pill'   → a low-key bottom-left pill (Backup + Import) shown on the dashboard.
 * On a successful import, the grades hook auto-refreshes via storage.onChanged.
 */
export function GradeTransfer({ variant }: { variant: 'pill' | 'inline' }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(null), 3500); };

  const doExport = async () => {
    setBusy(true);
    const r = await exportGrades();
    setBusy(false);
    flash(r.ok ? 'Backup downloaded ✓' : (r.error ?? 'Nothing to back up'));
  };
  const doImport = async () => {
    setBusy(true);
    const r = await pickAndImportGrades();
    setBusy(false);
    flash(r.ok ? `Imported ${r.courseCount} course${r.courseCount === 1 ? '' : 's'} ✓` : (r.error ?? 'Import failed'));
  };

  if (variant === 'inline') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <button type="button" onClick={doImport} disabled={busy} className="bs-focusable bs-lift" style={btn(true)}>
          ⤒ Import a grades backup
        </button>
        {msg && <span style={{ fontSize: 11, color: T.muted }}>{msg}</span>}
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', left: 16, bottom: 18, zIndex: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, pointerEvents: 'auto' }}>
      {msg && (
        <span style={{ fontSize: 11, fontWeight: 600, color: T.text, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 999, padding: '4px 10px', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' }}>
          {msg}
        </span>
      )}
      <div style={{ display: 'flex', gap: 4, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 999, padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
        <button type="button" onClick={doExport} disabled={busy} title="Download a backup of your grades" aria-label="Back up grades" className="bs-focusable" style={btn(false)}>
          ⤓ Backup
        </button>
        <button type="button" onClick={doImport} disabled={busy} title="Load a grades backup file" aria-label="Import grades backup" className="bs-focusable" style={btn(false)}>
          ⤒ Import
        </button>
      </div>
    </div>
  );
}

function btn(primary: boolean): React.CSSProperties {
  return {
    all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 12, fontWeight: 600, boxSizing: 'border-box',
    padding: primary ? '10px 16px' : '6px 12px', borderRadius: 999,
    color: primary ? inkOnAccent() : T.text,
    background: primary ? T.primary : 'transparent',
    border: primary ? 'none' : `1px solid ${T.border}`,
  };
}
