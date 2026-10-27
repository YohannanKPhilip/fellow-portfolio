import { useEffect, type CSSProperties } from 'react';
import {
  ACCENTS,
  BACKGROUNDS,
  FONTS,
  type AccentName,
  type BackgroundName,
  type BackgroundOption,
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
        <div className="themes" role="group" aria-label="Background">
          {(Object.keys(BACKGROUNDS) as BackgroundName[]).map((b) => {
            const { label, preview } = BACKGROUNDS[b] as BackgroundOption;
            return (
              <button
                key={b}
                type="button"
                className="themetile"
                aria-pressed={(theme.background ?? 'auto') === b}
                style={
                  {
                    '--tile-bg': preview.bg,
                    '--tile-bg2': preview.bg2 ?? preview.bg,
                    '--tile-ink': preview.ink,
                    '--tile-accent': preview.accent,
                  } as CSSProperties
                }
                onClick={() => set({ background: b })}
              >
                <span className="themetile__swatch" aria-hidden="true">
                  <span className="themetile__aa">Aa</span>
                  <span className="themetile__dot" />
                </span>
                <span className="themetile__label">{label}</span>
              </button>
            );
          })}
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
