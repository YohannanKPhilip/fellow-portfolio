import { Mark, Node } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { blurhashCss } from '../../lib/blurhash';
import { colorClass, isHeroColor } from '../../lib/hero';

/**
 * The editor only knows the things a hero can contain: lines of text (a big line or a paragraph),
 * a few colors, the photo chip and the status pill. Anything else that is pasted in is dropped.
 */

/** One block: a big line ("headline") or a paragraph ("text"), with a size for big lines. */
const HeroParagraph = Paragraph.extend({
  addAttributes() {
    return {
      kind: {
        default: 'headline',
        parseHTML: (el) => (el.getAttribute('data-kind') === 'text' ? 'text' : 'headline'),
        renderHTML: (attrs) => ({ 'data-kind': attrs.kind as string }),
      },
      size: {
        default: 'm',
        parseHTML: (el) => el.getAttribute('data-size') ?? 'm',
        renderHTML: (attrs) => ({ 'data-size': attrs.size as string }),
      },
    };
  },
});

/** A palette color on a piece of text. */
export const HeroColorMark = Mark.create({
  name: 'heroColor',
  inclusive: true,
  addAttributes() {
    return { c: { default: 'accent' } };
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-c]',
        getAttrs: (el) => (isHeroColor((el as HTMLElement).dataset.c) ? null : false),
      },
    ];
  },
  renderHTML({ mark }) {
    const c = mark.attrs.c as string;
    return ['span', { 'data-c': c, class: isHeroColor(c) ? colorClass(c) : '' }, 0];
  },
});

/** The fellow's photo, in the middle of a line. The picture is a plain attribute the page keeps up to date. */
const Photo = Node.create({
  name: 'photo',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { src: { default: '' }, initial: { default: '?' }, blurhash: { default: '' } };
  },
  parseHTML() {
    return [{ tag: 'span[data-photo]' }];
  },
  renderHTML({ node }) {
    const src = node.attrs.src as string;
    const placeholder = blurhashCss(node.attrs.blurhash as string);
    return [
      'span',
      {
        class: 'avatar',
        'data-photo': '',
        contenteditable: 'false',
        title: 'Click to change your photo',
      },
      src
        ? ['img', { src, alt: '', ...(placeholder ? { style: placeholder } : {}) }]
        : ['span', node.attrs.initial as string],
    ];
  },
});

/** The status pill, with its text editable in place. */
const Pill = Node.create({
  name: 'pill',
  group: 'inline',
  inline: true,
  content: 'text*',
  marks: '',
  defining: true,
  parseHTML() {
    return [{ tag: 'span.pill', contentElement: '.pill__text' }];
  },
  renderHTML() {
    return [
      'span',
      { class: 'pill' },
      ['span', { class: 'pill__dot', contenteditable: 'false' }],
      ['span', { class: 'pill__text' }, 0],
    ];
  },
});

export const heroExtensions = [
  Document.extend({ content: 'paragraph+' }),
  HeroParagraph,
  Text,
  HeroColorMark,
  Photo,
  Pill,
  History,
];
