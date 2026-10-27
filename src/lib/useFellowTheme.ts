import { useEffect } from 'react';
import { accentColor, effectiveMode, FONTS, inkOnAccent, parseTheme, type Theme } from './theme';

const FONT_LINK_ATTR = 'data-fellow-font';

function ensureFontLink(href: string) {
  if (document.head.querySelector(`link[${FONT_LINK_ATTR}="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute(FONT_LINK_ATTR, href);
  document.head.appendChild(link);
}

/** Loads every headline font, so the font choices can be shown in their own typeface. */
export function loadFonts() {
  for (const font of Object.values(FONTS)) if (font.link) ensureFontLink(font.link);
}

/**
 * Applies a fellow's page style (accent color, background, headline font) to the whole page while
 * it is on screen, and removes it again when the page changes. The styles themselves are fixed
 * choices in the stylesheet, so a theme can only pick from them.
 */
export function useFellowTheme(theme: Theme | undefined) {
  const key = JSON.stringify(theme ?? {});

  useEffect(() => {
    const t = parseTheme(JSON.parse(key));
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      if (t.background && t.background !== 'auto') root.dataset.bg = t.background;
      else delete root.dataset.bg;

      const accent = accentColor(t, effectiveMode(t.background, media.matches));
      if (accent) {
        root.style.setProperty('--accent', accent);
        root.style.setProperty('--on-accent', inkOnAccent(accent));
      } else {
        root.style.removeProperty('--accent');
        root.style.removeProperty('--on-accent');
      }

      const font = t.font ? FONTS[t.font] : undefined;
      if (font?.stack) {
        if (font.link) ensureFontLink(font.link);
        root.style.setProperty('--font-head', font.stack);
      } else {
        root.style.removeProperty('--font-head');
      }
    };

    apply();
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
      delete root.dataset.bg;
      root.style.removeProperty('--accent');
      root.style.removeProperty('--on-accent');
      root.style.removeProperty('--font-head');
    };
  }, [key]);
}
