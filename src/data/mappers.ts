import type { Dataset, Fellow, Resource, ResourceFile } from '../types';
import { ID_PATTERN, PUBLISHED } from './schema';

type Row = Record<string, string>;

export interface BuildResult {
  dataset: Dataset;
  warnings: string[];
}

const isPublished = (row: Row) => (row.status ?? '').trim().toLowerCase() === PUBLISHED;

function toFellow(row: Row): Fellow {
  const name = row.name ?? '';
  return {
    id: row.fellow_id ?? '',
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

function toResource(row: Row, files: ResourceFile[]): Resource {
  return {
    id: row.resource_id ?? '',
    fellowId: row.fellow_id ?? '',
    title: row.title ?? '',
    subject: row.subject || 'Other',
    grade: row.grade ?? '',
    board: row.board ?? '',
    chapter: row.chapter ?? '',
    length: row.length ?? '',
    summary: row.summary ?? '',
    about: row.about ?? '',
    inMyClassroom: row.in_my_classroom ?? '',
    whatIdChange: row.what_id_change ?? '',
    driveLink: row.drive_link ?? '',
    files,
  };
}

/**
 * Validates raw sheet rows and joins them into a dataset.
 * Only Published fellows and resources are kept. Bad rows are skipped with a
 * warning instead of breaking the whole site.
 */
export function buildDataset(fellowRows: Row[], resourceRows: Row[], fileRows: Row[]): BuildResult {
  const warnings: string[] = [];

  const fellows: Fellow[] = [];
  const fellowIds = new Set<string>();
  for (const row of fellowRows) {
    const id = row.fellow_id ?? '';
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
    const rid = row.resource_id ?? '';
    const name = row.file_name ?? '';
    if (!rid || !name) continue;
    const order = Number.parseFloat(row.order ?? '');
    const list = filesByResource.get(rid) ?? [];
    list.push({ name, link: row.file_link ?? '', order: Number.isFinite(order) ? order : 999 });
    filesByResource.set(rid, list);
  }
  for (const list of filesByResource.values()) list.sort((a, b) => a.order - b.order);

  const resources: Resource[] = [];
  const resourceIds = new Set<string>();
  for (const row of resourceRows) {
    const id = row.resource_id ?? '';
    if (!isPublished(row)) continue;
    if (!ID_PATTERN.test(id)) {
      warnings.push(`resources: skipped row with invalid resource_id "${id}"`);
      continue;
    }
    if (resourceIds.has(id)) {
      warnings.push(`resources: duplicate resource_id "${id}", kept the first`);
      continue;
    }
    if (!fellowIds.has(row.fellow_id ?? '')) {
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
    resources.push(toResource(row, filesByResource.get(id) ?? []));
  }

  return { dataset: { fellows, resources }, warnings };
}
