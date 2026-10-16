import { useState } from 'react';
import { describeMedia, type MediaView } from '../lib/media';
import type { MediaItem } from '../types';

function Tile({ view, caption }: { view: MediaView; caption: string }) {
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const label = caption || `${view.source} media`;
  // Tall frames (Shorts, Instagram) are capped so they don't tower over the page.
  const frameStyle = {
    aspectRatio: String(view.ratio),
    ...(view.ratio < 1 ? { maxWidth: `${Math.round(view.ratio * 520)}px` } : {}),
  };

  let frame;
  if (view.kind === 'image') {
    frame = (
      <a
        href={view.href}
        target="_blank"
        rel="noopener noreferrer"
        className="media__frame"
        style={frameStyle}
      >
        <img src={view.thumbUrl} alt={caption} loading="lazy" decoding="async" />
      </a>
    );
  } else if (view.kind === 'link') {
    frame = (
      <a
        href={view.href}
        target="_blank"
        rel="noopener noreferrer"
        className="media__frame media__frame--link"
        style={frameStyle}
      >
        <span>{view.source} ↗</span>
      </a>
    );
  } else if (playing && view.embedUrl) {
    frame = (
      <div className="media__frame" style={frameStyle}>
        <iframe
          src={view.embedUrl}
          title={label}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  } else {
    frame = (
      <button
        type="button"
        className="media__frame media__play"
        style={frameStyle}
        onClick={() => setPlaying(true)}
      >
        {view.thumbUrl && !thumbFailed && (
          <img
            src={view.thumbUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setThumbFailed(true)}
          />
        )}
        <span className="media__badge">
          <span aria-hidden="true">▶</span> Play from {view.source}
        </span>
      </button>
    );
  }

  return (
    <figure className="media">
      {frame}
      <figcaption>
        {caption && <span>{caption}</span>}
        {view.kind !== 'image' && view.kind !== 'link' && (
          <a href={view.href} target="_blank" rel="noopener noreferrer">
            Open on {view.source} ↗
          </a>
        )}
      </figcaption>
    </figure>
  );
}

export function MediaGallery({ items }: { items: MediaItem[] }) {
  const tiles = items.flatMap((item) => {
    const view = describeMedia(item.url, item.hint);
    return view ? [{ item, view }] : [];
  });
  if (tiles.length === 0) return null;
  return (
    <section className="panel">
      <h2 className="panel__title">In the classroom</h2>
      <div className="media-grid">
        {tiles.map(({ item, view }) => (
          <Tile key={item.url} view={view} caption={item.caption} />
        ))}
      </div>
    </section>
  );
}
