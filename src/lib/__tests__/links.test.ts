import { describe, expect, it } from 'vitest';
import {
  PAGE_LIMITS,
  defaultLinksSection,
  defaultPage,
  duplicateSection,
  insertSection,
  isLinkUrl,
  linkHost,
  moveLink,
  pageImages,
  pageProblem,
  parsePage,
  removeLink,
  setLink,
  type LinksSection,
} from '../page';

const links = (items: { label: string; url: string }[] = []): LinksSection => ({
  id: 'l1',
  type: 'links',
  items,
});

const A = { label: 'Videos', url: 'https://youtube.com/a' };
const B = { label: 'Blog', url: 'https://example.org/b' };
const C = { label: 'Form', url: 'https://forms.gle/c' };

describe('isLinkUrl', () => {
  it('accepts only https addresses with a real host and no spaces', () => {
    expect(isLinkUrl('https://youtube.com/watch?v=1')).toBe(true);
    expect(isLinkUrl('  https://example.org  ')).toBe(true);
    expect(isLinkUrl('http://example.org')).toBe(false);
    expect(isLinkUrl('javascript:alert(1)')).toBe(false);
    expect(isLinkUrl('https://localhost')).toBe(false);
    expect(isLinkUrl('https://exa mple.org')).toBe(false);
    expect(isLinkUrl('https://')).toBe(false);
    expect(isLinkUrl('')).toBe(false);
    expect(isLinkUrl('https://x.org/' + 'a'.repeat(PAGE_LIMITS.linkUrl))).toBe(false);
  });
});

describe('linkHost', () => {
  it('shows the site, without www', () => {
    expect(linkHost('https://www.youtube.com/watch?v=1')).toBe('youtube.com');
    expect(linkHost('https://forms.gle/abc')).toBe('forms.gle');
    expect(linkHost('not a url')).toBe('');
  });
});

describe('parsePage with a links section', () => {
  const page = (section: unknown) => parsePage({ v: 1, sections: [section] });

  it('reads a good links section', () => {
    const doc = page({
      id: 'l',
      type: 'links',
      title: [{ t: 'Links ', c: 'accent' }],
      items: [A, B],
    });
    expect(doc?.sections[0]).toEqual({
      id: 'l',
      type: 'links',
      title: [{ t: 'Links ', c: 'accent' }],
      items: [A, B],
    });
  });

  it('drops links that are not safe https addresses, and ones with no name', () => {
    const doc = page({
      id: 'l',
      type: 'links',
      items: [
        A,
        { label: 'Bad', url: 'javascript:alert(1)' },
        { label: 'Plain http', url: 'http://example.org' },
        { label: '  ', url: 'https://example.org' },
        { label: 'Extra', url: 'https://example.org/x', html: '<b>hi</b>' },
        'nonsense',
      ],
    });
    const section = doc?.sections[0] as LinksSection;
    expect(section.items.map((i) => i.label)).toEqual(['Videos', 'Extra']);
    expect(section.items[1]).toEqual({ label: 'Extra', url: 'https://example.org/x' });
  });

  it('keeps at most 12 links and trims long names', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      label: `L${i}`,
      url: `https://example.org/${i}`,
    }));
    expect(
      (page({ id: 'l', type: 'links', items: many })?.sections[0] as LinksSection).items,
    ).toHaveLength(PAGE_LIMITS.links);
    const long = page({ id: 'l', type: 'links', items: [{ label: 'x'.repeat(200), url: A.url }] });
    expect((long?.sections[0] as LinksSection).items[0]?.label).toHaveLength(PAGE_LIMITS.linkLabel);
  });

  it('treats a missing items list as an empty section', () => {
    expect((page({ id: 'l', type: 'links' })?.sections[0] as LinksSection).items).toEqual([]);
  });
});

