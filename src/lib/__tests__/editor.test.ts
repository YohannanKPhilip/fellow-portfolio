import { describe, expect, it } from 'vitest';
import { fitWithin } from '../image';
import {
  addTag,
  cleanDraft,
  emptyDraft,
  filesFromNames,
  hasErrors,
  moveItem,
  slugFromTitle,
  validateDraft,
  type ResourceDraft,
} from '../resourceForm';

const USER = '11111111-1111-4111-8111-111111111111';
const HASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

const valid = (over: Partial<ResourceDraft> = {}): ResourceDraft => ({
  ...emptyDraft(),
  slug: 'fractions-with-rotis',
  title: 'Fractions with rotis',
  subject: 'Maths',
  driveLink: 'https://drive.google.com/x',
  ...over,
});

describe('fitWithin', () => {
  it('shrinks the longest side to the limit and keeps the shape', () => {
    expect(fitWithin(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
    expect(fitWithin(1200, 4800, 600)).toEqual({ width: 150, height: 600 });
  });

  it('never makes a small picture bigger', () => {
    expect(fitWithin(400, 300, 1600)).toEqual({ width: 400, height: 300 });
  });
});

describe('addTag', () => {
  it('trims, ignores blanks and duplicates (any case)', () => {
    const tags = addTag([], '  Maths   Mela ');
    expect(tags).toEqual(['Maths Mela']);
    expect(addTag(tags, 'maths mela')).toBe(tags);
    expect(addTag(tags, '   ')).toBe(tags);
  });

  it('stops at 8 tags and cuts a tag at 40 characters', () => {
    let tags: string[] = [];
    for (let i = 1; i <= 10; i++) tags = addTag(tags, `tag ${i}`);
    expect(tags).toHaveLength(8);
    expect(addTag([], 'x'.repeat(60))[0]).toHaveLength(40);
  });

  it('takes its own limits for "What\'s inside"', () => {
    expect(addTag([], 'x'.repeat(80), 12, 60)[0]).toHaveLength(60);
    const full = Array.from({ length: 12 }, (_, i) => `item ${i}`);
    expect(addTag(full, 'one more', 12, 60)).toBe(full);
  });
});

describe('filesFromNames', () => {
  it('keeps the saved row when its name is unchanged, and makes new rows for new names', () => {
    const before = [
      { key: 'a', name: 'Plan', link: '' },
      { key: 'b', name: 'Sheet', link: '' },
    ];
    const after = filesFromNames(['Plan', 'Quiz'], before);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toMatchObject({ name: 'Quiz', link: '' });
    expect(after[1]?.key).not.toBe('b');
  });
});

describe('slugFromTitle', () => {
  it('turns a title into an address', () => {
    expect(slugFromTitle('Fractions with rotis!')).toBe('fractions-with-rotis');
  });
});

describe('moveItem', () => {
  it('moves up and down, and stays put at the ends', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    const list = ['a', 'b'];
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 1, 1)).toBe(list);
  });
});

describe('cleanDraft', () => {
  it('drops empty file and media rows and trims text', () => {
    const d = cleanDraft(
      valid({
        title: '  Hello  ',
        files: [
          { key: '1', name: '', link: '' },
          { key: '2', name: ' Plan ', link: '' },
        ],
        media: [
          { key: '3', url: '', caption: '', hint: '', blurhash: '', ratio: 0, consent: false },
        ],
      }),
    );
    expect(d.title).toBe('Hello');
    expect(d.files).toHaveLength(1);
    expect(d.files[0]?.name).toBe('Plan');
    expect(d.media).toHaveLength(0);
  });

  it('keeps a blurhash only with an uploaded picture', () => {
    const upload = `${USER}/covers/a.webp`;
    const media = (url: string, blurhash: string) => ({
      key: 'm',
      url,
      caption: '',
      hint: 'image' as const,
      blurhash,
      ratio: 1.5,
      consent: true,
    });

    const kept = cleanDraft(
      valid({ coverPath: upload, coverBlurhash: HASH, media: [media(upload, HASH)] }),
    );
    expect(kept.coverBlurhash).toBe(HASH);
    expect(kept.media[0]).toMatchObject({ blurhash: HASH, ratio: 1.5 });

    const linked = cleanDraft(
      valid({
        coverPath: 'https://x.test/c.jpg',
        coverBlurhash: HASH,
        media: [media('https://x.test/m.jpg', HASH)],
      }),
    );
    expect(linked.coverBlurhash).toBe('');
    expect(linked.media[0]).toMatchObject({ blurhash: '', ratio: 0 });

    expect(
      cleanDraft(valid({ coverPath: upload, coverBlurhash: 'not a hash' })).coverBlurhash,
    ).toBe('');
    expect(cleanDraft(valid({ coverBlurhash: HASH })).coverBlurhash).toBe('');
  });
});

