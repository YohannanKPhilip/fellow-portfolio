import { useState } from 'react';
import { imageUrl } from '../lib/links';
import { BlurImg } from './BlurImg';

interface Props {
  name: string;
  photoUrl: string;
  /** Blurred stand-in shown until the photo has loaded. */
  blurhash?: string;
}

/** Square photo that sits inside the hero sentence. Falls back to an initial. */
export function Avatar({ name, photoUrl, blurhash }: Props) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(photoUrl, 400);
  return (
    <span className="avatar" aria-hidden="true">
      {src && !failed ? (
        <BlurImg
          src={src}
          alt=""
          blurhash={blurhash}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}
