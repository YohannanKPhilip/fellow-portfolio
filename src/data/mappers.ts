import { safeUrl } from '../lib/links';
import type { Dataset, Fellow, MediaItem, Resource, ResourceFile } from '../types';
import { ID_PATTERN, PUBLISHED } from './schema';

type Row = Record<string, string>;

export interface BuildResult {
  dataset: Dataset;
  warnings: string[];
}

/** Makes IDs forgiving: "Yohannan-String Pen" becomes "yohannan-string-pen". */
export const normalizeId = (value: string | undefined) =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');

const MAX_TAGS = 8;

/** "NCERT, Maths Mela, ch 2" becomes a clean list. Duplicates ignore case; the first spelling wins. */
export function parseTags(value: string | undefined): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of (value ?? '').split(/[,;\n]/)) {
    const tag = part.replace(/\s+/g, ' ').trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags.slice(0, MAX_TAGS);
}

const isPublished = (row: Row) => (row.status ?? '').trim().toLowerCase() === PUBLISHED;

function toFellow(row: Row): Fellow {
  const name = row.name ?? '';
  return {
    id: normalizeId(row.fellow_id),
    name,
    firstName: row.first_name || name.split(' ')[0] || '',
    headlineRole: row.headline_role ?? '',
    headlineHighlight: row.headline_highlight ?? '',
    statusText: row.status_text ?? '',
    intro: row.intro ?? '',
    school: row.school ?? '',
    city: row.city ?? '',
    cohort: row.cohort ?? '',
    photoUrl: row.photo_url ?? '',
  };
}

function toResource(row: Row, files: ResourceFile[], media: MediaItem[]): Resource {
  return {
    id: normalizeId(row.resource_id),
    fellowId: normalizeId(row.fellow_id),
    title: row.title ?? '',
    subject: row.subject || 'Other',
    grade: row.grade ?? '',
    length: row.length ?? '',
    tags: parseTags(row.tags),
    coverUrl: row.cover_url ?? '',
    summary: row.summary ?? '',
    // "about" is the old column name; keep reading it so older sheets still work.
    description: row.description || row.about || '',
    driveLink: row.drive_link ?? '',
    files,
    media,
  };
}

/**
 * Validates raw sheet rows and joins them into a dataset.
 * Only Published fellows and resources are kept. Bad rows are skipped with a
 * warning instead of breaking the whole site.
 */
export function buildDataset(
  fellowRows: Row[],
  resourceRows: Row[],
  fileRows: Row[],
  mediaRows: Row[] = [],
): BuildResult {
  const warnings: string[] = [];

  const fellows: Fellow[] = [];
  const fellowIds = new Set<string>();
  for (const row of fellowRows) {
    const id = normalizeId(row.fellow_id);
    if (!isPublished(row)) continue;
    if (!ID_PATTERN.test(id)) {
      warnings.push(`fellows: skipped row with invalid fellow_id "${id}"`);
      continue;
    }
    if (fellowIds.has(id)) {
      warnings.push(`fellows: duplicate fellow_id "${id}", kept the first`);
      continue;
    }
    fellowIds.add(id);
    fellows.push(toFellow(row));
  }

  const filesByResource = new Map<string, ResourceFile[]>();
  for (const row of fileRows) {
    const rid = normalizeId(row.resource_id);
    const name = row.file_name ?? '';
    if (!rid || !name) continue;
    const order = Number.parseFloat(row.order ?? '');
    const list = filesByResource.get(rid) ?? [];
    list.push({ name, link: row.file_link ?? '', order: Number.isFinite(order) ? order : 999 });
    filesByResource.set(rid, list);
  }
  for (const list of filesByResource.values()) list.sort((a, b) => a.order - b.order);

  const mediaByResource = new Map<string, MediaItem[]>();
  for (const row of mediaRows) {
    const rid = normalizeId(row.resource_id);
    const url = safeUrl(row.url);
    if (!rid || !url) continue;
    const order = Number.parseFloat(row.order ?? '');
    const list = mediaByResource.get(rid) ?? [];
    list.push({
      url,
      caption: row.caption ?? '',
      hint: (row.type ?? '').trim().toLowerCase(),
      order: Number.isFinite(order) ? order : 999,
    });
    mediaByResource.set(rid, list);
  }
  for (const list of mediaByResource.values()) list.sort((a, b) => a.order - b.order);

  const resources: Resource[] = [];
  const resourceIds = new Set<string>();
  for (const row of resourceRows) {
    const id = normalizeId(row.resource_id);
    if (!isPublished(row)) continue;
    if (!ID_PATTERN.test(id)) {
      warnings.push(`resources: skipped row with invalid resource_id "${id}"`);
      continue;
    }
    if (resourceIds.has(id)) {
      warnings.push(`resources: duplicate resource_id "${id}", kept the first`);
      continue;
    }
    if (!fellowIds.has(normalizeId(row.fellow_id))) {
      warnings.push(
        `resources: "${id}" belongs to unknown or unpublished fellow "${row.fellow_id}"`,
      );
      continue;
    }
    if (!row.title) {
      warnings.push(`resources: "${id}" has no title, skipped`);
      continue;
    }
    resourceIds.add(id);
    resources.push(toResource(row, filesByResource.get(id) ?? [], mediaByResource.get(id) ?? []));
  }

  return { dataset: { fellows, resources }, warnings };
}
