import { flushSync } from 'react-dom';

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

interface Options {
  /** Marked with `data-vt` while the transition runs, so per-item view-transition-names apply only then. */
  scope?: HTMLElement | null;
}

/**
 * Runs a state update inside a browser view transition, so what moved animates. Where the browser has
 * no View Transitions (or the visitor prefers reduced motion) the update simply happens at once.
 */
export function withViewTransition(update: () => void, { scope }: Options = {}): void {
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    update();
    return;
  }
  scope?.setAttribute('data-vt', '');
  const transition = document.startViewTransition(() => flushSync(update));
  const done = () => scope?.removeAttribute('data-vt');
  void transition.finished.then(done, done);
}
