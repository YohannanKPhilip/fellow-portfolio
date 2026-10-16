import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { uploadImage } from '../../data/supabase/storage';
import { HERO_COLORS, HERO_LIMITS, heroChars, type HeroColor, type HeroDoc } from '../../lib/hero';
import { editorToHero, heroToEditor, type EditorNode } from '../../lib/heroEditor';
import { imageUrl } from '../../lib/links';
import { heroExtensions } from './heroExtensions';

interface Props {
  hero: HeroDoc;
  userId: string;
  /** The saved photo: an uploaded path, an outside link, or empty. */
  photo: string;
  /** The photo as a URL the browser can show. */
  photoUrl: string;
  /** The blurhash that goes with `photo` ('' for a link or no photo). */
  photoBlurhash: string;
  /** Letter shown in the photo chip while there is no photo. */
  initial: string;
  onPhotoChange: (photo: string, blurhash: string) => void;
  onChange: (hero: HeroDoc) => void;
}

const COLOR_LABEL: Record<HeroColor, string> = {
  muted: 'Grey',
  accent: 'Accent',
  blue: 'Blue',
  green: 'Green',
  pink: 'Pink',
  purple: 'Purple',
  teal: 'Teal',
};

/** Sets an attribute on every block the selection touches. */
function setBlockAttrs(editor: Editor, attrs: Record<string, string>) {
  editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      const { from, to } = state.selection;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'paragraph')
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
      });
      return true;
    })
    .run();
}

function hasNode(editor: Editor, name: string) {
  let found = false;
  editor.state.doc.descendants((node) => {
    if (node.type.name === name) found = true;
    return !found;
  });
  return found;
}

/**
 * The top of the page, edited where it sits: click any words and type, then use the toolbar for
 * size and color. This is the same look visitors see, not a form.
 */
