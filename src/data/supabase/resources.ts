import { cleanRatio } from '../../lib/blurhash';
import { cleanDraft, newKey, type ResourceDraft } from '../../lib/resourceForm';
import { getClient } from './client';
import type { Tables } from './database.types';
import { blurhashFor } from './mappers';
import { removeImages } from './storage';

/** What the "my resources" list shows. */
export type MyResourceSummary = Pick<
  Tables<'resources'>,
  | 'id'
  | 'slug'
  | 'title'
  | 'subject'
  | 'grade'
  | 'length'
  | 'status'
  | 'cover_path'
  | 'cover_blurhash'
  | 'summary'
  | 'tags'
  | 'updated_at'
  | 'published_at'
>;

/** Thrown when the fellow already has a resource at that address. */
export class ResourceSlugTakenError extends Error {
  constructor() {
    super('You already have a resource at that address. Please change it.');
    this.name = 'ResourceSlugTakenError';
  }
}

/** The fellow's own resources, newest changes first. Includes drafts. */
export async function listMyResources(userId: string): Promise<MyResourceSummary[]> {
  const { data, error } = await getClient()
    .from('resources')
    .select(
      'id, slug, title, subject, grade, length, status, cover_path, cover_blurhash, summary, tags, updated_at, published_at',
    )
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

type ResourceWithParts = Tables<'resources'> & {
  resource_files: Tables<'resource_files'>[];
  resource_media: Tables<'resource_media'>[];
};

function toDraft(row: ResourceWithParts): ResourceDraft {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status === 'published' ? 'published' : 'draft',
    title: row.title,
    subject: row.subject ?? '',
    grade: row.grade ?? '',
    length: row.length ?? '',
    tags: row.tags,
    coverPath: row.cover_path ?? '',
    coverBlurhash: blurhashFor(row.cover_path, row.cover_blurhash),
    coverConsent: row.cover_consent_confirmed,
    summary: row.summary ?? '',
    description: row.description ?? '',
    driveLink: row.drive_link ?? '',
    files: [...row.resource_files]
      .sort((a, b) => a.position - b.position)
      .map((f) => ({ key: f.id, name: f.file_name, link: f.file_link ?? '' })),
    media: [...row.resource_media]
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        key: m.id,
        url: m.url,
        caption: m.caption ?? '',
        hint: m.type_hint === 'image' || m.type_hint === 'video' ? m.type_hint : '',
        blurhash: blurhashFor(m.url, m.blurhash),
        ratio: cleanRatio(m.ratio),
        consent: m.consent_confirmed,
      })),
  };
}

/** One of the fellow's resources (draft or published) by its address, with files and media. */
export async function getMyResource(userId: string, slug: string): Promise<ResourceDraft | null> {
  const { data, error } = await getClient()
    .from('resources')
    .select('*, resource_files(*), resource_media(*)')
    .eq('user_id', userId)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toDraft(data as unknown as ResourceWithParts) : null;
}

/** Every uploaded picture a draft points to, so replaced ones can be cleaned up. */
const imagePaths = (d: ResourceDraft | undefined) =>
  d ? [d.coverPath, ...d.media.map((m) => m.url)] : [];

/**
 * Saves a resource with its files and media. `status` is only sent to publish; leaving it out keeps
 * the current one (a new resource starts as a draft). `previous` is the last saved version, used to
 * delete pictures that were replaced or removed.
 *
 * New and changed rows are written first and removed rows last, so a failure part-way never loses
 * anything the fellow still wants.
 */
export async function saveResource(
  userId: string,
  input: ResourceDraft,
  options: { status?: 'draft' | 'published'; previous?: ResourceDraft } = {},
): Promise<ResourceDraft> {
  const draft = cleanDraft(input);
  const client = getClient();
  const id = draft.id ?? newKey();

  const { error } = await client.from('resources').upsert({
    id,
    user_id: userId,
    slug: draft.slug,
    title: draft.title,
    subject: draft.subject || null,
    grade: draft.grade || null,
    length: draft.length || null,
    tags: draft.tags,
    cover_path: draft.coverPath || null,
    cover_blurhash: draft.coverBlurhash || null,
    cover_consent_confirmed: draft.coverPath ? draft.coverConsent : false,
    summary: draft.summary || null,
    description: draft.description || null,
    drive_link: draft.driveLink || null,
    ...(options.status ? { status: options.status } : {}),
  });
  if (error) {
    // 23505 = unique violation: this fellow already has a resource at that address.
    if (error.code === '23505') throw new ResourceSlugTakenError();
    throw new Error(error.message);
  }

  const fileIds = draft.files.map((f) => f.key);
  if (draft.files.length) {
    const { error: e } = await client.from('resource_files').upsert(
      draft.files.map((f, i) => ({
        id: f.key,
        resource_id: id,
        position: i + 1,
        file_name: f.name,
        file_link: f.link || null,
      })),
    );
    if (e) throw new Error(e.message);
  }
  await deleteMissing('resource_files', id, fileIds);

  const mediaIds = draft.media.map((m) => m.key);
  if (draft.media.length) {
    const { error: e } = await client.from('resource_media').upsert(
      draft.media.map((m, i) => ({
        id: m.key,
        resource_id: id,
        position: i + 1,
        url: m.url,
        caption: m.caption || null,
        type_hint: m.hint || null,
        blurhash: m.blurhash || null,
        ratio: m.ratio || null,
        consent_confirmed: m.consent,
      })),
    );
    if (e) throw new Error(e.message);
  }
  await deleteMissing('resource_media', id, mediaIds);

  const saved = await getMyResource(userId, draft.slug);
  if (!saved) throw new Error('The resource was saved but could not be loaded again.');

  const stillUsed = new Set(imagePaths(saved));
  await removeImages(imagePaths(options.previous).filter((p) => !stillUsed.has(p)));
  return saved;
}

/** Removes files or media rows of a resource that are no longer in the list. */
async function deleteMissing(
  table: 'resource_files' | 'resource_media',
  resourceId: string,
  keep: string[],
) {
  let query = getClient().from(table).delete().eq('resource_id', resourceId);
  if (keep.length) query = query.not('id', 'in', `(${keep.join(',')})`);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function setResourceStatus(id: string, status: 'draft' | 'published'): Promise<void> {
  const { error } = await getClient().from('resources').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Deletes a resource with its files and media, and its uploaded pictures. */
export async function deleteResource(draft: ResourceDraft): Promise<void> {
  if (!draft.id) return;
  const { error } = await getClient().from('resources').delete().eq('id', draft.id);
  if (error) throw new Error(error.message);
  await removeImages(imagePaths(draft));
}
