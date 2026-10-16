import { describe, expect, it } from 'vitest';
import { driveFileId, imageUrl, safeUrl } from '../../lib/links';

describe('safeUrl', () => {
  it('allows http and https only', () => {
    expect(safeUrl('https://drive.google.com/x')).toBe('https://drive.google.com/x');
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeUrl('not a url')).toBeUndefined();
    expect(safeUrl('')).toBeUndefined();
  });
});

describe('Drive links', () => {
  const id = '1JLS_Kzb5VBXv7D3UJ09SDYDTMENcHyYu';

  it('finds the file ID in common share-link shapes', () => {
    expect(driveFileId(`https://drive.google.com/file/d/${id}/view?usp=sharing`)).toBe(id);
    expect(driveFileId(`https://drive.google.com/open?id=${id}`)).toBe(id);
    expect(driveFileId(`https://drive.google.com/uc?export=view&id=${id}`)).toBe(id);
    expect(driveFileId('https://example.com/photo.jpg')).toBeUndefined();
  });

  it('turns a Drive link into an image URL and leaves other URLs alone', () => {
    expect(imageUrl(`https://drive.google.com/file/d/${id}/view`, 400)).toBe(
      `https://drive.google.com/thumbnail?id=${id}&sz=w400`,
    );
    expect(imageUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
    expect(imageUrl('ftp://example.com/photo.jpg')).toBeUndefined();
  });
});
