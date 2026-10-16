/**
 * The top of a fellow's page ("hero") is one small document: big lines, a status pill, the photo and
 * an intro paragraph, in any order. Fellows choose from fixed colors and sizes; they never write
 * HTML or CSS, so a page can only contain things the site draws itself. The database enforces the
 * same shape (private.valid_hero).
 */

export const HERO_COLORS = ['muted', 'accent', 'blue', 'green', 'pink', 'purple', 'teal'] as const;
export type HeroColor = (typeof HERO_COLORS)[number];

/** Class for a colored run. "muted" and "accent" are the site's own; the rest are the palette colors. */
export const colorClass = (c: HeroColor) => (c === 'muted' || c === 'accent' ? c : `hc hc-${c}`);

export const HERO_SIZES = ['s', 'm', 'l'] as const;
export type HeroSize = (typeof HERO_SIZES)[number];

export type HeroRun = { t: string; c?: HeroColor } | { photo: true } | { pill: string };

export type HeroBlock =
  | { type: 'headline'; size?: HeroSize; runs: HeroRun[] }
  | { type: 'text'; runs: HeroRun[] };

export interface HeroDoc {
  v: 1;
  blocks: HeroBlock[];
}

/** Limits match the database. */
export const HERO_LIMITS = {
  blocks: 10,
  headlines: 6,
  texts: 4,
  runs: 16,
  run: 700,
  pill: 80,
  chars: 2000,
} as const;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const isHeroColor = (v: unknown): v is HeroColor =>
  (HERO_COLORS as readonly unknown[]).includes(v);
const isColor = isHeroColor;

function parseRun(value: unknown, inHeadline: boolean): HeroRun | undefined {
  if (!isObject(value)) return undefined;
  if (typeof value.t === 'string' && value.t.length > 0) {
    const run: HeroRun = { t: value.t.slice(0, HERO_LIMITS.run) };
    if (isColor(value.c)) run.c = value.c;
    return run;
  }
  if (value.photo === true && inHeadline) return { photo: true };
  if (typeof value.pill === 'string' && value.pill.length > 0) {
    return { pill: value.pill.slice(0, HERO_LIMITS.pill) };
  }
  return undefined;
}

/**
 * Reads a hero document from stored data. Anything unexpected is dropped rather than trusted, so a
 * damaged document shows a plainer page instead of breaking it. Returns null if nothing usable is left.
 */
export function parseHero(value: unknown): HeroDoc | null {
  if (!isObject(value) || !Array.isArray(value.blocks)) return null;
  const blocks: HeroBlock[] = [];
  for (const raw of value.blocks.slice(0, HERO_LIMITS.blocks)) {
    if (!isObject(raw) || !Array.isArray(raw.runs)) continue;
    const headline = raw.type === 'headline';
    if (!headline && raw.type !== 'text') continue;
    const runs = raw.runs
      .slice(0, HERO_LIMITS.runs)
      .map((r) => parseRun(r, headline))
      .filter((r): r is HeroRun => r !== undefined);
    if (runs.length === 0) continue;
    if (headline) {
      const size = (HERO_SIZES as readonly unknown[]).includes(raw.size)
        ? (raw.size as HeroSize)
        : undefined;
      blocks.push(
        size && size !== 'm' ? { type: 'headline', size, runs } : { type: 'headline', runs },
      );
    } else {
      blocks.push({ type: 'text', runs });
    }
  }
  return blocks.length ? { v: 1, blocks } : null;
}

/** Number of characters a document uses against the limit (text and pill). */
export function heroChars(doc: HeroDoc): number {
  let n = 0;
  for (const b of doc.blocks) {
    for (const r of b.runs) {
      if ('t' in r) n += r.t.length;
      else if ('pill' in r) n += r.pill.length;
    }
  }
  return n;
}

