import { describe, expect, it } from 'vitest';
import { parseCsv, rowsToRecords } from '../../lib/csv';

describe('parseCsv', () => {
  it('splits simple rows and fields', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles quotes, escaped quotes, commas and line breaks inside quotes', () => {
    const text = 'title,summary\r\n"Keep Trying","I think ""___"", because\nthe text says"\r\n';
    expect(parseCsv(text)).toEqual([
      ['title', 'summary'],
      ['Keep Trying', 'I think "___", because\nthe text says'],
    ]);
  });

  it('keeps a last row without a trailing newline and strips a BOM', () => {
    expect(parseCsv('\uFEFFa,b\n1,')).toEqual([
      ['a', 'b'],
      ['1', ''],
    ]);
  });
});

describe('rowsToRecords', () => {
  it('keys by lowercase header, trims cells and drops empty rows', () => {
    const rows = [
      [' Fellow_ID ', 'Name'],
      [' yohannan ', 'Yohannan '],
      ['', ''],
    ];
    expect(rowsToRecords(rows)).toEqual([{ fellow_id: 'yohannan', name: 'Yohannan' }]);
  });

  it('returns an empty list for an empty sheet', () => {
    expect(rowsToRecords([])).toEqual([]);
  });
});
