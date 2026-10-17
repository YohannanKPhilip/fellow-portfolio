import { describe, expect, it } from 'vitest';
import { imageRef, toDataset, type FellowRow } from '../supabase/mappers';

const URL = 'https://proj.supabase.co';
const USER = '11111111-1111-4111-8111-111111111111';
const HASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

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
    cover_blurhash: null,
    cover_consent_confirmed: false,
    summary: null,
    description: null,
    drive_link: 'https://drive.google.com/x',
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
  page: {
    v: 1,
    sections: [
      {
        id: 'hero',
        type: 'hero',
        blocks: [
          { type: 'headline', runs: [{ t: "I'm a", c: 'muted' }, { t: ' Maths teacher' }] },
          { type: 'text', runs: [{ t: 'Hello there.' }] },
        ],
      },
      {
        id: 'r',
        type: 'resources',
        title: [{ t: 'Maths' }],
        filter: { subjects: ['Maths'] },
        sort: 'newest',
      },
    ],
  },
  theme: { accent: 'blue', background: 'warm' },
  school: null,
  city: null,
  cohort: null,
  photo_path: null,
  photo_blurhash: null,
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
    const { fellows, resources } = toDataset(
      fellow([resource({ slug: 'asha-one', drive_link: '' })]),
      URL,
    );
    expect(fellows).toEqual([
      expect.objectContaining({
        id: 'asha',
        firstName: 'Asha',
        page: {
          v: 1,
          sections: [
            {
              id: 'hero',
              type: 'hero',
              blocks: [
                { type: 'headline', runs: [{ t: "I'm a", c: 'muted' }, { t: ' Maths teacher' }] },
                { type: 'text', runs: [{ t: 'Hello there.' }] },
              ],
            },
            {
              id: 'r',
              type: 'resources',
              title: [{ t: 'Maths' }],
              filter: { subjects: ['Maths'] },
              sort: 'newest',
            },
          ],
        },
        theme: { accent: 'blue', background: 'warm' },
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

  it('shows the default page (a greeting and all resources) when the stored page is missing or damaged', () => {
    for (const page of [
      null,
      { v: 1, sections: 'nope' },
      { v: 1, sections: [{ id: 'x', type: 'script' }] },
    ]) {
      const row = fellow([]);
      row.page = page;
      const { fellows } = toDataset(row, URL);
      const sections = fellows[0]?.page.sections ?? [];
      expect(sections.map((s) => s.type)).toEqual(['hero', 'resources']);
      expect(JSON.stringify(sections[0])).toContain('Asha');
    }
  });

  it('keeps only known theme choices', () => {
    const row = fellow([]);
    row.theme = { accent: '#ff0000', background: 'dark', font: 'comic', css: 'body{}' };
    expect(toDataset(row, URL).fellows[0]?.theme).toEqual({ background: 'dark' });
  });

  it('falls back to "Other" when a resource has no subject', () => {
    const { resources } = toDataset(fellow([resource({ slug: 'a-one', subject: '' })]), URL);
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
              blurhash: null,
              ratio: null,
              consent_confirmed: true,
            },
            {
              id: 'm1',
              resource_id: 'x',
              position: 1,
              url: 'https://youtu.be/abc',
              caption: null,
              type_hint: null,
              blurhash: null,
              ratio: null,
              consent_confirmed: true,
            },
            {
              id: 'm3',
              resource_id: 'x',
              position: 3,
              url: 'javascript:alert(1)',
              caption: null,
              type_hint: null,
              blurhash: null,
              ratio: null,
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

  it('passes the blurhash of an uploaded cover, photo and classroom picture through', () => {
    const media = {
      id: 'm1',
      resource_id: 'x',
      position: 1,
      url: `${USER}/media/x.webp`,
      caption: null,
      type_hint: 'image',
      blurhash: HASH,
      ratio: 1.5,
      consent_confirmed: true,
    };
    const row = fellow([
      resource({
        slug: 'a-one',
        cover_path: `${USER}/covers/c.webp`,
        cover_blurhash: HASH,
        resource_media: [media],
      }),
    ]);
    row.photo_path = `${USER}/photo.webp`;
    row.photo_blurhash = HASH;
    const { fellows, resources } = toDataset(row, URL);
    expect(fellows[0]?.photoBlurhash).toBe(HASH);
    expect(resources[0]?.coverBlurhash).toBe(HASH);
    expect(resources[0]?.media[0]).toMatchObject({ blurhash: HASH, ratio: 1.5 });
  });

  it('ignores a blurhash that is damaged or that sits next to an outside link', () => {
    const row = fellow([
      resource({
        slug: 'a-one',
        cover_path: 'https://x.test/c.jpg',
        cover_blurhash: HASH,
        resource_media: [
          {
            id: 'm1',
            resource_id: 'x',
            position: 1,
            url: `${USER}/media/x.webp`,
            caption: null,
            type_hint: 'image',
            blurhash: 'not a hash',
            ratio: 99,
            consent_confirmed: true,
          },
        ],
      }),
    ]);
    row.photo_path = `${USER}/photo.webp`;
    row.photo_blurhash = 'nope';
    const { fellows, resources } = toDataset(row, URL);
    expect(fellows[0]?.photoBlurhash).toBe('');
    expect(resources[0]?.coverBlurhash).toBe('');
    expect(resources[0]?.media[0]).toMatchObject({ blurhash: '', ratio: 0 });
  });
});
