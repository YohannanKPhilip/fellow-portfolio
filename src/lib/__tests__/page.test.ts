import { describe, expect, it } from 'vitest';
import {
  PAGE_LIMITS,
  defaultPage,
  defaultResourcesSection,
  duplicateSection,
  insertSection,
  legacyPage,
  moveSection,
  pageFromHero,
  pageProblem,
  parsePage,
  removeSection,
  sectionResources,
  updateSection,
  type PageDoc,
  type ResourcesSection,
} from '../page';
import type { Resource } from '../../types';

const resource = (id: string, subject: string, tags: string[] = []): Resource => ({
  id,
  fellowId: 'asha',
  title: id,
  subject,
  grade: '',
  length: '',
  tags,
  coverUrl: '',
  summary: '',
  description: '',
  driveLink: '',
  files: [],
  media: [],
});

// Oldest first, like the data the pages get.
const ALL = [
  resource('a', 'Maths', ['NCERT']),
  resource('b', 'SEL'),
  resource('c', 'Maths', ['Maths Mela', 'ncert']),
  resource('d', 'EVS'),
];

const section = (over: Partial<ResourcesSection> = {}): ResourcesSection => ({
  id: 's',
  type: 'resources',
  ...over,
});

describe('default pages', () => {
  it('start with a hero and all resources, drawing what the site always drew', () => {
    const page = legacyPage({
      firstName: 'Asha',
      role: 'Teacher',
      highlight: 'Fellow',
      status: 'Hi',
      intro: 'x',
    });
    expect(page.sections.map((s) => s.type)).toEqual(['hero', 'resources']);
    const res = page.sections[1] as ResourcesSection;
    expect(res.title).toEqual([{ t: 'Resources ' }, { t: 'from my classroom.', c: 'muted' }]);
    expect(res.sort).toBe('oldest');
    expect(res.filter).toEqual({});
    expect(defaultPage('Asha').sections).toHaveLength(2);
  });
});

describe('parsePage', () => {
  it('accepts a valid page unchanged', () => {
    const page = pageFromHero([{ type: 'headline', runs: [{ t: 'Hi' }] }]);
    expect(parsePage(JSON.parse(JSON.stringify(page)))).toEqual(page);
  });

  it('drops unknown sections, repeated ids and a second hero', () => {
    const hero = { type: 'hero', blocks: [{ type: 'headline', runs: [{ t: 'Hi' }] }] };
    const parsed = parsePage({
      v: 1,
      sections: [
        { id: 'a', ...hero },
        { id: 'b', ...hero },
        { id: 'c', type: 'script', src: 'x' },
        { id: 'r', type: 'resources' },
        { id: 'r', type: 'resources' },
        { type: 'resources' },
        'junk',
      ],
    });
    expect(parsed?.sections.map((s) => s.id)).toEqual(['a', 'r']);
  });

  it('keeps only known fields and values in a resources section', () => {
    const parsed = parsePage({
      v: 1,
      sections: [
        {
          id: 'r',
          type: 'resources',
          title: [{ t: 'Maths', c: 'red' }, { t: '<b>x</b>', c: 'accent' }, { t: '' }],
          subtitle: 'Sub',
          filter: { subjects: ['Maths', 5, ' SEL '], tags: 'no', css: 'x' },
          showFilters: 'yes',
          sort: 'random',
          limit: 5000,
          html: '<script>',
        },
      ],
    });
    expect(parsed?.sections[0]).toEqual({
      id: 'r',
      type: 'resources',
      title: [{ t: 'Maths' }, { t: '<b>x</b>', c: 'accent' }],
      subtitle: 'Sub',
      filter: { subjects: ['Maths', 'SEL'] },
      limit: PAGE_LIMITS.limit,
    });
  });

  it('returns null when nothing usable is left', () => {
    expect(parsePage(null)).toBeNull();
    expect(parsePage({ v: 1, sections: [] })).toBeNull();
    expect(parsePage({ v: 1, sections: [{ id: 'x', type: 'hero', blocks: [] }] })).toBeNull();
  });
});

