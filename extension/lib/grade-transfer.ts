/**
 * grade-transfer.ts — export/import your saved grade snapshot as a file, so you can
 * carry grades across installs/versions or restore them after a wipe (e.g. summer,
 * when Schoology clears the gradebook). Everything stays local — it's just a file
 * you download and load back in.
 */
import { SchoologyDataSchema, type SchoologyData } from './schemas';
import { loadGradeData, loadLastGoodData, saveGradeData } from './storage';

interface TransferFile {
  _bsgy: 1;
  exportedAt: number;
  data: SchoologyData;
}

/** Download the current (or last-known-good) grades as a .json backup. */
export async function exportGrades(): Promise<{ ok: boolean; error?: string }> {
  const data = (await loadGradeData()) ?? (await loadLastGoodData());
  if (!data) return { ok: false, error: 'No grades saved yet to back up.' };
  const payload: TransferFile = { _bsgy: 1, exportedAt: Date.now(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `better-sgy-grades-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { ok: true };
}

/** Validate + save a backup's text as the current grades (also sets the fallback). */
export async function importGradesFromText(text: string): Promise<{ ok: boolean; error?: string; courseCount?: number }> {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, error: 'That file isn’t valid JSON.' }; }
  const wrapper = parsed as { data?: unknown };
  const candidate = wrapper && typeof wrapper === 'object' && 'data' in wrapper ? wrapper.data : parsed;
  const res = SchoologyDataSchema.safeParse(candidate);
  if (!res.success) {
    const first = res.error.issues[0];
    return { ok: false, error: first ? `Invalid backup — ${first.path.join('.') || 'data'}: ${first.message}` : 'Not a valid Better SGY grades backup.' };
  }
  await saveGradeData(res.data); // writes current + last-good; the grades hook auto-refreshes
  return { ok: true, courseCount: res.data.courses.length };
}

/** Open a file picker and import the chosen backup. */
export function pickAndImportGrades(): Promise<{ ok: boolean; error?: string; courseCount?: number }> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return resolve({ ok: false, error: 'No file selected.' });
      try { resolve(await importGradesFromText(await file.text())); }
      catch { resolve({ ok: false, error: 'Couldn’t read that file.' }); }
    };
    input.click();
  });
}
