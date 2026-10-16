import { config } from '../config';
import type { Dataset, LoadedData } from '../types';
import { loadFromGoogleSheet } from './googleSheets';
import { sampleDataset } from './sample';

const CACHE_KEY = 'fellow-portfolio:data:v2';

interface CacheEntry {
  fetchedAt: string;
  dataset: Dataset;
}

function readCache(): CacheEntry | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheEntry) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(entry: CacheEntry) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage full or blocked: the site still works, it just won't have an offline copy.
  }
}

/**
 * Loads the site data.
 * - No sheet configured: bundled sample data (local development).
 * - Sheet reachable: live data, saved as an offline copy.
 * - Sheet unreachable: the last saved copy if there is one, otherwise an error.
 */
export async function loadData(signal?: AbortSignal): Promise<LoadedData> {
  if (!config.sheetId) {
    return { dataset: sampleDataset, origin: 'sample', warnings: [] };
  }
  try {
    const { dataset, warnings } = await loadFromGoogleSheet(config.sheetId, signal);
    const fetchedAt = new Date().toISOString();
    writeCache({ fetchedAt, dataset });
    return { dataset, origin: 'sheet', fetchedAt, warnings };
  } catch (err) {
    if (signal?.aborted) throw err;
    const cached = readCache();
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
