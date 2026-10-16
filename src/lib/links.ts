/** Returns the URL only if it is http(s); anything else (javascript:, data:) is dropped. */
export function safeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

const DRIVE_FILE_PATTERNS = [
  /drive\.google\.com\/file\/d\/([\w-]{10,})/,
  /drive\.google\.com\/open\?id=([\w-]{10,})/,
  /drive\.google\.com\/uc\?(?:.*&)?id=([\w-]{10,})/,
];

/** Extracts the file ID from a Google Drive share link, if it is one. */
export function driveFileId(url: string): string | undefined {
  for (const pattern of DRIVE_FILE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

/**
 * Turns a Drive share link into a URL an <img> can load. Other http(s) URLs
 * pass through unchanged.
 */
export function imageUrl(url: string | undefined, width = 600): string | undefined {
  const safe = safeUrl(url);
  if (!safe) return undefined;
  const id = driveFileId(safe);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${width}` : safe;
}