describe('validateDraft', () => {
  it('accepts a minimal resource', () => {
    expect(hasErrors(validateDraft(valid()))).toBe(false);
  });

  it('needs a title and a clean address', () => {
    expect(validateDraft(valid({ title: ' ' })).title).toBeTypeOf('string');
    expect(validateDraft(valid({ slug: 'Not Clean' })).slug).toBeTypeOf('string');
    expect(validateDraft(valid({ slug: 'new' })).slug).toBeTypeOf('string');
    expect(validateDraft(valid({ slug: '' })).slug).toBeTypeOf('string');
  });

  it('enforces the same length limits as the database', () => {
    expect(validateDraft(valid({ summary: 'x'.repeat(301) })).summary).toBeTypeOf('string');
    expect(validateDraft(valid({ summary: 'x'.repeat(300) })).summary).toBeUndefined();
    expect(validateDraft(valid({ description: 'x'.repeat(5001) })).description).toBeTypeOf(
      'string',
    );
    expect(validateDraft(valid({ subject: 'x'.repeat(41) })).subject).toBeTypeOf('string');
  });

  it('needs a title, a subject and a resource link', () => {
    const errors = validateDraft(valid({ title: '', subject: ' ', driveLink: '' }));
    expect(errors.title).toBeTypeOf('string');
    expect(errors.subject).toBeTypeOf('string');
    expect(errors.driveLink).toBeTypeOf('string');
    expect(validateDraft(emptyDraft())).toMatchObject({
      title: expect.any(String),
      subject: expect.any(String),
      driveLink: expect.any(String),
    });
  });

  it('accepts a grade that is a number or a range, or none', () => {
    for (const grade of ['', '5', '10', '5-7', '5 - 7', '5–7']) {
      expect(validateDraft(valid({ grade })).grade, grade).toBeUndefined();
    }
    expect(cleanDraft(valid({ grade: ' 5 - 7 ' })).grade).toBe('5-7');
  });

  it('refuses a grade that is not a number or a range', () => {
    for (const grade of ['Grade 5', 'five', '5-', '-7', '5-7-9', '5,7', '5.5', '123', '5 7']) {
      expect(validateDraft(valid({ grade })).grade, grade).toBeTypeOf('string');
    }
  });

  it('only allows https links without spaces', () => {
    expect(validateDraft(valid({ driveLink: 'https://x.test/a b' })).driveLink).toBeTypeOf(
      'string',
    );
    expect(validateDraft(valid({ driveLink: 'http://drive.google.com/x' })).driveLink).toBeTypeOf(
      'string',
    );
    expect(validateDraft(valid({ driveLink: 'javascript:alert(1)' })).driveLink).toBeTypeOf(
      'string',
    );
    expect(
      validateDraft(valid({ driveLink: 'https://drive.google.com/x' })).driveLink,
    ).toBeUndefined();
  });

  it('keeps "What\'s inside" to names: links are dropped and blank names ignored', () => {
    const d = cleanDraft(
      valid({
        files: [
          { key: 'a', name: 'Plan', link: 'https://x.test' },
          { key: 'b', name: '  ', link: 'https://y.test' },
        ],
      }),
    );
    expect(d.files).toEqual([{ key: 'a', name: 'Plan', link: '' }]);
  });

  it('allows at most 12 things under "What\'s inside"', () => {
    const files = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ key: `f${i}`, name: `Item ${i}`, link: '' }));
    expect(validateDraft(valid({ files: files(12) })).files).toBeUndefined();
    expect(validateDraft(valid({ files: files(13) })).files).toBeTypeOf('string');
  });

  it('requires consent for a cover, whether uploaded or linked', () => {
    const upload = `${USER}/covers/a.webp`;
    expect(validateDraft(valid({ coverPath: upload })).cover).toBeTypeOf('string');
    expect(validateDraft(valid({ coverPath: upload, coverConsent: true })).cover).toBeUndefined();
    expect(validateDraft(valid({ coverPath: 'https://x.test/c.jpg' })).cover).toBeTypeOf('string');
    expect(
      validateDraft(valid({ coverPath: 'javascript:alert(1)', coverConsent: true })).cover,
    ).toBeTypeOf('string');
    expect(validateDraft(valid()).cover).toBeUndefined();
  });

  it('requires consent and a safe link for every classroom item', () => {
    const item = {
      key: 'm',
      url: 'https://youtu.be/abc',
      caption: '',
      hint: '' as const,
      blurhash: '',
      ratio: 0,
      consent: false,
    };
    expect(validateDraft(valid({ media: [item] })).media).toBeTypeOf('string');
    expect(validateDraft(valid({ media: [{ ...item, consent: true }] })).media).toBeUndefined();
    expect(
      validateDraft(valid({ media: [{ ...item, url: 'ftp://x', consent: true }] })).media,
    ).toBeTypeOf('string');
    expect(
      validateDraft(
        valid({ media: [{ ...item, url: '', caption: 'orphan caption', consent: true }] }),
      ).media,
    ).toBeTypeOf('string');
  });
});
