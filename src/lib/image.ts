import { encode } from 'blurhash';
import { BLURHASH_SAMPLE, cleanRatio, componentsFor } from './blurhash';

/** Longest side, in pixels, for each kind of upload. Keeps pages fast on phones and the free 1 GB of storage going far. */
export const IMAGE_MAX = { photo: 600, cover: 1600, media: 1600, link: 800 } as const;

/** Source files larger than this are refused before decoding (a phone photo is well under it). */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/** Scales a size down so its longest side is at most `max`. Never scales up. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** A picture ready to upload, with what is stored next to it so it can be shown while loading. */
export interface PreparedImage {
  blob: Blob;
  /** Blurred stand-in for the picture. */
  blurhash: string;
  /** Width / height of the shrunk picture. */
  ratio: number;
}

/** Makes the blurhash of what is on a canvas, by drawing it small first. */
function blurhashOfCanvas(source: HTMLCanvasElement): string {
  const { width, height } = fitWithin(source.width, source.height, BLURHASH_SAMPLE);
  const small = document.createElement('canvas');
  small.width = width;
  small.height = height;
  const ctx = small.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the image.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  const { x, y } = componentsFor(width, height);
  return encode(ctx.getImageData(0, 0, width, height).data, width, height, x, y);
}

/** Shrinks a picture in the browser, saves it as WebP and makes its blurhash. */
export async function prepareImage(
  file: File,
  max: number,
  quality = 0.82,
): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > MAX_SOURCE_BYTES)
    throw new Error('That image is too large. Please choose one under 25 MB.');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That image couldn't be read. Try a JPEG, PNG or WebP file.");
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the image.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  );
  if (!blob) throw new Error('Could not prepare the image.');
  return { blob, blurhash: blurhashOfCanvas(canvas), ratio: cleanRatio(width / height) };
}
