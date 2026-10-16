import {
  HERO_LIMITS,
  type HeroBlock,
  type HeroColor,
  type HeroDoc,
  type HeroRun,
  isHeroColor,
} from './hero';

/** The editor's document, as plain JSON (ProseMirror format). Kept separate from the editor so it can be tested. */
export interface EditorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

/** The photo chip's picture, resolved to a URL, and the letter shown when there's none. */
export interface PhotoInfo {
  src: string;
  initial: string;
  /** Blurred stand-in shown until the picture has loaded. */
  blurhash?: string;
}

/** Turns a hero document into the editor's document. */
export function heroToEditor(hero: HeroDoc, photo: PhotoInfo): EditorNode {
  return {
    type: 'doc',
    content: hero.blocks.map((block): EditorNode => {
      const content = block.runs.map((run): EditorNode => {
        if ('photo' in run) return { type: 'photo', attrs: { ...photo } };
        if ('pill' in run) {
          return { type: 'pill', content: [{ type: 'text', text: run.pill }] };
        }
        return run.c
          ? { type: 'text', text: run.t, marks: [{ type: 'heroColor', attrs: { c: run.c } }] }
          : { type: 'text', text: run.t };
      });
      return {
        type: 'paragraph',
        attrs: {
          kind: block.type,
          size: block.type === 'headline' ? (block.size ?? 'm') : 'm',
        },
        content,
      };
    }),
  };
}

const textOf = (node: EditorNode): string => node.text ?? (node.content ?? []).map(textOf).join('');

/** Splits long text so every run fits the limit. */
function chunks(text: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += HERO_LIMITS.run)
    out.push(text.slice(i, i + HERO_LIMITS.run));
  return out;
}

/**
 * Turns the editor's document back into a hero document. Neighbouring text of the same color is
 * joined, empty lines are dropped, and a second photo or status pill is ignored.
 */
export function editorToHero(doc: EditorNode): HeroDoc {
  let photoSeen = false;
  let pillSeen = false;
  const blocks: HeroBlock[] = [];

  for (const para of doc.content ?? []) {
    if (para.type !== 'paragraph') continue;
    const headline = para.attrs?.kind !== 'text';
    const runs: HeroRun[] = [];
    // Text is gathered per color and cut into runs when the color changes.
    let pending: { text: string; c?: HeroColor } | undefined;
    const flush = () => {
      if (!pending) return;
      for (const piece of chunks(pending.text))
        runs.push(pending.c ? { t: piece, c: pending.c } : { t: piece });
      pending = undefined;
    };

    for (const child of para.content ?? []) {
      if (child.type === 'text' && child.text) {
        const colorAttr = child.marks?.find((m) => m.type === 'heroColor')?.attrs?.c;
        const c = isHeroColor(colorAttr) ? colorAttr : undefined;
        if (pending && pending.c === c) pending.text += child.text;
        else {
          flush();
          pending = { text: child.text, c };
        }
      } else if (child.type === 'photo' && headline && !photoSeen) {
        flush();
        photoSeen = true;
        runs.push({ photo: true });
      } else if (child.type === 'pill' && !pillSeen) {
        const text = textOf(child).slice(0, HERO_LIMITS.pill);
        if (text.trim()) {
          flush();
          pillSeen = true;
          runs.push({ pill: text });
        }
      }
    }
    flush();
    if (runs.length === 0) continue;

    if (headline) {
      const size = para.attrs?.size;
      blocks.push(
        size === 's' || size === 'l'
          ? { type: 'headline', size, runs }
          : { type: 'headline', runs },
      );
    } else {
      blocks.push({ type: 'text', runs });
    }
  }
  return { v: 1, blocks };
}
