import { driveFileId, safeUrl } from './links';

/**
 * How a link from the "media" tab is shown.
 * - youtube / instagram / drive: click-to-load embed (nothing third-party loads until clicked)
 * - image: a plain picture
 * - link: a link card, for anything we don't embed
 *
 * Embed URLs are always rebuilt from an ID that matched a strict pattern, never
 * copied from the sheet, so only these known hosts can ever appear in an iframe.
 */
export type MediaKind = 'youtube' | 'instagram' | 'drive' | 'image' | 'link';

export interface MediaView {
  kind: MediaKind;
  /** The original link, for the "Open" fallback. */
  href: string;
  /** Iframe source. Present for embeddable kinds. */
  embedUrl?: string;
  /** Preview picture. Present when we can get one without a third-party script. */
  thumbUrl?: string;
  /** Width / height of the frame. */
  ratio: number;
  /** Short name of the place the media lives, e.g. "YouTube". */
  source: string;
}

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const YOUTUBE_ID = /^[\w-]{11}$/;
const INSTAGRAM_PATH = /^\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/;
const IMAGE_PATH = /\.(?:jpe?g|png|gif|webp|avif)$/i;

function youtubeId(url: URL): { id: string; short: boolean } | undefined {
  if (url.hostname === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0] ?? '';
    return YOUTUBE_ID.test(id) ? { id, short: false } : undefined;
  }
  const shorts = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
  if (shorts?.[1]) return { id: shorts[1], short: url.pathname.startsWith('/shorts/') };
  const v = url.searchParams.get('v') ?? '';
  return url.pathname === '/watch' && YOUTUBE_ID.test(v) ? { id: v, short: false } : undefined;
}

/** Works out how to show one media link. Returns undefined if it isn't a usable http(s) link. */
export function describeMedia(rawUrl: string, hint = ''): MediaView | undefined {
  const href = safeUrl(rawUrl);
  if (!href) return undefined;
  const url = new URL(href);
  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    const yt = youtubeId(url);
    if (yt) {
      return {
        kind: 'youtube',
        href,
        embedUrl: `https://www.youtube-nocookie.com/embed/${yt.id}?autoplay=1&rel=0`,
        thumbUrl: `https://i.ytimg.com/vi/${yt.id}/hqdefault.jpg`,
        ratio: yt.short ? 9 / 16 : 16 / 9,
        source: 'YouTube',
      };
    }
  }

  if (host === 'instagram.com' || host === 'www.instagram.com') {
    const match = url.pathname.match(INSTAGRAM_PATH);
    if (match?.[1] && match[2]) {
      const type = match[1] === 'reels' ? 'reel' : match[1];
      return {
        kind: 'instagram',
        href,
        embedUrl: `https://www.instagram.com/${type}/${match[2]}/embed`,
        ratio: 4 / 5,
        source: 'Instagram',
      };
    }
  }

  const driveId = driveFileId(href);
  if (driveId) {
    const thumbUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
    if (hint === 'image') {
      return { kind: 'image', href, thumbUrl, ratio: 4 / 3, source: 'Google Drive' };
    }
    return {
      kind: 'drive',
      href,
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
      thumbUrl,
      ratio: 16 / 9,
      source: 'Google Drive',
    };
  }

  if (hint === 'image' || IMAGE_PATH.test(url.pathname)) {
    return {
      kind: 'image',
      href,
      thumbUrl: href,
      ratio: 4 / 3,
      source: host.replace(/^www\./, ''),
    };
  }

  return { kind: 'link', href, ratio: 16 / 9, source: host.replace(/^www\./, '') };
}
