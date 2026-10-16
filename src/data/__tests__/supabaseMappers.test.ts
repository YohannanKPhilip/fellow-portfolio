import { describe, expect, it } from 'vitest';
import { imageRef, toDataset, type FellowRow } from '../supabase/mappers';

const URL = 'https://proj.supabase.co';
const USER = '11111111-1111-4111-8111-111111111111';

type ResourceRow = FellowRow['resources'][number];

function resource(over: Partial<ResourceRow> & { slug: string }): ResourceRow {
  return {
    id: `id-${over.slug}`,
    user_id: USER,
    status: 'published',
    title: over.slug,
    subject: 'Maths',
    grade: '5',
    length: '45 min',
    tags: [],
    cover_path: null,
    cover_consent_confirmed: false,
    summary: null,
    description: null,
    drive_link: null,
    published_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    resource_files: [],
    resource_media: [],
    ...over,
  };
}

const fellow = (resources: ResourceRow[]): FellowRow => ({
  user_id: USER,
  slug: 'asha',
  status: 'published',
  name: 'Asha Rao',
  first_name: 'Asha',
  headline_role: 'Maths teacher',
  headline_highlight: null,
  status_text: null,
  intro: null,
  school: null,
  city: null,
  cohort: null,
  photo_path: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  resources,
});

describe('imageRef', () => {
  it('passes outside links through and builds URLs for Storage paths', () => {
    expect(imageRef('https://drive.google.com/file/d/abc', URL)).toBe(
      'https://drive.google.com/file/d/abc',
    );
    expect(imageRef(`${USER}/photo.webp`, URL)).toBe(
      `${URL}/storage/v1/object/public/portfolio/${USER}/photo.webp`,
    );
    expect(imageRef(null, URL)).toBe('');
  });
});

describe('toDataset', () => {
  it('maps a row to the types the pages use, with empty strings for missing text', () => {
    const { fellows, resources } = toDataset(fellow([resource({ slug: 'asha-one' })]), URL);
    expect(fellows).toEqual([
      expect.objectContaining({
        id: 'asha',
        firstName: 'Asha',
        headlineRole: 'Maths teacher',
        headlineHighlight: '',
        photoUrl: '',
      }),
    ]);
    expect(resources[0]).toMatchObject({
      id: 'asha-one',
      fellowId: 'asha',
      summary: '',
      description: '',
      driveLink: '',
      coverUrl: '',
    });
  });

  it('falls back to "Other" when a resource has no subject', () => {
    const { resources } = toDataset(fellow([resource({ slug: 'a-one', subject: null })]), URL);
    expect(resources[0]?.subject).toBe('Other');
  });

  it('lists resources oldest first, like rows in the sheet', () => {
    const { resources } = toDataset(
      fellow([
        resource({ slug: 'third', published_at: '2026-03-01T00:00:00Z' }),
        resource({ slug: 'first', published_at: '2026-01-01T00:00:00Z' }),
        resource({ slug: 'second', published_at: '2026-02-01T00:00:00Z' }),
      ]),
      URL,
    );
    expect(resources.map((r) => r.id)).toEqual(['first', 'second', 'third']);
  });

  it('orders files and media by position and drops unsafe media links', () => {
    const { resources } = toDataset(
      fellow([
        resource({
          slug: 'a-one',
          resource_files: [
            { id: '2', resource_id: 'x', position: 2, file_name: 'Second', file_link: null },
            {
              id: '1',
              resource_id: 'x',
              position: 1,
              file_name: 'First',
              file_link: 'https://d.test/1',
            },
          ],
          resource_media: [
            {
              id: 'm2',
              resource_id: 'x',
              position: 2,
              url: `${USER}/media/x.webp`,
              caption: 'Photo',
              type_hint: 'image',
              consent_confirmed: true,
            },
            {
              id: 'm1',
              resource_id: 'x',
              position: 1,
              url: 'https://youtu.be/abc',
              caption: null,
              type_hint: null,
              consent_confirmed: true,
            },
            {
              id: 'm3',
              resource_id: 'x',
              position: 3,
              url: 'javascript:alert(1)',
              caption: null,
              type_hint: null,
              consent_confirmed: true,
            },
          ],
        }),
      ]),
      URL,
    );
    const r = resources[0]!;
    expect(r.files.map((f) => f.name)).toEqual(['First', 'Second']);
    expect(r.files[1]?.link).toBe('');
    expect(r.media.map((m) => m.url)).toEqual([
      'https://youtu.be/abc',
      `${URL}/storage/v1/object/public/portfolio/${USER}/media/x.webp`,
    ]);
    expect(r.media[1]).toMatchObject({ caption: 'Photo', hint: 'image' });
  });

  it('uses the Storage path for a cover and photo uploaded through the site', () => {
    const row = fellow([resource({ slug: 'a-one', cover_path: `${USER}/covers/c.webp` })]);
    row.photo_path = `${USER}/photo.webp`;
    const { fellows, resources } = toDataset(row, URL);
    expect(resources[0]?.coverUrl).toBe(
      `${URL}/storage/v1/object/public/portfolio/${USER}/covers/c.webp`,
    );
    expect(fellows[0]?.photoUrl).toBe(
      `${URL}/storage/v1/object/public/portfolio/${USER}/photo.webp`,
    );
  });
});
