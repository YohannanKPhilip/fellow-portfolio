import { describe, expect, it } from 'vitest';
import { safeNext } from '../next';
import { RESERVED_SLUGS, isReservedSlug, slugFromName, slugProblem } from '../slug';

describe('slugFromName', () => {
  it('makes a lowercase hyphenated address', () => {
    expect(slugFromName('Priya Sharma')).toBe('priya-sharma');
    expect(slugFromName("  Ravi  K. D'Souza ")).toBe('ravi-k-d-souza');
  });

  it('drops accents and symbols, and trims hyphens', () => {
    expect(slugFromName('José Núñez')).toBe('jose-nunez');
    expect(slugFromName('--Asha!!--')).toBe('asha');
  });

  it('never exceeds 40 characters or ends in a hyphen', () => {
    const slug = slugFromName('a'.repeat(38) + ' bcd efg');
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('slugProblem', () => {
  it('accepts normal addresses', () => {
    expect(slugProblem('yohannan')).toBeUndefined();
    expect(slugProblem('priya-sharma-2')).toBeUndefined();
  });

  it.each(['ab', 'Priya', 'priya_sharma', '-priya', 'priya-', 'pri--ya', 'a'.repeat(41), 'pri ya'])(
    'rejects "%s"',
    (slug) => {
      expect(slugProblem(slug)).toBeTypeOf('string');
    },
  );

  it('rejects every word the site uses for its own pages', () => {
    for (const word of RESERVED_SLUGS) {
      expect(isReservedSlug(word)).toBe(true);
      // Words shorter than 3 characters are rejected by the length rule first.
      expect(slugProblem(word)).toBeTypeOf('string');
    }
  });
});

describe('safeNext', () => {
  it('follows paths on this site', () => {
    expect(safeNext('/me/profile')).toBe('/me/profile');
    expect(safeNext('/setup')).toBe('/setup');
  });

  it('falls back to /me for anything that could leave the site', () => {
    expect(safeNext(null)).toBe('/me');
    expect(safeNext('')).toBe('/me');
    expect(safeNext('https://evil.test/')).toBe('/me');
    expect(safeNext('//evil.test')).toBe('/me');
    expect(safeNext('/\\evil.test')).toBe('/me');
    expect(safeNext('javascript:alert(1)')).toBe('/me');
  });
});
