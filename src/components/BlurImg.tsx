import { useMemo, type ImgHTMLAttributes } from 'react';
import { blurhashStyle, cleanRatio } from '../lib/blurhash';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> & {
  alt: string;
  /** Blurred stand-in painted behind the picture until it has loaded. */
  blurhash?: string;
  /** Width / height, when known, so the picture's space is held before it loads. */
  ratio?: number;
};

/**
 * An <img> that shows its blurhash (when it has one) while loading. The placeholder is the img's
 * own background, so the picture simply covers it once it arrives; no wrapper is needed.
 */
export function BlurImg({ blurhash, ratio, style, ...img }: Props) {
  const placeholder = useMemo(() => blurhashStyle(blurhash), [blurhash]);
  const known = cleanRatio(ratio);
  return (
    <img
      {...img}
      style={{ ...placeholder, ...(known ? { aspectRatio: String(known) } : {}), ...style }}
    />
  );
}
