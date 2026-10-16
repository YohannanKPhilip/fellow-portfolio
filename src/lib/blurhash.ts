import { decode, isBlurhashValid } from 'blurhash';

/**
 * A blurhash is a ~30 character string that stands for a blurred version of a picture. It is made
 * once, when the picture is uploaded, stored next to the picture's path, and drawn behind the
 * <img> while the real picture loads, so a page never shows empty boxes that pop in.
 */

/** Longest side, in pixels, a picture is shrunk to before its blurhash is made. */
export const BLURHASH_SAMPLE = 32;

/** The size the blurhash is drawn at. It is stretched by the browser, so it can stay tiny. */
const DRAW_SIZE = 32;

/** True for a well-formed blurhash. The database enforces the same limits. */
export function isBlurhash(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 6 &&
    value.length <= 166 &&
    isBlurhashValid(value).result
  );
}

/** Detail of the blurhash: more across for a wide picture, more down for a tall one. */
export function componentsFor(width: number, height: number): { x: number; y: number } {
  const ratio = width / height;
  if (ratio > 1.25) return { x: 4, y: 3 };
  if (ratio < 0.8) return { x: 3, y: 4 };
  return { x: 4, y: 4 };
}

/** Keeps a stored width / height only when it is a sensible number. 0 means "not known". */
export function cleanRatio(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.1 && value <= 10
    ? Math.round(value * 1000) / 1000
    : 0;
}

const cache = new Map<string, string>();

/** The blurhash as a small PNG data URL, or undefined when it is not valid or can't be drawn. */
export function blurhashDataUrl(hash: string | undefined): string | undefined {
  if (!hash || !isBlurhash(hash) || typeof document === 'undefined') return undefined;
  const known = cache.get(hash);
  if (known) return known;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = DRAW_SIZE;
    canvas.height = DRAW_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const image = ctx.createImageData(DRAW_SIZE, DRAW_SIZE);
    image.data.set(decode(hash, DRAW_SIZE, DRAW_SIZE));
    ctx.putImageData(image, 0, 0);
    const url = canvas.toDataURL('image/png');
    cache.set(hash, url);
    return url;
  } catch {
    return undefined;
  }
}

/** Style that paints the blurhash as an element's background (stretched to fill it). */
export function blurhashStyle(
  hash: string | undefined,
): { backgroundImage: string; backgroundSize: string } | undefined {
  const url = blurhashDataUrl(hash);
  return url ? { backgroundImage: `url("${url}")`, backgroundSize: '100% 100%' } : undefined;
}

/** The same as blurhashStyle, as CSS text for an element made outside React. */
export function blurhashCss(hash: string | undefined): string | undefined {
  const style = blurhashStyle(hash);
  return style
    ? `background-image:${style.backgroundImage};background-size:${style.backgroundSize}`
    : undefined;
}
