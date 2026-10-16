import { describe, expect, it } from 'vitest';
import { buildDataset } from '../mappers';

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
      [fellow('Bad ID'), fellow('asha'), fellow('asha')],
      [resource('asha-one', 'asha'), resource('asha-one', 'asha')],
      [],
    );
    expect(dataset.fellows.map((f) => f.id)).toEqual(['asha']);
    expect(dataset.resources).toHaveLength(1);
    expect(warnings).toHaveLength(3);
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
});
