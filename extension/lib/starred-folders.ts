/**
 * starred-folders.ts
 *
 * Tracks user-starred Materials folders for cross-course quick access.
 * Stored in chrome.storage.local under key 'bs-starred-folders'.
 */

const STARRED_KEY = 'bs-starred-folders';

export interface StarredFolder {
  href: string;
  title: string;
  courseName: string;
}

export async function loadStarredFolders(): Promise<StarredFolder[]> {
  const result = await browser.storage.local.get(STARRED_KEY);
  return Array.isArray(result[STARRED_KEY]) ? (result[STARRED_KEY] as StarredFolder[]) : [];
}

/** Toggle a folder's starred state and persist. Returns the updated list. */
export async function toggleStarredFolder(folder: StarredFolder): Promise<StarredFolder[]> {
  const current = await loadStarredFolders();
  const next = current.some((f) => f.href === folder.href)
    ? current.filter((f) => f.href !== folder.href)
    : [...current, folder];
  await browser.storage.local.set({ [STARRED_KEY]: next });
  return next;
}