describe('editing links', () => {
  it('adds, replaces, moves and removes', () => {
    let s = links();
    s = setLink(s, A);
    s = setLink(s, B);
    s = setLink(s, C);
    expect(s.items).toEqual([A, B, C]);

    s = setLink(s, { label: ' Blog 2 ', url: ' https://example.org/b2 ' }, 1);
    expect(s.items[1]).toEqual({ label: 'Blog 2', url: 'https://example.org/b2' });

    expect(moveLink(s, 2, -1).items.map((i) => i.label)).toEqual(['Videos', 'Form', 'Blog 2']);
    expect(moveLink(s, 0, -1)).toBe(s);
    expect(moveLink(s, 2, 1)).toBe(s);

    expect(removeLink(s, 0).items.map((i) => i.label)).toEqual(['Blog 2', 'Form']);
  });

  it('refuses a 13th link', () => {
    const full = links(
      Array.from({ length: PAGE_LIMITS.links }, (_, i) => ({
        label: `L${i}`,
        url: `https://example.org/${i}`,
      })),
    );
    expect(setLink(full, A)).toBe(full);
  });
});

describe('link pictures', () => {
  const USER = '11111111-1111-4111-8111-111111111111';
  const PIC = `${USER}/links/a.webp`;
  const HASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
  const page = (items: unknown[]) =>
    parsePage({ v: 1, sections: [{ id: 'l', type: 'links', items }] })?.sections[0] as LinksSection;

  it('keeps an uploaded picture only together with its consent', () => {
    const ok = page([{ ...A, image: PIC, blurhash: HASH, consent: true }]);
    expect(ok.items[0]).toEqual({ ...A, image: PIC, blurhash: HASH, consent: true });
    expect(page([{ ...A, image: PIC }]).items[0]).toEqual(A);
    expect(page([{ ...A, image: PIC, consent: false }]).items[0]).toEqual(A);
    expect(page([{ ...A, consent: true }]).items[0]).toEqual(A);
  });

  it('drops pictures that are not in the links folder, and bad blurhashes', () => {
    expect(page([{ ...A, image: `${USER}/media/a.webp`, consent: true }]).items[0]).toEqual(A);
    expect(page([{ ...A, image: 'https://x.test/a.png', consent: true }]).items[0]).toEqual(A);
    expect(page([{ ...A, image: PIC, blurhash: 'no spaces', consent: true }]).items[0]).toEqual({
      ...A,
      image: PIC,
      consent: true,
    });
  });

  it('keeps the picture when a link is edited, and lists the pictures a page uses', () => {
    let s = setLink(links(), { ...A, image: PIC, blurhash: HASH, consent: true });
    s = setLink(s, B);
    expect(s.items[0]).toEqual({ ...A, image: PIC, blurhash: HASH, consent: true });
    expect(pageImages({ v: 1, sections: [s] })).toEqual([PIC]);
    // Editing the link without a picture removes it.
    expect(setLink(s, A, 0).items[0]).toEqual(A);
    // A picture without consent is never stored.
    expect(setLink(links(), { ...A, image: PIC }).items[0]).toEqual(A);
  });
});

describe('a links section on a page', () => {
  it('can be added, copied with a new id, and is checked for limits', () => {
    const base = defaultPage('Asha');
    const withLinks = insertSection(base, setLink(defaultLinksSection('new'), A), 'hero');
    expect(withLinks.sections.map((s) => s.type)).toEqual(['hero', 'links', 'resources']);

    const copied = duplicateSection(withLinks, 'new');
    expect(copied.sections.map((s) => s.type)).toEqual(['hero', 'links', 'links', 'resources']);
    expect(copied.sections[2]?.id).not.toBe('new');
    expect((copied.sections[2] as LinksSection).items).toEqual([A]);

    expect(pageProblem(withLinks)).toBeUndefined();
    const tooLong: LinksSection = {
      ...defaultLinksSection('x'),
      title: Array.from({ length: PAGE_LIMITS.title + 1 }, () => ({ t: 'a' })),
    };
    expect(pageProblem(insertSection(base, tooLong, 'hero'))).toBeTypeOf('string');
  });

  it('a new links section starts empty with a default heading', () => {
    const s = defaultLinksSection('z');
    expect(s.items).toEqual([]);
    expect(s.title?.map((r) => r.t).join('')).toBe('Links worth a look.');
  });
});
