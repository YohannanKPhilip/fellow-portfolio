import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RequireAuth } from '../../auth/RequireAuth';
import { useMyFellow } from '../../auth/useMyFellow';
import { Hero } from '../../components/Hero';
import { LoadError, Loading } from '../../components/StatusView';
import { asJson, createMyFellow, SlugTakenError } from '../../data/supabase/me';
import { STARTERS } from '../../lib/hero';
import { pageFromHero } from '../../lib/page';
import { slugFromName, slugProblem } from '../../lib/slug';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import type { Fellow } from '../../types';

/**
 * First sign-in: your name, your page address and a starting layout. Everything else (text, colors,
 * photo) is edited on the page itself right after. The page is saved as a draft.
 */
export function SetupPage() {
  useDocumentTitle('Set up your page');
  return <RequireAuth>{(user) => <Setup userId={user.id} />}</RequireAuth>;
}

function Setup({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const mine = useMyFellow(userId);

  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [slug, setSlug] = useState('');
  // Until edited by hand, the first name and address follow the full name.
  const [firstTouched, setFirstTouched] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [starterId, setStarterId] = useState(STARTERS[0]?.id ?? 'hi');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [slugError, setSlugError] = useState<string>();

  if (mine.state.status === 'loading') return <Loading />;
  if (mine.state.status === 'error') return <LoadError message={mine.state.message} />;
  if (mine.state.fellow) return <Navigate to={`/${mine.state.fellow.slug}/me`} replace />;

  const starter = STARTERS.find((s) => s.id === starterId) ?? STARTERS[0]!;
  const hero = starter.build(name.trim(), firstName.trim());
  const page = pageFromHero(hero.blocks);
  const preview: Fellow = {
    id: slug,
    name,
    firstName: firstName || '?',
    page,
    theme: {},
    school: '',
    city: '',
    cohort: '',
    photoUrl: '',
  };

  const onName = (value: string) => {
    setName(value);
    if (!firstTouched) setFirstName(value.trim().split(/\s+/)[0] ?? '');
    if (!slugTouched) setSlug(slugFromName(value));
  };

  const liveSlugProblem = slug ? slugProblem(slug) : undefined;
  const addressMessage = slugError ?? liveSlugProblem;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = slugProblem(slug);
    if (problem) return setSlugError(problem);
    setBusy(true);
    setError(undefined);
    setSlugError(undefined);
    try {
      await createMyFellow({
        slug,
        name: name.trim(),
        first_name: firstName.trim(),
        page: asJson(page),
        theme: asJson({}),
      });
      // Straight to the page editor, to make it yours.
      navigate(`/${slug}/edit`, { replace: true });
    } catch (err) {
      if (err instanceof SlugTakenError) setSlugError(err.message);
      else setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth auth--narrow">
      <h1 className="auth__title">
        Set up <span className="muted">your page.</span>
      </h1>
      <p className="auth__lede">
        Three quick things. After this you'll edit your page right where it sits: click any text to
        change it, add your photo, and pick colors. It stays hidden until you publish it.
      </p>

      <form className="steps" onSubmit={(e) => void submit(e)}>
        <section className="panel">
          <h2 className="panel__title">About you</h2>
          <div className="form">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                required
                maxLength={80}
                autoComplete="name"
                placeholder="Priya Sharma"
                value={name}
                onChange={(e) => onName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="first">First name</label>
              <input
                id="first"
                required
                maxLength={40}
                placeholder="Priya"
                value={firstName}
                onChange={(e) => {
                  setFirstTouched(true);
                  setFirstName(e.target.value);
                }}
              />
              <p className="form__hint">Used in "More from …" on your resources.</p>
            </div>
            <div className="field">
              <label htmlFor="slug">Page address</label>
              <div className="affix">
                <span aria-hidden="true">…/</span>
                <input
                  id="slug"
                  required
                  maxLength={40}
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="priya-sharma"
                  aria-invalid={Boolean(addressMessage)}
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlugError(undefined);
                    setSlug(e.target.value.toLowerCase());
                  }}
                />
              </div>
              <p className={addressMessage ? 'form__error' : 'form__hint'}>
                {addressMessage ??
                  'Lowercase letters, numbers and hyphens. Changing it later breaks old links.'}
              </p>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2 className="panel__title">Start from</h2>
          <div className="choices" role="radiogroup" aria-label="Starting layout">
            {STARTERS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === starterId}
                aria-pressed={s.id === starterId}
                className="choice"
                onClick={() => setStarterId(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="form__hint">{starter.hint}. You can change every word afterwards.</p>
          <div className="setup__preview" aria-label="Preview">
            <Hero fellow={preview} blocks={hero.blocks} />
          </div>
        </section>

        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}
        <div className="submitbar">
          <button
            type="submit"
            className="button button--accent"
            disabled={busy || !name.trim() || !firstName.trim() || Boolean(liveSlugProblem)}
          >
            {busy ? 'Saving…' : 'Continue to my page'}
          </button>
          <p>Saved as a draft. You publish it when you're ready.</p>
        </div>
      </form>
    </div>
  );
}
