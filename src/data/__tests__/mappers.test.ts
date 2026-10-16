import { describe, expect, it } from 'vitest';
import { buildDataset, parseTags } from '../mappers';

const fellow = (id: string, status = 'Published') => ({
  fellow_id: id,
  status,
  name: `${id} Name`,
});
const resource = (id: string, fellowId: string, status = 'Published', title = 'Title') => ({
  resource_id: id,
  fellow_id: fellowId,
  status,
  title,
  subject: 'EVS',
});

describe('buildDataset', () => {
  it('keeps only published fellows and resources', () => {
    const { dataset } = buildDataset(
      [fellow('asha'), fellow('ravi', 'Draft')],
      [resource('asha-one', 'asha'), resource('asha-two', 'asha', 'Draft')],
      [],
    );
    expect(dataset.fellows.map((f) => f.id)).toEqual(['asha']);
    expect(dataset.resources.map((r) => r.id)).toEqual(['asha-one']);
  });

  it('treats status case-insensitively', () => {
    const { dataset } = buildDataset([fellow('asha', ' published ')], [], []);
    expect(dataset.fellows).toHaveLength(1);
  });

  it('skips resources whose fellow is missing or unpublished, with a warning', () => {
    const { dataset, warnings } = buildDataset(
      [fellow('ravi', 'Draft')],
      [resource('ravi-one', 'ravi'), resource('ghost-one', 'ghost')],
      [],
    );
    expect(dataset.resources).toHaveLength(0);
    expect(warnings).toHaveLength(2);
  });

  it('rejects invalid and duplicate IDs', () => {
    const { dataset, warnings } = buildDataset(
      [fellow('bad/id!'), fellow('asha'), fellow('asha')],
      [resource('asha-one', 'asha'), resource('asha-one', 'asha')],
      [],
    );
    expect(dataset.fellows.map((f) => f.id)).toEqual(['asha']);
    expect(dataset.resources).toHaveLength(1);
    expect(warnings).toHaveLength(3);
  });

  it('forgives capitals and spaces in IDs', () => {
    const { dataset } = buildDataset(
      [fellow('Asha')],
      [resource('Asha-String Pen', 'ASHA')],
      [{ resource_id: 'asha-string-pen', order: '1', file_name: 'Lesson Plan', file_link: '' }],
    );
    expect(dataset.resources.map((r) => r.id)).toEqual(['asha-string-pen']);
    expect(dataset.resources[0]?.files).toHaveLength(1);
  });

  it('attaches files to their resource, sorted by order', () => {
    const { dataset } = buildDataset(
      [fellow('asha')],
      [resource('asha-one', 'asha')],
      [
        { resource_id: 'asha-one', order: '2', file_name: 'Worksheet', file_link: '' },
        { resource_id: 'asha-one', order: '1', file_name: 'Lesson plan', file_link: '' },
        { resource_id: 'asha-one', order: '', file_name: 'Answer key', file_link: '' },
      ],
    );
    expect(dataset.resources[0]?.files.map((f) => f.name)).toEqual([
      'Lesson plan',
      'Worksheet',
      'Answer key',
    ]);
  });

  it('defaults first name and subject', () => {
    const { dataset } = buildDataset(
      [{ fellow_id: 'asha', status: 'Published', name: 'Asha Rao' }],
      [{ resource_id: 'asha-one', fellow_id: 'asha', status: 'Published', title: 'T' }],
      [],
    );
    expect(dataset.fellows[0]?.firstName).toBe('Asha');
    expect(dataset.resources[0]?.subject).toBe('Other');
  });

  it('reads tags, description, cover and media', () => {
    const { dataset } = buildDataset(
      [fellow('asha')],
      [
        {
          ...resource('asha-one', 'asha'),
          tags: 'NCERT, ncert, Maths Mela ,Ch 2',
          cover_url: 'https://example.com/c.jpg',
          about: 'Old column name',
        },
      ],
      [],
      [
        { resource_id: 'Asha-One', order: '2', url: 'https://youtu.be/dQw4w9WgXcQ', caption: 'B' },
        { resource_id: 'asha-one', order: '1', url: 'https://example.com/a.jpg', type: 'Image' },
        { resource_id: 'asha-one', order: '3', url: 'javascript:alert(1)', caption: 'bad' },
        { resource_id: 'ghost', order: '1', url: 'https://example.com/z.jpg' },
      ],
    );
    const r = dataset.resources[0];
    expect(r?.tags).toEqual(['NCERT', 'Maths Mela', 'Ch 2']);
    expect(r?.coverUrl).toBe('https://example.com/c.jpg');
    expect(r?.description).toBe('Old column name');
    expect(r?.media.map((m) => m.caption)).toEqual(['', 'B']);
    expect(r?.media[0]?.hint).toBe('image');
  });

  it('gives resources without tags, cover or media empty values', () => {
    const { dataset } = buildDataset([fellow('asha')], [resource('asha-one', 'asha')], []);
    const r = dataset.resources[0];
    expect([r?.tags, r?.coverUrl, r?.media]).toEqual([[], '', []]);
  });
});

describe('parseTags', () => {
  it('splits, trims, dedupes and caps', () => {
    expect(parseTags(' a , b;c\nA, ,d')).toEqual(['a', 'b', 'c', 'd']);
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags('1,2,3,4,5,6,7,8,9,10')).toHaveLength(8);
  });
});
