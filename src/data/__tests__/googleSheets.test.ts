import { afterEach, describe, expect, it, vi } from 'vitest';
import { SheetAccessError, loadFromGoogleSheet, tabCsvUrl } from '../googleSheets';

const CSV: Record<string, string> = {
  fellows: 'fellow_id,status,name\nasha,Published,Asha Rao\n',
  resources:
    'resource_id,fellow_id,status,title,subject\nasha-one,asha,Published,"Fractions, with rotis",Maths\n',
  files: 'resource_id,order,file_name,file_link\nasha-one,1,Unit plan,https://drive.google.com/x\n',
};

function mockFetch(responder: (tab: string) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => responder(new URL(url).searchParams.get('sheet') ?? '')),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('loadFromGoogleSheet', () => {
  it('builds the URL for one tab', () => {
    expect(tabCsvUrl('abc', 'fellows')).toBe(
      'https://docs.google.com/spreadsheets/d/abc/gviz/tq?tqx=out%3Acsv&sheet=fellows',
    );
  });

  it('reads all three tabs and joins them', async () => {
    mockFetch((tab) => new Response(CSV[tab] ?? '', { status: 200 }));
    const { dataset, warnings } = await loadFromGoogleSheet('abc');
    expect(warnings).toEqual([]);
    expect(dataset.fellows[0]?.name).toBe('Asha Rao');
    expect(dataset.resources[0]?.title).toBe('Fractions, with rotis');
    expect(dataset.resources[0]?.files[0]?.link).toBe('https://drive.google.com/x');
  });

  it('explains the problem when the sheet is private', async () => {
    mockFetch(() => new Response('<!doctype html><html>Sign in</html>', { status: 200 }));
    await expect(loadFromGoogleSheet('abc')).rejects.toBeInstanceOf(SheetAccessError);
  });
});
