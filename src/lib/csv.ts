/**
 * Parses CSV text (RFC 4180): quoted fields, escaped quotes ("") and line
 * breaks inside quotes. Returns rows of raw string cells.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // drop a byte-order mark

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Turns parsed CSV rows into objects keyed by the header row. Header names
 * are trimmed and lowercased; fully empty rows are dropped.
 */
export function rowsToRecords(rows: string[][]): Record<string, string>[] {
  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());
  return body
    .filter((cells) => cells.some((c) => c.trim() !== ''))
    .map((cells) => {
      const rec: Record<string, string> = {};
      keys.forEach((key, i) => {
        if (key) rec[key] = (cells[i] ?? '').trim();
      });
      return rec;
    });
}
