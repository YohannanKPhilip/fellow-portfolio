import { describe, expect, it } from 'vitest';
import {
  HERO_LIMITS,
  STARTERS,
  defaultHero,
  heroChars,
  heroProblem,
  legacyHero,
  parseHero,
  type HeroDoc,
} from '../hero';
import { editorToHero, heroToEditor, type EditorNode } from '../heroEditor';
import {
  accentColor,
  BACKGROUNDS,
  effectiveMode,
  INK_ON_ACCENT,
  inkOnAccent,
  parseTheme,
} from '../theme';

const PHOTO = { src: '', initial: 'Y' };

describe('legacyHero', () => {
  it('draws the old fixed layout', () => {
    const doc = legacyHero({
      firstName: 'Yohannan',
      role: 'Grade 5 Teacher',
      highlight: 'TFI Fellow',
      status: 'Teaching in Bengaluru',
      intro: 'Hello.',
    });
    expect(doc.blocks).toEqual([
      { type: 'headline', runs: [{ t: "Hi, I'm " }, { photo: true }, { t: ' Yohannan!' }] },
      {
        type: 'headline',
        runs: [{ t: "I'm a", c: 'muted' }, { t: ' Grade 5 Teacher' }, { t: ' &', c: 'muted' }],
      },
      {
        type: 'headline',
        runs: [{ t: 'TFI Fellow.', c: 'accent' }, { pill: 'Teaching in Bengaluru' }],
      },
      { type: 'text', runs: [{ t: 'Hello.' }] },
    ]);
  });

  it('leaves out lines that have no content, and the "&" without a highlight', () => {
    const doc = legacyHero({ firstName: 'Asha', role: 'Teacher' });
    expect(doc.blocks).toHaveLength(2);
    expect(JSON.stringify(doc)).not.toContain('&');
    expect(defaultHero('Asha').blocks).toHaveLength(1);
  });
});

describe('parseHero', () => {
  it('accepts a valid document', () => {
    const doc = legacyHero({ firstName: 'A', role: 'B', highlight: 'C', status: 'D', intro: 'E' });
    expect(parseHero(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
  });

  it('drops anything unexpected instead of trusting it', () => {
    const parsed = parseHero({
      v: 1,
      blocks: [
        {
          type: 'headline',
          runs: [{ t: 'ok', c: 'red' }, { t: '<img src=x onerror=alert(1)>' }, { script: 1 }],
        },
        { type: 'iframe', runs: [{ t: 'x' }] },
        { type: 'text', runs: [{ photo: true }] },
        'junk',
      ],
    });
    expect(parsed?.blocks).toHaveLength(1);
    const runs = parsed?.blocks[0]?.runs;
    // An unknown color is ignored; a markup-looking string stays plain text (React shows it as text).
    expect(runs).toEqual([{ t: 'ok' }, { t: '<img src=x onerror=alert(1)>' }]);
  });

  it('returns null when nothing usable is left', () => {
    expect(parseHero(null)).toBeNull();
    expect(parseHero('x')).toBeNull();
    expect(parseHero({ v: 1, blocks: [] })).toBeNull();
    expect(parseHero({ v: 1, blocks: [{ type: 'headline', runs: [] }] })).toBeNull();
  });
});

describe('heroProblem', () => {
  it('accepts a normal page', () => {
    expect(heroProblem(legacyHero({ firstName: 'A', intro: 'x' }))).toBeUndefined();
  });

  it('flags too much text, too many lines and too many color changes', () => {
    const long: HeroDoc = {
      v: 1,
      blocks: [{ type: 'text', runs: [{ t: 'x'.repeat(HERO_LIMITS.chars + 1) }] }],
    };
    expect(heroProblem(long)).toBeTypeOf('string');
    const lines: HeroDoc = {
      v: 1,
      blocks: Array.from({ length: HERO_LIMITS.headlines + 1 }, () => ({
        type: 'headline' as const,
        runs: [{ t: 'x' }],
      })),
    };
    expect(heroProblem(lines)).toBeTypeOf('string');
    const pieces: HeroDoc = {
      v: 1,
      blocks: [
        {
          type: 'headline',
          runs: Array.from({ length: HERO_LIMITS.runs + 1 }, () => ({ t: 'x' })),
        },
      ],
    };
    expect(heroProblem(pieces)).toBeTypeOf('string');
    expect(heroProblem({ v: 1, blocks: [] })).toBeTypeOf('string');
    expect(heroChars(legacyHero({ firstName: 'Abc' }))).toBeGreaterThan(5);
  });
});

describe('starters', () => {
  it.each(STARTERS.map((s) => [s.id, s] as const))('%s is a valid page', (_id, starter) => {
    const doc = starter.build('Priya Sharma', 'Priya');
    expect(parseHero(doc)).toEqual(doc);
    expect(heroProblem(doc)).toBeUndefined();
  });
});

describe('editor conversion', () => {
  it('round-trips a hero through the editor format', () => {
    const doc = legacyHero({
      firstName: 'Yohannan',
      role: 'Grade 5 Teacher',
      highlight: 'TFI Fellow',
      status: 'Teaching in Bengaluru',
      intro: 'Hello.',
    });
    doc.blocks.push({ type: 'headline', size: 'l', runs: [{ t: 'Big', c: 'blue' }] });
    expect(editorToHero(heroToEditor(doc, PHOTO))).toEqual(doc);
  });

  it('joins neighbouring text of the same color and drops empty lines', () => {
    const node: EditorNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { kind: 'headline', size: 'm' },
          content: [
            { type: 'text', text: 'Hel' },
            { type: 'text', text: 'lo ' },
            { type: 'text', text: 'there', marks: [{ type: 'heroColor', attrs: { c: 'accent' } }] },
            { type: 'text', text: '!', marks: [{ type: 'heroColor', attrs: { c: 'accent' } }] },
          ],
        },
        { type: 'paragraph', attrs: { kind: 'headline', size: 'm' } },
      ],
    };
    expect(editorToHero(node).blocks).toEqual([
      { type: 'headline', runs: [{ t: 'Hello ' }, { t: 'there!', c: 'accent' }] },
    ]);
  });

  it('keeps only one photo and one status pill, and no photo in a paragraph', () => {
    const pill = (text: string): EditorNode => ({
      type: 'pill',
      content: [{ type: 'text', text }],
    });
    const photo: EditorNode = { type: 'photo', attrs: PHOTO };
    const node: EditorNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { kind: 'headline' },
          content: [photo, photo, pill('One'), pill('Two')],
        },
        {
          type: 'paragraph',
          attrs: { kind: 'text' },
          content: [photo, { type: 'text', text: 'Hi' }],
        },
      ],
    };
    const { blocks } = editorToHero(node);
    expect(blocks[0]?.runs).toEqual([{ photo: true }, { pill: 'One' }]);
    expect(blocks[1]).toEqual({ type: 'text', runs: [{ t: 'Hi' }] });
  });

  it('cuts very long text into pieces that fit the limit', () => {
    const node: EditorNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { kind: 'text' },
          content: [{ type: 'text', text: 'x'.repeat(1500) }],
        },
      ],
    };
    const runs = editorToHero(node).blocks[0]?.runs ?? [];
    expect(runs.length).toBe(3);
    expect(runs.every((r) => 't' in r && r.t.length <= HERO_LIMITS.run)).toBe(true);
  });
});