/** A message for the fellow if the document is over a limit, otherwise undefined. */
export function heroProblem(doc: HeroDoc): string | undefined {
  const headlines = doc.blocks.filter((b) => b.type === 'headline').length;
  const texts = doc.blocks.filter((b) => b.type === 'text').length;
  if (doc.blocks.length === 0) return 'Add some text to the top of your page.';
  if (headlines > HERO_LIMITS.headlines) {
    return `Use at most ${HERO_LIMITS.headlines} big lines. Press Backspace to join lines.`;
  }
  if (texts > HERO_LIMITS.texts) return `Use at most ${HERO_LIMITS.texts} paragraphs.`;
  if (doc.blocks.some((b) => b.runs.length > HERO_LIMITS.runs)) {
    return `A line has too many different colors (limit ${HERO_LIMITS.runs} pieces). Use fewer color changes.`;
  }
  if (heroChars(doc) > HERO_LIMITS.chars) {
    return `That's too much text for the top of the page (limit ${HERO_LIMITS.chars} characters).`;
  }
  return undefined;
}

/** What the Google Sheet and the old database columns held, as separate fields. */
export interface LegacyHero {
  firstName: string;
  role?: string;
  highlight?: string;
  status?: string;
  intro?: string;
}

/**
 * Builds the document that draws exactly what the old fixed layout drew:
 *   Hi, I'm [photo] First!  /  I'm a Role &  /  Highlight. (status pill)  /  intro paragraph
 */
export function legacyHero({ firstName, role, highlight, status, intro }: LegacyHero): HeroDoc {
  const blocks: HeroBlock[] = [
    {
      type: 'headline',
      runs: [{ t: "Hi, I'm " }, { photo: true }, { t: ` ${firstName}!` }],
    },
  ];
  if (role) {
    const runs: HeroRun[] = [{ t: "I'm a", c: 'muted' }, { t: ` ${role}` }];
    if (highlight) runs.push({ t: ' &', c: 'muted' });
    blocks.push({ type: 'headline', runs });
  }
  if (highlight) {
    const runs: HeroRun[] = [{ t: `${highlight}.`, c: 'accent' }];
    if (status) runs.push({ pill: status });
    blocks.push({ type: 'headline', runs });
  }
  if (intro) blocks.push({ type: 'text', runs: [{ t: intro }] });
  return { v: 1, blocks };
}

/** What a page shows when it has no hero document of its own. */
export const defaultHero = (firstName: string): HeroDoc => legacyHero({ firstName });

export interface Starter {
  id: string;
  label: string;
  /** One line shown under the label when choosing. */
  hint: string;
  build: (name: string, firstName: string) => HeroDoc;
}

const PLACEHOLDER_INTRO = 'Tell visitors what you teach and what you share here.';

/** Ready-made layouts to start from, so nobody begins with a blank box. */
export const STARTERS: Starter[] = [
  {
    id: 'hi',
    label: "Hi, I'm …",
    hint: 'A friendly greeting with your photo',
    build: (_name, first) => ({
      v: 1,
      blocks: [
        {
          type: 'headline',
          runs: [{ t: "Hi, I'm " }, { photo: true }, { t: ` ${first || 'there'}!` }],
        },
        {
          type: 'headline',
          runs: [{ t: "I'm a", c: 'muted' }, { t: ' teacher' }, { t: ' &', c: 'muted' }],
        },
        {
          type: 'headline',
          runs: [{ t: 'TFI Fellow.', c: 'accent' }, { pill: 'Teaching in my city' }],
        },
        { type: 'text', runs: [{ t: PLACEHOLDER_INTRO }] },
      ],
    }),
  },
  {
    id: 'statement',
    label: 'Big statement',
    hint: 'One line about what you believe',
    build: () => ({
      v: 1,
      blocks: [
        { type: 'headline', size: 'l', runs: [{ t: 'Every child can' }] },
        { type: 'headline', size: 'l', runs: [{ t: 'love learning.', c: 'accent' }] },
        { type: 'text', runs: [{ t: PLACEHOLDER_INTRO }] },
      ],
    }),
  },
  {
    id: 'name',
    label: 'Name and role',
    hint: 'Simple, with your photo beside your name',
    build: (name) => ({
      v: 1,
      blocks: [
        { type: 'headline', size: 'l', runs: [{ photo: true }, { t: ` ${name || 'Your name'}` }] },
        { type: 'headline', size: 's', runs: [{ t: 'Teacher · TFI Fellow', c: 'muted' }] },
        { type: 'text', runs: [{ t: PLACEHOLDER_INTRO }] },
      ],
    }),
  },
];
