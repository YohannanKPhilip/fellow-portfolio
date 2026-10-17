import { useState } from 'react';
import { imageUrl } from '../lib/links';
import { BlurImg } from './BlurImg';

/**
 * A resource's cover picture. Renders nothing when there is no cover link or the
 * picture fails to load, so a resource without a cover simply has no image area.
 */
export function Cover({
  url,
  className,
  width = 800,
  blurhash,
  transitionName,
  onFail,
}: {
  url: string;
  className: string;
  width?: number;
  /** Blurred stand-in shown until the picture has loaded. */
  blurhash?: string;
  /** Gives the cover a view-transition-name, so it can morph between a card and a resource page. */
  transitionName?: string;
  /** Called when the picture can't be loaded, so the caller can show something else. */
  onFail?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(url, width);
  if (!src || failed) return null;
  return (
    <div
      className={className}
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
    >
      <BlurImg
        src={src}
        alt=""
        blurhash={blurhash}
        loading="lazy"
        decoding="async"
        onError={() => {
          setFailed(true);
          onFail?.();
        }}
      />
    </div>
  );
}
