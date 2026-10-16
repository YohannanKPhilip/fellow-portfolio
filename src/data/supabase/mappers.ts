import { safeUrl } from '../../lib/links';
import type { Dataset, Fellow, MediaItem, Resource, ResourceFile } from '../../types';
import type { Tables } from './database.types';

/** One fellow with their resources, files and media, as the query returns them. */
export type FellowRow = Tables<'fellows'> & {
  resources: (Tables<'resources'> & {
    resource_files: Tables<'resource_files'>[];
    resource_media: Tables<'resource_media'>[];
  })[];
};

const BUCKET = 'portfolio';
/** Same shape the database accepts: "<user id>/folder/file.webp". */
const STORAGE_PATH = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/[A-Za-z0-9._/-]+$/;

/**
 * Image fields hold either an outside https link or a path in our Storage
 * bucket ("<user id>/covers/x.webp"). Returns a URL the browser can load.
 */
export function imageRef(ref: string | null, supabaseUrl: string): string {
  if (!ref) return '';
  // Anything that isn't "<user id>/..." is returned as is, and safeUrl rejects it later.
  if (!STORAGE_PATH.test(ref)) return ref;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${ref}`;
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/** Oldest first, like rows in the sheet; a resource with no publish time sorts last. */
function byPublished(a: FellowRow['resources'][number], b: FellowRow['resources'][number]) {
  const ta = a.published_at ?? '9999';
  const tb = b.published_at ?? '9999';
  return ta === tb ? a.created_at.localeCompare(b.created_at) : ta.localeCompare(tb);
}

/** Turns one fellow row (with embedded resources) into the dataset the pages use. */
export function toDataset(row: FellowRow, supabaseUrl: string): Dataset {
  const fellow: Fellow = {
    id: row.slug,
    name: row.name,
    firstName: row.first_name,
    headlineRole: row.headline_role ?? '',
    headlineHighlight: row.headline_highlight ?? '',
    statusText: row.status_text ?? '',
    intro: row.intro ?? '',
    school: row.school ?? '',
    city: row.city ?? '',
    cohort: row.cohort ?? '',
    photoUrl: imageRef(row.photo_path, supabaseUrl),
  };

  const resources: Resource[] = [...row.resources].sort(byPublished).map((r) => {
    const files: ResourceFile[] = [...r.resource_files].sort(byPosition).map((f) => ({
      name: f.file_name,
      link: f.file_link ?? '',
      order: f.position,
    }));
    const media: MediaItem[] = [];
    for (const m of [...r.resource_media].sort(byPosition)) {
      const url = safeUrl(imageRef(m.url, supabaseUrl));
      if (url)
        media.push({ url, caption: m.caption ?? '', hint: m.type_hint ?? '', order: m.position });
    }
    return {
      id: r.slug,
      fellowId: row.slug,
      title: r.title,
      subject: r.subject || 'Other',
      grade: r.grade ?? '',
      length: r.length ?? '',
      tags: r.tags,
      coverUrl: imageRef(r.cover_path, supabaseUrl),
      summary: r.summary ?? '',
      description: r.description ?? '',
      driveLink: r.drive_link ?? '',
      files,
      media,
    };
  });

  return { fellows: [fellow], resources };
}
