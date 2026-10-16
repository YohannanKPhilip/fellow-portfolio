import { isHeroColor, type HeroColor } from './hero';
import type { EditorNode } from './heroEditor';
import { PAGE_LIMITS, type TitleRun } from './page';

/** Turns a section heading into the editor's single line of text. */
export function titleToEditor(runs: TitleRun[]): EditorNode {
  const content: EditorNode[] = runs.map((run) =>
    run.c
      ? { type: 'text', text: run.t, marks: [{ type: 'heroColor', attrs: { c: run.c } }] }
      : { type: 'text', text: run.t },
  );
  return { type: 'doc', content: [{ type: 'paragraph', content }] };
}

/**
 * Turns the editor's line back into heading pieces. Neighbouring text of the same color is joined,
 * and long text is cut so every piece fits the limit.
 */
export function editorToTitle(doc: EditorNode): TitleRun[] {
  const runs: TitleRun[] = [];
  let pending: { text: string; c?: HeroColor } | undefined;
  const flush = () => {
    if (!pending) return;
    for (let i = 0; i < pending.text.length; i += PAGE_LIMITS.titleRun) {
      const t = pending.text.slice(i, i + PAGE_LIMITS.titleRun);
      runs.push(pending.c ? { t, c: pending.c } : { t });
    }
    pending = undefined;
  };

  for (const para of doc.content ?? []) {
    for (const child of para.content ?? []) {
      if (child.type !== 'text' || !child.text) continue;
      const colorAttr = child.marks?.find((m) => m.type === 'heroColor')?.attrs?.c;
      const c = isHeroColor(colorAttr) ? colorAttr : undefined;
      if (pending && pending.c === c) pending.text += child.text;
      else {
        flush();
        pending = { text: child.text, c };
      }
    }
  }
  flush();
  return runs;
}