describe('theme', () => {
  it('reads known choices only', () => {
    expect(parseTheme({ accent: 'teal', background: 'warm', font: 'classic' })).toEqual({
      accent: 'teal',
      background: 'warm',
      font: 'classic',
    });
    expect(parseTheme({ accent: '#fff', font: 'comic', evil: 1 })).toEqual({});
    expect(parseTheme(null)).toEqual({});
    expect(parseTheme(['blue'])).toEqual({});
  });

  it('picks the accent for the mode, and leaves the site default alone', () => {
    expect(accentColor({}, 'light')).toBeUndefined();
    expect(accentColor({ accent: 'orange' }, 'dark')).toBeUndefined();
    expect(accentColor({ accent: 'blue' }, 'light')).not.toBe(
      accentColor({ accent: 'blue' }, 'dark'),
    );
  });

  it('works out light or dark from the background choice', () => {
    expect(effectiveMode('dark', false)).toBe('dark');
    expect(effectiveMode('light', true)).toBe('light');
    expect(effectiveMode('warm', true)).toBe('light');
    expect(effectiveMode('auto', true)).toBe('dark');
    expect(effectiveMode(undefined, false)).toBe('light');
    expect(effectiveMode('warmblack', false)).toBe('dark');
    expect(effectiveMode('chalkboard', false)).toBe('dark');
  });

  it('reads the new dark backgrounds', () => {
    expect(parseTheme({ background: 'warmblack' })).toEqual({ background: 'warmblack' });
    expect(parseTheme({ background: 'chalkboard' })).toEqual({ background: 'chalkboard' });
  });

  it('gives every background a preview tile', () => {
    for (const b of Object.values(BACKGROUNDS)) expect(b.preview.bg).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('picks dark or white text for an accent button, whichever reads better', () => {
    expect(inkOnAccent('#ee6a1b')).toBe(INK_ON_ACCENT.dark);
    expect(inkOnAccent('#ff8240')).toBe(INK_ON_ACCENT.dark);
    expect(inkOnAccent('#2563d6')).toBe(INK_ON_ACCENT.light);
    expect(inkOnAccent('#6d3fe0')).toBe(INK_ON_ACCENT.light);
    expect(inkOnAccent('#3ddc84')).toBe(INK_ON_ACCENT.dark);
  });
});
