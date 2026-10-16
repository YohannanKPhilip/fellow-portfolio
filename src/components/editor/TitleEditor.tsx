import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { EditorContent, useEditor } from '@tiptap/react';
import type { MouseEvent } from 'react';
import { HERO_COLORS, type HeroColor } from '../../lib/hero';
import type { EditorNode } from '../../lib/heroEditor';
import type { TitleRun } from '../../lib/page';
import { editorToTitle, titleToEditor } from '../../lib/titleEditor';
import { HeroColorMark } from './heroExtensions';

// One line of text with colors. No new lines, photo or status pill: just a heading.
const titleExtensions = [
  Document.extend({ content: 'paragraph' }),
  Paragraph,
  Text,
  HeroColorMark,
  History,
];

const LABEL: Record<HeroColor, string> = {
  muted: 'Grey',
  accent: 'Accent',
  blue: 'Blue',
  green: 'Green',
  pink: 'Pink',
  purple: 'Purple',
  teal: 'Teal',
};

/**
 * A section heading edited where it sits. Click it and type; pick a color for the selected words.
 * Uncontrolled: it starts from `runs` and reports every change through `onChange`.
 */
export function TitleEditor({
  runs,
  label,
  onChange,
}: {
  runs: TitleRun[];
  label: string;
  onChange: (runs: TitleRun[]) => void;
}) {
  const editor = useEditor({
    extensions: titleExtensions,
    content: titleToEditor(runs),
    editorProps: {
      attributes: { class: 'title-editor section-title', 'aria-label': label },
      // A heading is one line: Enter does nothing.
      handleKeyDown: (_view, event) => event.key === 'Enter',
    },
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: ed }) => onChange(editorToTitle(ed.getJSON() as EditorNode)),
  });
  if (!editor) return null;

  const active = HERO_COLORS.find((c) => editor.isActive('heroColor', { c }));
  const keep = (e: MouseEvent) => e.preventDefault(); // keeps the words selected while a swatch is pressed

  return (
    <div className="titleedit">
      <EditorContent editor={editor} />
      <div
        className="heroedit__bar titleedit__bar"
        role="toolbar"
        aria-label="Heading color"
        onMouseDown={keep}
      >
        <button
          type="button"
          className="swatch swatch--ink"
          aria-label="Normal color"
          aria-pressed={!active}
          title="Normal"
          onClick={() => editor.chain().focus().unsetMark('heroColor').run()}
        />
        {HERO_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch swatch--${c}`}
            aria-label={LABEL[c]}
            aria-pressed={active === c}
            title={LABEL[c]}
            onClick={() => editor.chain().focus().setMark('heroColor', { c }).run()}
          />
        ))}
      </div>
    </div>
  );
}
