import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OwnerGate, type OwnerContext } from '../../auth/OwnerGate';
import { useAuth } from '../../auth/authContext';
import { SlugTakenError, setMyFellowStatus, updateMyFellow } from '../../data/supabase/me';
import { slugProblem } from '../../lib/slug';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

/** /<username>/settings: details, visibility and account. The page itself is edited at /<username>/edit. */
export function SettingsPage() {
  useDocumentTitle('Settings');
  return <OwnerGate>{(ctx) => <Settings {...ctx} />}</OwnerGate>;
}

function Settings({ userId, email, fellow, setFellow }: OwnerContext) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const base = `/${fellow.slug}`;

  const initial = {
    name: fellow.name,
    firstName: fellow.first_name,
    slug: fellow.slug,
    school: fellow.school ?? '',
    city: fellow.city ?? '',
    cohort: fellow.cohort ?? '',
  };
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [slugError, setSlugError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [visibilityBusy, setVisibilityBusy] = useState(false);

  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) => {
    setNotice(undefined);
    setV((old) => ({ ...old, [key]: value }));
  };
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  const liveSlugProblem = v.slug ? slugProblem(v.slug) : undefined;
  const addressMessage = slugError ?? liveSlugProblem;

  const save = async () => {
    setError(undefined);
    setSlugError(undefined);
    const problem = slugProblem(v.slug);
    if (problem) return setSlugError(problem);
    if (
      v.slug !== fellow.slug &&
      !window.confirm(
        'Changing your page address breaks links people already have to your page and resources. Change it anyway?',
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const saved = await updateMyFellow(userId, {
        slug: v.slug,
        name: v.name.trim(),
        first_name: v.firstName.trim(),
        school: v.school.trim() || null,
        city: v.city.trim() || null,
        cohort: v.cohort.trim() || null,
      });
      setFellow(saved);
      setNotice('Saved.');
      // The address may have changed, so continue under the new one.
      if (saved.slug !== fellow.slug) navigate(`/${saved.slug}/settings`, { replace: true });
    } catch (e) {
      if (e instanceof SlugTakenError) setSlugError(e.message);
      else setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const published = fellow.status === 'published';
  const toggleVisibility = async () => {
    setVisibilityBusy(true);
    setError(undefined);
    try {
      setFellow(await setMyFellowStatus(userId, published ? 'draft' : 'published'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setVisibilityBusy(false);
    }
  };

  return (
    <div className="auth auth--narrow">
      <Link viewTransition className="back" to={`${base}/me`}>
        ← My page
      </Link>
      <h1 className="auth__title">
        Settings<span className="auth__line muted">for your page.</span>
      </h1>
      <p className="auth__lede">
        Your headline, photo, colors and sections are edited on the page itself.{' '}
        <Link to={`${base}/edit`}>Edit your page</Link>
      </p>

      <div className="steps">
        <section className="panel">
          <h2 className="panel__title">Details</h2>
          <div className="form">
            <div className="field--pair field">
              <div>
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  maxLength={80}
                  autoComplete="name"
                  value={v.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="first">First name</label>
                <input
                  id="first"
                  maxLength={40}
                  value={v.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                />
              </div>
            </div>
            <p className="form__hint">The first name shows in "More from …" on your resources.</p>
            <div className="field">
              <label htmlFor="slug">Page address</label>
              <div className="affix">
                <span aria-hidden="true">…/</span>
                <input
                  id="slug"
                  maxLength={40}
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={Boolean(addressMessage)}
                  value={v.slug}
                  onChange={(e) => {
                    setSlugError(undefined);
                    set('slug', e.target.value.toLowerCase());
                  }}
                />
              </div>
              <p className={addressMessage ? 'form__error' : 'form__hint'}>
                {addressMessage ??
                  'Lowercase letters, numbers and hyphens. Changing it breaks links you have already shared.'}
              </p>
            </div>
            <div className="field">
              <label htmlFor="school">School</label>
              <input
                id="school"
                maxLength={120}
                value={v.school}
                onChange={(e) => set('school', e.target.value)}
              />
            </div>
            <div className="field--pair field">
              <div>
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  maxLength={80}
                  value={v.city}
                  onChange={(e) => set('city', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="cohort">Cohort</label>
                <input
                  id="cohort"
                  maxLength={40}
                  placeholder="2026"
                  value={v.cohort}
                  onChange={(e) => set('cohort', e.target.value)}
                />
              </div>
            </div>
            {error && (
              <p className="form__error" role="alert">
                {error}
              </p>
            )}
            <div className="form__actions">
              <button
                type="button"
                className="button button--accent"
                disabled={
                  busy ||
                  !dirty ||
                  !v.name.trim() ||
                  !v.firstName.trim() ||
                  Boolean(liveSlugProblem)
                }
                onClick={() => void save()}
              >
                {busy ? 'Saving…' : 'Save details'}
              </button>
              {notice && <span className="form__hint">{notice}</span>}
            </div>
          </div>
        </section>

        <section className="panel">
          <h2 className="panel__title">Visibility</h2>
          <p className="form__hint">
            {published
              ? 'Your page is published. Anyone with the link can see it.'
              : 'Your page is hidden. Visitors see "This page doesn\'t exist" until you publish it, even for resources you\'ve published.'}
          </p>
          <div className="form__actions">
            <button
              type="button"
              className={published ? 'button button--ghost' : 'button button--accent'}
              disabled={visibilityBusy}
              onClick={() => void toggleVisibility()}
            >
              {visibilityBusy ? 'Saving…' : published ? 'Unpublish my page' : 'Publish my page'}
            </button>
            {published && (
              <Link viewTransition className="button button--ghost" to={base}>
                View my page
              </Link>
            )}
          </div>
        </section>

        <section className="panel">
          <h2 className="panel__title">Account</h2>
          <p className="form__hint">Signed in as {email}.</p>
          <div className="form__actions">
            <button type="button" className="button button--ghost" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
