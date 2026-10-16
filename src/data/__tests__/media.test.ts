import { describe, expect, it } from 'vitest';
import { describeMedia } from '../../lib/media';

describe('describeMedia', () => {
  it('embeds YouTube links in the privacy-friendly player', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?t=5',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share',
    ]) {
      const view = describeMedia(url);
      expect(view?.kind).toBe('youtube');
      expect(view?.embedUrl).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }
  });

  it('treats YouTube Shorts as tall', () => {
    const view = describeMedia('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    expect(view?.kind).toBe('youtube');
    expect(view?.ratio).toBeLessThan(1);
  });

  it('embeds Instagram posts and reels', () => {
    expect(describeMedia('https://www.instagram.com/p/Cabc123_-x/?igsh=zzz')?.embedUrl).toBe(
      'https://www.instagram.com/p/Cabc123_-x/embed',
    );
    expect(describeMedia('https://www.instagram.com/reel/Cabc123/')?.embedUrl).toBe(
      'https://www.instagram.com/reel/Cabc123/embed',
    );
    expect(describeMedia('https://www.instagram.com/someone/reels/Cabc123/')?.embedUrl).toContain(
      '/reel/Cabc123/embed',
    );
  });

  it('previews Drive files, or shows them as an image when asked', () => {
    const link = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing';
    expect(describeMedia(link)?.embedUrl).toBe(
      'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/preview',
    );
    const image = describeMedia(link, 'image');
    expect(image?.kind).toBe('image');
    expect(image?.embedUrl).toBeUndefined();
  });

  it('shows direct image links as pictures and everything else as a link', () => {
    expect(describeMedia('https://example.com/class.JPG')?.kind).toBe('image');
    expect(describeMedia('https://example.com/page')?.kind).toBe('link');
  });

  it('never embeds unknown hosts or unsafe links', () => {
    expect(describeMedia('https://evil.example/embed/dQw4w9WgXcQ')?.embedUrl).toBeUndefined();
    expect(describeMedia('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ')?.kind).toBe(
      'link',
    );
    expect(describeMedia('javascript:alert(1)')).toBeUndefined();
    expect(describeMedia('')).toBeUndefined();
  });
});
