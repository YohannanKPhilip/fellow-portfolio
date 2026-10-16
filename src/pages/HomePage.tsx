import { Link } from 'react-router-dom';
import { config } from '../config';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export function HomePage() {
  useDocumentTitle();
  return (
    <div className="status">
      <h1 className="status__title">{config.siteName}</h1>
      <p className="status__text">
        A sharing space for TFI fellows. Sign in to build your page and share your resources.
      </p>
      {config.dataSource === 'supabase' && (
        <Link className="button button--accent" to="/login">
          Sign in / Log in
        </Link>
      )}
    </div>
  );
}
