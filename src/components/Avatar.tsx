import { useState } from 'react';
import { imageUrl } from '../lib/links';

interface Props {
  name: string;
  photoUrl: string;
}

/** Square photo that sits inside the hero sentence. Falls back to an initial. */
export function Avatar({ name, photoUrl }: Props) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(photoUrl, 400);
  return (
    <span className="avatar" aria-hidden="true">
      {src && !failed ? (
        <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span>{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}
