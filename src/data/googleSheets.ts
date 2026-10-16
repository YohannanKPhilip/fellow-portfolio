import { parseCsv, rowsToRecords } from '../lib/csv';
import { buildDataset, type BuildResult } from './mappers';
import { TABS } from './schema';

export class SheetAccessError extends Error {
  constructor(tab: string) {
    super(
      `Could not read the "${tab}" tab. Check that the sheet is shared as ` +
        '"Anyone with the link can view" and that the tab name is correct.',
    );
    this.name = 'SheetAccessError';
  }
}

/** Public CSV endpoint for one tab of a link-shared Google Sheet. */
export function tabCsvUrl(sheetId: string, tab: string): string {
  const params = new URLSearchParams({ tqx: 'out:csv', sheet: tab });
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?${params}`;
}

async function fetchTab(sheetId: string, tab: string, signal?: AbortSignal) {
  const res = await fetch(tabCsvUrl(sheetId, tab), { signal, cache: 'no-store' });
  const text = await res.text();
  // A private sheet answers with an HTML sign-in page instead of CSV.
  if (!res.ok || text.trimStart().startsWith('<')) throw new SheetAccessError(tab);
  return rowsToRecords(parseCsv(text));
}

export async function loadFromGoogleSheet(
  sheetId: string,
  signal?: AbortSignal,
): Promise<BuildResult> {
  const [fellows, resources, files, media] = await Promise.all([
    fetchTab(sheetId, TABS.fellows, signal),
    fetchTab(sheetId, TABS.resources, signal),
    fetchTab(sheetId, TABS.files, signal),
    // The media tab is optional: a sheet without one still works.
    fetchTab(sheetId, TABS.media, signal).catch((err: unknown) => {
      if (signal?.aborted) throw err;
      return [];
    }),
  ]);
  return buildDataset(fellows, resources, files, media);
}