describe('sectionResources', () => {
  it('shows everything for an empty or missing filter, oldest first', () => {
    expect(sectionResources(section(), ALL).map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(sectionResources(section({ filter: {} }), ALL)).toHaveLength(4);
  });

  it('filters by subject, ignoring case and spaces', () => {
    expect(
      sectionResources(section({ filter: { subjects: [' maths '] } }), ALL).map((r) => r.id),
    ).toEqual(['a', 'c']);
    expect(
      sectionResources(section({ filter: { subjects: ['Maths', 'SEL'] } }), ALL).map((r) => r.id),
    ).toEqual(['a', 'b', 'c']);
  });

  it('filters by tag, and needs both when a subject and a tag are set', () => {
    expect(
      sectionResources(section({ filter: { tags: ['NCERT'] } }), ALL).map((r) => r.id),
    ).toEqual(['a', 'c']);
    expect(
      sectionResources(section({ filter: { subjects: ['Maths'], tags: ['maths mela'] } }), ALL).map(
        (r) => r.id,
      ),
    ).toEqual(['c']);
    expect(
      sectionResources(section({ filter: { subjects: ['SEL'], tags: ['NCERT'] } }), ALL),
    ).toEqual([]);
  });

  it('can show newest first and stop at a limit', () => {
    expect(sectionResources(section({ sort: 'newest' }), ALL).map((r) => r.id)).toEqual([
      'd',
      'c',
      'b',
      'a',
    ]);
    expect(sectionResources(section({ sort: 'newest', limit: 2 }), ALL).map((r) => r.id)).toEqual([
      'd',
      'c',
    ]);
    expect(sectionResources(section({ limit: null }), ALL)).toHaveLength(4);
  });

  it('shows the same resource in two sections', () => {
    const maths = sectionResources(section({ filter: { subjects: ['Maths'] } }), ALL);
    const ncert = sectionResources(section({ filter: { tags: ['NCERT'] } }), ALL);
    expect(maths.map((r) => r.id)).toEqual(ncert.map((r) => r.id));
  });

  it('does not change the list it was given', () => {
    const copy = [...ALL];
    sectionResources(section({ sort: 'newest' }), ALL);
    expect(ALL).toEqual(copy);
  });
});

describe('editing helpers', () => {
  const page: PageDoc = {
    v: 1,
    sections: [
      { id: 'h', type: 'hero', blocks: [{ type: 'headline', runs: [{ t: 'Hi' }] }] },
      defaultResourcesSection('r1'),
      defaultResourcesSection('r2'),
    ],
  };
  const ids = (p: PageDoc) => p.sections.map((s) => s.id);

  it('moves a section up or down, and stays put at the ends', () => {
    expect(ids(moveSection(page, 'r2', -1))).toEqual(['h', 'r2', 'r1']);
    expect(ids(moveSection(page, 'h', 1))).toEqual(['r1', 'h', 'r2']);
    expect(moveSection(page, 'h', -1)).toBe(page);
    expect(moveSection(page, 'r2', 1)).toBe(page);
    expect(moveSection(page, 'missing', 1)).toBe(page);
  });

  it('removes a section but always keeps one', () => {
    expect(ids(removeSection(page, 'r1'))).toEqual(['h', 'r2']);
    const single: PageDoc = { v: 1, sections: [defaultResourcesSection('only')] };
    expect(removeSection(single, 'only')).toBe(single);
  });

  it('inserts after a given section, or first', () => {
    const extra = defaultResourcesSection('x');
    expect(ids(insertSection(page, extra, 'h'))).toEqual(['h', 'x', 'r1', 'r2']);
    expect(ids(insertSection(page, extra))).toEqual(['x', 'h', 'r1', 'r2']);
  });

  it('refuses to go past the section limit', () => {
    let full = page;
    for (let i = 0; full.sections.length < PAGE_LIMITS.sections; i++) {
      full = insertSection(full, defaultResourcesSection(`f${i}`), 'h');
    }
    expect(insertSection(full, defaultResourcesSection('over'), 'h')).toBe(full);
  });

  it('duplicates a resources section with a new id, but not the hero', () => {
    const copy = duplicateSection(page, 'r1');
    expect(copy.sections).toHaveLength(4);
    expect(copy.sections[2]?.id).not.toBe('r1');
    expect(copy.sections[2]).toMatchObject({ type: 'resources', subtitle: expect.any(String) });
    expect(duplicateSection(page, 'h')).toBe(page);
  });

  it('copies are independent of the original', () => {
    const copy = duplicateSection(page, 'r1');
    (copy.sections[2] as ResourcesSection).filter = { subjects: ['Maths'] };
    expect((page.sections[1] as ResourcesSection).filter).toEqual({});
  });

  it('replaces one section by id', () => {
    const updated = updateSection(page, {
      ...(page.sections[1] as ResourcesSection),
      subtitle: 'New',
    });
    expect((updated.sections[1] as ResourcesSection).subtitle).toBe('New');
    expect((page.sections[1] as ResourcesSection).subtitle).not.toBe('New');
  });

  it('reports a page that is over a limit', () => {
    expect(pageProblem(page)).toBeUndefined();
    expect(pageProblem({ v: 1, sections: [] })).toBeTypeOf('string');
  });
});
