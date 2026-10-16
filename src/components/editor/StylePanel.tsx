import { useEffect } from 'react';
import {
  ACCENTS,
  BACKGROUNDS,
  FONTS,
  type AccentName,
  type BackgroundName,
  type FontName,
  type Theme,
} from '../../lib/theme';
import { loadFonts } from '../../lib/useFellowTheme';

/** Accent color, background and headline font: fixed choices that restyle the whole page as you pick them. */
export function StylePanel({
  theme,
  onChange,
}: {
  theme: Theme;
  /** Called with only the choice that changed, so quick successive clicks never overwrite each other. */
  onChange: (patch: Theme) => void;
}) {
  // So each font choice can be shown in its own typeface.
  useEffect(() => loadFonts(), []);
  const set = onChange;

  return (
    <div className="form">
      <div className="field">
        <span className="field__label">Accent color</span>
        <div className="choices" role="group" aria-label="Accent color">
          {(Object.keys(ACCENTS) as AccentName[]).map((a) => (
            <button
              key={a}
              type="button"
              className="choice choice--dot"
              aria-pressed={(theme.accent ?? 'orange') === a}
              aria-label={ACCENTS[a].label}
              title={ACCENTS[a].label}
              style={{ ['--dot' as string]: ACCENTS[a].light }}
              onClick={() => set({ accent: a })}
            />
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field__label">Background</span>
        <div className="choices" role="group" aria-label="Background">
          {(Object.keys(BACKGROUNDS) as BackgroundName[]).map((b) => (
            <button
              key={b}
              type="button"
              className="choice"
              aria-pressed={(theme.background ?? 'auto') === b}
              onClick={() => set({ background: b })}
            >
              {BACKGROUNDS[b].label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field__label">Headline font</span>
        <div className="choices" role="group" aria-label="Headline font">
          {(Object.keys(FONTS) as FontName[]).map((f) => (
            <button
              key={f}
              type="button"
              className="choice choice--font"
              aria-pressed={(theme.font ?? 'modern') === f}
              style={{ fontFamily: FONTS[f].stack ?? 'var(--font)' }}
              onClick={() => set({ font: f })}
            >
              {FONTS[f].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
