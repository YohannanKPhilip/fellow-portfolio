import { config } from '../../config';
import type { Resource } from '../../types';
import { blurhashFor, imageRef } from './mappers';
import type { MyResourceSummary } from './resources';

/** One of the fellow's own resources in the shape the public cards use. */
export function summaryToResource(r: MyResourceSummary, fellowSlug: string): Resource {
  return {
    id: r.slug,
    fellowId: fellowSlug,
    title: r.title,
    subject: r.subject || 'Other',
    grade: r.grade ?? '',
    length: r.length ?? '',
    tags: r.tags,
    coverUrl: r.cover_path ? imageRef(r.cover_path, config.supabaseUrl) : '',
    coverBlurhash: blurhashFor(r.cover_path, r.cover_blurhash),
    summary: r.summary ?? '',
    description: '',
    driveLink: '',
    files: [],
    media: [],
  };
}
