import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  config: {
    dataSource: 'sheet' as 'sheet' | 'supabase',
    sheetId: 'sheet-id',
    supabaseUrl: '',
    supabasePublishableKey: '',
    defaultFellow: 'yohannan',
    siteName: 'Fellow Portfolio',
  },
  loadFromGoogleSheet: vi.fn(),
  loadFellowDataset: vi.fn(),
}));

vi.mock('../../config', () => ({ config: mocks.config }));
vi.mock('../googleSheets', () => ({ loadFromGoogleSheet: mocks.loadFromGoogleSheet }));
vi.mock('../supabase/queries', () => ({ loadFellowDataset: mocks.loadFellowDataset }));

import { loadData } from '../loadData';

const dataset = (id: string) => ({
  fellows: [{ id, name: id, firstName: id } as never],
  resources: [],
});

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  return store;
}

beforeEach(() => {
  mocks.config.dataSource = 'sheet';
  mocks.config.sheetId = 'sheet-id';
  mocks.loadFromGoogleSheet.mockReset();
  mocks.loadFellowDataset.mockReset();
  stubStorage();
});
afterEach(() => vi.unstubAllGlobals());

describe('loadData source', () => {
  it('reads the sheet when VITE_DATA_SOURCE is sheet', async () => {
    mocks.loadFromGoogleSheet.mockResolvedValue({ dataset: dataset('a'), warnings: [] });
    const data = await loadData(undefined, 'ignored');
    expect(data.origin).toBe('sheet');
    expect(mocks.loadFellowDataset).not.toHaveBeenCalled();
  });

  it('uses the sample data when no sheet is configured', async () => {
    mocks.config.sheetId = '';
    expect((await loadData()).origin).toBe('sample');
  });

  it('reads one fellow from Supabase when VITE_DATA_SOURCE is supabase', async () => {
    mocks.config.dataSource = 'supabase';
    mocks.loadFellowDataset.mockResolvedValue(dataset('asha'));
    const data = await loadData(undefined, 'asha');
    expect(data.origin).toBe('supabase');
    expect(mocks.loadFellowDataset).toHaveBeenCalledWith('asha', undefined);
    expect(mocks.loadFromGoogleSheet).not.toHaveBeenCalled();
  });

  it('defaults to the default fellow on the home page', async () => {
    mocks.config.dataSource = 'supabase';
    mocks.loadFellowDataset.mockResolvedValue(dataset('yohannan'));
    await loadData();
    expect(mocks.loadFellowDataset).toHaveBeenCalledWith('yohannan', undefined);
  });

  it('falls back to the saved copy of that fellow when Supabase is unreachable', async () => {
    mocks.config.dataSource = 'supabase';
    mocks.loadFellowDataset.mockResolvedValueOnce(dataset('asha'));
    await loadData(undefined, 'asha');
    mocks.loadFellowDataset.mockRejectedValueOnce(new Error('network down'));
    const data = await loadData(undefined, 'asha');
    expect(data.origin).toBe('cache');
    expect(data.dataset.fellows[0]?.id).toBe('asha');
    // A different fellow has no saved copy, so the error is shown.
    mocks.loadFellowDataset.mockRejectedValueOnce(new Error('network down'));
    await expect(loadData(undefined, 'ravi')).rejects.toThrow('network down');
  });

  it('does not save an empty answer for an unknown fellow', async () => {
    mocks.config.dataSource = 'supabase';
    const store = stubStorage();
    mocks.loadFellowDataset.mockResolvedValue({ fellows: [], resources: [] });
    await loadData(undefined, 'nobody');
    expect(store.size).toBe(0);
  });
});
