import { useEffect, useRef, useState } from 'react';
import { cleanRatio } from '../lib/blurhash';
import { describeMedia, type MediaView } from '../lib/media';
import type { MediaItem } from '../types';
import { BlurImg } from './BlurImg';

function Tile({ view, item }: { view: MediaView; item: MediaItem }) {
  const { caption } = item;
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
        className="media__frame media__frame--auto"
      >
        <BlurImg
          src={view.thumbUrl}
          alt={caption}
          blurhash={item.blurhash}
          ratio={item.ratio}
          loading="lazy"
          decoding="async"
        />
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

/** Rough height of a tile (as a multiple of its width) so columns can be balanced without measuring. */
const estimateHeight = (view: MediaView, item: MediaItem) =>
  (view.kind === 'image' ? 1 / (cleanRatio(item.ratio) || 4 / 3) : 1 / view.ratio) + 0.2;

/** Two columns when there is room, one when narrow. */
function useColumnCount(ref: React.RefObject<HTMLElement>, wanted: number, active: boolean) {
  const [count, setCount] = useState(wanted);
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const update = () => setCount(el.clientWidth >= 460 ? wanted : 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, wanted, active]);
  return count;
}

/** Pinterest-style layout: each tile goes into the currently shortest column. */
function distribute<T extends { view: MediaView; item: MediaItem }>(
  tiles: T[],
  columns: number,
): T[][] {
  const cols: T[][] = Array.from({ length: columns }, () => []);
  const heights: number[] = Array(columns).fill(0);
  for (const tile of tiles) {
    const shortest = heights.indexOf(Math.min(...heights));
    cols[shortest]?.push(tile);
    heights[shortest] = (heights[shortest] ?? 0) + estimateHeight(tile.view, tile.item);
  }
  return cols;
}

export function MediaGallery({ items }: { items: MediaItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const tiles = items.flatMap((item) => {
    const view = describeMedia(item.url, item.hint);
    return view ? [{ item, view }] : [];
  });
  const fit = useColumnCount(ref, 2, tiles.length > 0);
  if (tiles.length === 0) return null;
  const columns = distribute(tiles, tiles.length < 2 ? 1 : fit);
  return (
    <section className="panel">
      <h2 className="panel__title">In the classroom</h2>
      <div className="media-cols" ref={ref}>
        {columns.map((col, i) => (
          <div className="media-col" key={i}>
            {col.map(({ item, view }) => (
              <Tile key={item.url} view={view} item={item} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
