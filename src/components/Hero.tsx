import type { Fellow } from '../types';
import { Avatar } from './Avatar';

export function Hero({ fellow }: { fellow: Fellow }) {
  return (
    <section className="hero">
      <h1 className="hero__title">
        <span className="hero__line">
          Hi, I'm <Avatar name={fellow.firstName} photoUrl={fellow.photoUrl} /> {fellow.firstName}!
        </span>
        {fellow.headlineRole && (
          <span className="hero__line">
            <span className="muted">I'm a</span> {fellow.headlineRole}
            {fellow.headlineHighlight && <span className="muted"> &amp;</span>}
          </span>
        )}
        {fellow.headlineHighlight && (
          <span className="hero__line">
            <span className="accent">{fellow.headlineHighlight}.</span>
            {fellow.statusText && (
              <span className="pill">
                <span className="pill__dot" />
                {fellow.statusText}
              </span>
            )}
          </span>
        )}
      </h1>
      {fellow.intro && <p className="hero__intro">{fellow.intro}</p>}
    </section>
  );
}
