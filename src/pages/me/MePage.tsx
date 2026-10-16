import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { OwnerGate, type OwnerContext } from '../../auth/OwnerGate';
import { useAuth } from '../../auth/authContext';
import { RequireAuth } from '../../auth/RequireAuth';
import { useMyFellow } from '../../auth/useMyFellow';
import { Avatar } from '../../components/Avatar';
import { ResourceCard } from '../../components/ResourceCard';
import { LoadError, Loading } from '../../components/StatusView';
import { config } from '../../config';
import { summaryToResource } from '../../data/supabase/cardResource';
import { blurhashFor, imageRef } from '../../data/supabase/mappers';
import { setMyFellowStatus } from '../../data/supabase/me';
import type { MyResourceSummary } from '../../data/supabase/resources';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useMyResources } from './useMyResources';

/**
 * /me forwards to the fellow's own address, /<username>/me. New accounts without a page
 * go to /setup first.
 */
export function MeRedirect() {
  return <RequireAuth>{(user) => <Forward userId={user.id} />}</RequireAuth>;
}

function Forward({ userId }: { userId: string }) {
  const mine = useMyFellow(userId);
  if (mine.state.status === 'loading') return <Loading />;
  if (mine.state.status === 'error') return <LoadError message={mine.state.message} />;
  const fellow = mine.state.fellow;
  return <Navigate to={fellow ? `/${fellow.slug}/me` : '/setup'} replace />;
}

/** Signed-in home at /<username>/me. Only the owner can open it; anyone else is sent to their own. */
export function MePage() {
  useDocumentTitle('My page');
  return <OwnerGate>{(ctx) => <Me {...ctx} />}</OwnerGate>;
}

function Me({ userId, email, fellow, setFellow }: OwnerContext) {
  const { signOut } = useAuth();
  const resources = useMyResources(userId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const published = fellow.status === 'published';
  const togglePage = async () => {
    setBusy(true);
    setError(undefined);
    try {
      setFellow(await setMyFellowStatus(userId, published ? 'draft' : 'published'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const base = `/${fellow.slug}`;
  return (
    <div className="auth">
      <div className="me__top">
        <div>
          <h1 className="auth__title">
            Hi, {fellow.first_name}.<span className="auth__line muted">Welcome back.</span>
          </h1>
          <p className="form__hint">Signed in as {email}</p>
        </div>
        <button type="button" className="button button--ghost" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>

      <section className="me__card" aria-label="Your page">
        <div className="me__who">
          <div className="me__photo">
            <Avatar
              name={fellow.first_name}
              photoUrl={imageRef(fellow.photo_path, config.supabaseUrl)}
              blurhash={blurhashFor(fellow.photo_path, fellow.photo_blurhash)}
            />
          </div>
          <div>
            <h2 className="me__name">{fellow.name}</h2>
            <p className="me__addr">…/{fellow.slug}</p>
            <span className={`badge ${published ? 'badge--live' : ''}`}>
              {published ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>
        <div className="form__actions">
          <Link className="button button--accent" to={`${base}/edit`}>
            Edit page
          </Link>
          <Link className="button button--ghost" to={`${base}/settings`}>
            Settings
          </Link>
          {published && (
            <Link className="button button--ghost" to={base}>
              View
            </Link>
          )}
          <button
            type="button"
            className={published ? 'button button--ghost' : 'button button--accent'}
            disabled={busy}
            onClick={() => void togglePage()}
          >
            {busy ? 'Saving…' : published ? 'Unpublish' : 'Publish my page'}
          </button>
        </div>
      </section>
      {error && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}
      {!published && (
        <p className="form__hint">
          Your page is hidden. Visitors see "This page doesn't exist" until you publish it, even for
          resources you've published.
        </p>
      )}

      <div className="me__head">
        <h2 className="me__heading">Your resources</h2>
        <Link className="button button--accent" to={`${base}/r/new/edit`}>
          Add a resource
        </Link>
      </div>
      <Resources fellowSlug={fellow.slug} resources={resources} />
    </div>
  );
}

function Resources({
  fellowSlug,
  resources,
}: {
  fellowSlug: string;
  resources: ReturnType<typeof useMyResources>;
}) {
  const { state } = resources;
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <LoadError message={state.message} />;
  if (state.resources.length === 0) {
    return (
      <div className="me__empty">
        <strong>Nothing here yet</strong>
        <p>Add your first resource: a lesson plan, worksheet or classroom system.</p>
      </div>
    );
  }
  return (
    <div className="grid">
      {state.resources.map((r) => (
        <MyResourceCard key={r.id} resource={r} fellowSlug={fellowSlug} />
      ))}
    </div>
  );
}

/**
 * The same card visitors see. A published card opens the public page; a draft has no public
 * page yet, so it opens the editor. A pencil appears on hover to edit; status (publish,
 * unpublish) lives in the editor.
 */
function MyResourceCard({
  resource: r,
  fellowSlug,
}: {
  resource: MyResourceSummary;
  fellowSlug: string;
}) {
  const published = r.status === 'published';
  const editTo = `/${fellowSlug}/r/${r.slug}/edit`;
  return (
    <div className="mycard">
      <ResourceCard
        resource={summaryToResource(r, fellowSlug)}
        to={published ? `/${fellowSlug}/r/${r.slug}` : editTo}
      />
      {!published && <span className="mycard__draft">Draft</span>}
      <Link className="mycard__edit" to={editTo} aria-label={`Edit ${r.title}`} title="Edit">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Zm9.5-12.5 3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </div>
  );
}