export function HeroEditor({
  hero,
  userId,
  photo,
  photoUrl,
  photoBlurhash,
  initial,
  onPhotoChange,
  onChange,
}: Props) {
  const photoSrc = imageUrl(photoUrl, 400) ?? '';
  const wrap = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState<{ left: number; top: number }>();
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string>();
  const [chars, setChars] = useState(() => heroChars(hero));

  const editor = useEditor({
    extensions: heroExtensions,
    content: heroToEditor(hero, { src: photoSrc, initial, blurhash: photoBlurhash }),
    editorProps: {
      attributes: {
        class: 'hero-editor',
        'aria-label': 'Top of your page. Click any text to edit it.',
        spellcheck: 'true',
      },
    },
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: ed }) => {
      const next = editorToHero(ed.getJSON() as EditorNode);
      setChars(heroChars(next));
      onChange(next);
    },
  });

  // Keep the photo chip's picture and letter current when the photo or name changes.
  useEffect(() => {
    if (!editor) return;
    editor
      .chain()
      .command(({ tr, state }) => {
        state.doc.descendants((node, pos) => {
          if (
            node.type.name === 'photo' &&
            (node.attrs.src !== photoSrc ||
              node.attrs.initial !== initial ||
              node.attrs.blurhash !== photoBlurhash)
          ) {
            tr.setNodeMarkup(pos, undefined, {
              src: photoSrc,
              initial,
              blurhash: photoBlurhash,
            });
          }
        });
        tr.setMeta('addToHistory', false);
        return true;
      })
      .run();
  }, [editor, photoSrc, initial, photoBlurhash]);

  // Close the photo menu on Escape or when clicking elsewhere.
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return;
      if (e.type === 'mousedown' && (e.target as HTMLElement).closest('.photomenu, [data-photo]'))
        return;
      setMenu(undefined);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('mousedown', close);
    };
  }, [menu]);

  if (!editor) return null;

  const onEditorClick = (e: MouseEvent) => {
    const chip = (e.target as HTMLElement).closest('[data-photo]');
    if (!chip || !wrap.current) return;
    const box = chip.getBoundingClientRect();
    const outer = wrap.current.getBoundingClientRect();
    setMenu({ left: box.left - outer.left, top: box.bottom - outer.top + 8 });
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setPhotoError(undefined);
    try {
      const image = await uploadImage(userId, 'photo', file);
      onPhotoChange(image.path, image.blurhash);
      setMenu(undefined);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (picker.current) picker.current.value = '';
    }
  };

  const takeOutOfHeadline = () => {
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'photo') tr.delete(pos, pos + node.nodeSize);
        });
        return true;
      })
      .run();
    setMenu(undefined);
  };

  const attrs = editor.getAttributes('paragraph');
  const isHeadline = attrs.kind !== 'text';
  const activeColor = HERO_COLORS.find((c) => editor.isActive('heroColor', { c }));
  const keep = (e: MouseEvent) => e.preventDefault(); // keeps the text selected while a button is pressed
  const photoInDoc = hasNode(editor, 'photo');
  const pillInDoc = hasNode(editor, 'pill');

  return (
    <div className="heroedit" ref={wrap}>
      <div
        className="heroedit__bar"
        role="toolbar"
        aria-label="Format the top of your page"
        onMouseDown={keep}
      >
        <div className="heroedit__group">
          <button
            type="button"
            aria-label="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↶
          </button>
          <button
            type="button"
            aria-label="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↷
          </button>
        </div>
        <div className="heroedit__group" role="group" aria-label="Kind of text">
          <button
            type="button"
            aria-pressed={isHeadline}
            onClick={() => setBlockAttrs(editor, { kind: 'headline' })}
          >
            Big line
          </button>
          <button
            type="button"
            aria-pressed={!isHeadline}
            onClick={() => setBlockAttrs(editor, { kind: 'text', size: 'm' })}
          >
            Paragraph
          </button>
        </div>
        {isHeadline && (
          <div className="heroedit__group" role="group" aria-label="Size">
            {(['s', 'm', 'l'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={(attrs.size ?? 'm') === s}
                aria-label={{ s: 'Small', m: 'Medium', l: 'Large' }[s]}
                onClick={() => setBlockAttrs(editor, { size: s })}
              >
                <span style={{ fontSize: { s: 12, m: 15, l: 19 }[s] }}>A</span>
              </button>
            ))}
          </div>
        )}
        <div className="heroedit__group" role="group" aria-label="Text color">
          <button
            type="button"
            className="swatch swatch--ink"
            aria-label="Normal color"
            aria-pressed={!activeColor}
            title="Normal"
            onClick={() => editor.chain().focus().unsetMark('heroColor').run()}
          />
          {HERO_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch swatch--${c}`}
              aria-label={COLOR_LABEL[c]}
              aria-pressed={activeColor === c}
              title={COLOR_LABEL[c]}
              onClick={() => editor.chain().focus().setMark('heroColor', { c }).run()}
            />
          ))}
        </div>
        <div className="heroedit__group">
          <button
            type="button"
            disabled={photoInDoc || !isHeadline}
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertContent({
                  type: 'photo',
                  attrs: { src: photoSrc, initial, blurhash: photoBlurhash },
                })
                .run()
            }
          >
            + Photo
          </button>
          <button
            type="button"
            disabled={pillInDoc || !isHeadline}
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertContent({ type: 'pill', content: [{ type: 'text', text: 'Your status' }] })
                .run()
            }
          >
            + Status
          </button>
          <button
            type="button"
            onClick={() =>
              editor
                .chain()
                .focus('end')
                .insertContent({ type: 'paragraph', attrs: { kind: 'text', size: 'm' } })
                .run()
            }
          >
            + Paragraph
          </button>
        </div>
      </div>

      <div onClick={onEditorClick}>
        <EditorContent editor={editor} />
      </div>
      <p className={`form__hint heroedit__count ${chars > HERO_LIMITS.chars ? 'form__error' : ''}`}>
        Press Enter for a new line. Click your photo to change it. {chars} / {HERO_LIMITS.chars}
      </p>

      {menu && (
        <div className="photomenu" style={{ left: menu.left, top: menu.top }} role="menu">
          <input
            ref={picker}
            type="file"
            accept="image/*"
            className="visually-hidden"
            tabIndex={-1}
            onChange={(e) => void pickPhoto(e.target.files?.[0])}
          />
          <button
            type="button"
            role="menuitem"
            disabled={uploading}
            onClick={() => picker.current?.click()}
          >
            {uploading ? 'Uploading…' : photo ? 'Replace photo' : 'Upload a photo'}
          </button>
          {photo && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onPhotoChange('', '');
                setMenu(undefined);
              }}
            >
              Remove photo
            </button>
          )}
          <button type="button" role="menuitem" onClick={takeOutOfHeadline}>
            Take it out of the headline
          </button>
          {photoError && <p className="form__error">{photoError}</p>}
        </div>
      )}
    </div>
  );
}
