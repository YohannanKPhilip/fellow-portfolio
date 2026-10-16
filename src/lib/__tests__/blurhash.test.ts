import { decode, encode } from 'blurhash';
import { describe, expect, it } from 'vitest';
import { blurhashCss, blurhashDataUrl, cleanRatio, componentsFor, isBlurhash } from '../blurhash';

const HASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

/** A w x h picture whose left half is red and right half is blue. */
function twoColors(w: number, h: number) {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const left = x < w / 2;
      pixels.set([left ? 255 : 0, 0, left ? 0 : 255, 255], i);
    }
  }
  return pixels;
}

describe('isBlurhash', () => {
  it('accepts a real blurhash and rejects anything else', () => {
    expect(isBlurhash(HASH)).toBe(true);
    for (const bad of ['', 'abc', 'not a blurhash!', HASH + 'x', HASH.slice(0, -2), null, 7]) {
      expect(isBlurhash(bad)).toBe(false);
    }
  });
});

describe('componentsFor', () => {
  it('gives more detail across a wide picture and down a tall one', () => {
    expect(componentsFor(32, 20)).toEqual({ x: 4, y: 3 });
    expect(componentsFor(20, 32)).toEqual({ x: 3, y: 4 });
    expect(componentsFor(32, 32)).toEqual({ x: 4, y: 4 });
  });
});

describe('cleanRatio', () => {
  it('keeps sensible shapes and turns anything else into 0 (not known)', () => {
    expect(cleanRatio(1.33333333)).toBe(1.333);
    for (const bad of [0, -1, 0.01, 50, NaN, Infinity, '1.5', null, undefined]) {
      expect(cleanRatio(bad)).toBe(0);
    }
  });
});

describe('encoding and decoding', () => {
  it('makes a valid blurhash that decodes back to roughly the same colors', () => {
    const { x, y } = componentsFor(32, 20);
    const hash = encode(twoColors(32, 20), 32, 20, x, y);
    expect(isBlurhash(hash)).toBe(true);
    expect(hash.length).toBeLessThanOrEqual(36);

    const out = decode(hash, 16, 16);
    const at = (px: number) => Array.from(out.slice((8 * 16 + px) * 4, (8 * 16 + px) * 4 + 3));
    expect(at(2)[0]).toBeGreaterThan(at(2)[2]!); // left is red
    expect(at(13)[2]).toBeGreaterThan(at(13)[0]!); // right is blue
  });
});

describe('without a browser', () => {
  it("can't draw a placeholder, and says so quietly instead of throwing", () => {
    expect(blurhashDataUrl(HASH)).toBeUndefined();
    expect(blurhashCss(HASH)).toBeUndefined();
    expect(blurhashCss(undefined)).toBeUndefined();
    expect(blurhashCss('')).toBeUndefined();
  });
});
