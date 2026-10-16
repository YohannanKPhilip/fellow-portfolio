import { useState } from 'react';
import { imageUrl } from '../lib/links';

/**
 * A resource's cover picture. Renders nothing when there is no cover link or the
 * picture fails to load, so a resource without a cover simply has no image area.
 */
export function Cover({
  url,
  className,
  width = 800,
  onFail,
}: {
  url: string;
  className: string;
  width?: number;
  /** Called when the picture can't be loaded, so the caller can show something else. */
  onFail?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(url, width);
  if (!src || failed) return null;
  return (
    <div className={className}>
      <img
        src={src}
        alt=""
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
