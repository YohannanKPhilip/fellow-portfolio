import { config } from '../config';
import type { Dataset, LoadedData } from '../types';
import { loadFromGoogleSheet } from './googleSheets';
import { sampleDataset } from './sample';
import { loadFellowDataset } from './supabase/queries';

const CACHE_PREFIX = 'fellow-portfolio:data:v2';

interface CacheEntry {
  fetchedAt: string;
  dataset: Dataset;
}

function readCache(key: string): CacheEntry | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CacheEntry) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(key: string, entry: CacheEntry) {
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full or blocked: the site still works, it just won't have an offline copy.
  }
}

/** Fetches live data and saves an offline copy; on failure falls back to the saved copy. */
async function loadWithCache(
  cacheKey: string,
  origin: 'sheet' | 'supabase',
  fetchLive: () => Promise<{ dataset: Dataset; warnings: string[] }>,
  signal?: AbortSignal,
): Promise<LoadedData> {
  try {
    const { dataset, warnings } = await fetchLive();
    const fetchedAt = new Date().toISOString();
    // Don't keep an "empty" answer (unknown fellow): it would hide a good copy later.
    if (dataset.fellows.length > 0) writeCache(cacheKey, { fetchedAt, dataset });
    return { dataset, origin, fetchedAt, warnings };
  } catch (err) {
    if (signal?.aborted) throw err;
    const cached = readCache(cacheKey);
    if (cached) {
      return {
        dataset: cached.dataset,
        origin: 'cache',
        fetchedAt: cached.fetchedAt,
        warnings: [String(err)],
      };
    }
    throw err;
  }
}

/**
 * Loads the site data from the source chosen by VITE_DATA_SOURCE.
 * - supabase: the page of the fellow in `fellowSlug`, saved as an offline copy per fellow.
 * - sheet: the whole Google Sheet, saved as one offline copy. With no sheet configured,
 *   the bundled sample data (local development).
 * - Source unreachable: the last saved copy if there is one, otherwise an error.
 */
export async function loadData(
  signal?: AbortSignal,
  fellowSlug: string = config.defaultFellow,
): Promise<LoadedData> {
  if (config.dataSource === 'supabase') {
    return loadWithCache(
      `${CACHE_PREFIX}:supabase:${fellowSlug}`,
      'supabase',
      async () => ({ dataset: await loadFellowDataset(fellowSlug, signal), warnings: [] }),
      signal,
    );
  }
  if (!config.sheetId) {
    return { dataset: sampleDataset, origin: 'sample', warnings: [] };
  }
  const sheetId = config.sheetId;
  return loadWithCache(CACHE_PREFIX, 'sheet', () => loadFromGoogleSheet(sheetId, signal), signal);
}
