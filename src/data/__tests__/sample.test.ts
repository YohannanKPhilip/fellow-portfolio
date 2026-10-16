import { describe, expect, it } from 'vitest';
import { ID_PATTERN } from '../schema';
import { sampleDataset } from '../sample';

describe('sample data', () => {
  it('uses valid IDs and links every resource to a fellow', () => {
    const fellowIds = new Set(sampleDataset.fellows.map((f) => f.id));
    for (const f of sampleDataset.fellows) expect(f.id).toMatch(ID_PATTERN);
    for (const r of sampleDataset.resources) {
      expect(r.id).toMatch(ID_PATTERN);
      expect(fellowIds.has(r.fellowId)).toBe(true);
      expect(r.id.startsWith(`${r.fellowId}-`)).toBe(true);
    }
  });
});
