import { IMAGE_MAX, prepareImage } from '../../lib/image';
import { getClient } from './client';
import { isStoragePath } from './mappers';

const BUCKET = 'portfolio';

export type ImageKind = keyof typeof IMAGE_MAX;

const FOLDER: Record<ImageKind, string> = {
  photo: 'photo',
  cover: 'covers',
  media: 'media',
  link: 'links',
};

/** An uploaded picture: where it is, and what is kept with it to show while it loads. */
export interface UploadedImage {
  path: string;
  blurhash: string;
  /** Width / height. */
  ratio: number;
}

/**
 * Shrinks a picture and uploads it into the fellow's own folder ("<user id>/covers/<random>.webp").
 * Returns the path to store in the database, with the picture's blurhash and shape. Each upload gets
 * a new name, so a replaced picture never shows up stale from a cache.
 */
export async function uploadImage(
  userId: string,
  kind: ImageKind,
  file: File,
): Promise<UploadedImage> {
  const { blob, blurhash, ratio } = await prepareImage(file, IMAGE_MAX[kind]);
  const path = `${userId}/${FOLDER[kind]}/${crypto.randomUUID()}.webp`;
  const { error } = await getClient()
    .storage.from(BUCKET)
    .upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
  if (error) throw new Error(error.message);
  return { path, blurhash, ratio };
}

/** Deletes uploaded pictures. Outside links are left alone. A failure is ignored: a leftover file is harmless. */
export async function removeImages(paths: (string | null | undefined)[]): Promise<void> {
  const mine = [...new Set(paths.filter((p): p is string => Boolean(p) && isStoragePath(p!)))];
  if (mine.length === 0) return;
  await getClient().storage.from(BUCKET).remove(mine);
}
