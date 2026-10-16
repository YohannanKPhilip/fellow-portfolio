import { Link } from 'react-router-dom';

export function Loading() {
  return (
    <div className="status" aria-busy="true" aria-live="polite">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
      <span className="visually-hidden">Loading resources</span>
    </div>
  );
}

export function LoadError({ message }: { message: string }) {
  return (
    <div className="status">
      <h1 className="status__title">The resources couldn't load.</h1>
      <p className="status__text">{message}</p>
      <button type="button" className="button" onClick={() => window.location.reload()}>
        Try again
      </button>
    </div>
  );
}

export function NotFoundView({ what = 'page' }: { what?: string }) {
  return (
    <div className="status">
      <h1 className="status__title">This {what} doesn't exist.</h1>
      <p className="status__text">It may have been renamed or not published yet.</p>
      <Link className="button" to="/">
        Go to the home page
      </Link>
    </div>
  );
}
