import { describe, expect, it } from 'vitest';
import type { EditorNode } from '../heroEditor';
import {
  PAGE_LIMITS,
  collectValues,
  defaultResourcesSection,
  describeFilter,
  setLimit,
  toggleFilterValue,
  type ResourcesSection,
} from '../page';
import { editorToTitle, titleToEditor } from '../titleEditor';

describe('section heading conversion', () => {
  it('round-trips a heading with colors', () => {
    const runs = [
      { t: 'Maths ', c: 'blue' as const },
      { t: 'class' },
      { t: '!', c: 'muted' as const },
    ];
    expect(editorToTitle(titleToEditor(runs))).toEqual(runs);
  });

  it('joins neighbouring text of the same color and ignores anything that is not text', () => {
    const doc: EditorNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Mat' },
            { type: 'text', text: 'hs ' },
            { type: 'photo', attrs: {} },
            { type: 'text', text: 'SEL', marks: [{ type: 'heroColor', attrs: { c: 'red' } }] },
          ],
        },
      ],
    };
    // "red" is not a palette color, so that text is plain and joins the text before it.
    expect(editorToTitle(doc)).toEqual([{ t: 'Maths SEL' }]);
  });

  it('cuts very long text into pieces that fit the limit', () => {
    const doc = titleToEditor([{ t: 'x'.repeat(PAGE_LIMITS.titleRun * 2 + 5) }]);
    const runs = editorToTitle(doc);
    expect(runs).toHaveLength(3);
    expect(runs.every((r) => r.t.length <= PAGE_LIMITS.titleRun)).toBe(true);
  });

  it('gives an empty heading when there is no text', () => {
    expect(editorToTitle(titleToEditor([]))).toEqual([]);
  });
});

describe('collectValues', () => {
  it('lists distinct values once, ignoring case and blanks, sorted', () => {
    expect(collectValues(['Maths', 'maths', ' SEL ', '', null, undefined, 'EVS'])).toEqual([
      'EVS',
      'Maths',
      'SEL',
    ]);
  });
});

describe('toggleFilterValue', () => {
  const base: ResourcesSection = defaultResourcesSection('s');

  it('adds and removes a subject, ignoring case', () => {
    const on = toggleFilterValue(base, 'subjects', 'Maths');
    expect(on.filter).toEqual({ subjects: ['Maths'] });
    expect(toggleFilterValue(on, 'subjects', 'maths').filter).toEqual({ subjects: [] });
  });

  it('keeps subjects and tags separate and leaves the original untouched', () => {
    const withTag = toggleFilterValue(toggleFilterValue(base, 'subjects', 'SEL'), 'tags', 'NCERT');
    expect(withTag.filter).toEqual({ subjects: ['SEL'], tags: ['NCERT'] });
    expect(base.filter).toEqual({});
  });

  it('stops at the list limit', () => {
    let s = base;
    for (let i = 0; i < PAGE_LIMITS.listItems + 3; i++) s = toggleFilterValue(s, 'tags', 'tag' + i);
    expect(s.filter?.tags).toHaveLength(PAGE_LIMITS.listItems);
  });
});

describe('limit and description', () => {
  it('sets and clears the limit', () => {
    const base = defaultResourcesSection('s');
    expect(setLimit(base, 6).limit).toBe(6);
    expect(setLimit(setLimit(base, 6), null).limit).toBeNull();
  });

  it('describes what a section shows', () => {
    const base = defaultResourcesSection('s');
    expect(describeFilter(base)).toBe('All resources');
    const picked = toggleFilterValue(toggleFilterValue(base, 'subjects', 'Maths'), 'tags', 'NCERT');
    expect(describeFilter(picked)).toBe('Maths, #NCERT');
  });
});
