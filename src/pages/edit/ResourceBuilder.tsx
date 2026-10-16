import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { OwnerGate, type OwnerContext } from '../../auth/OwnerGate';
import { CoverSlot } from '../../components/editor/CoverSlot';
import { InlineText } from '../../components/editor/InlineText';
import { MediaEditor } from '../../components/editor/MediaEditor';
import { LoadError, Loading, NotFoundView } from '../../components/StatusView';
import {
  deleteResource,
  getMyResource,
  ResourceSlugTakenError,
  saveResource,
  setResourceStatus,
} from '../../data/supabase/resources';
import {
  cleanDraft,
  emptyDraft,
  filesFromNames,
  hasErrors,
  LIMITS,
  slugFromTitle,
  SUBJECT_SUGGESTIONS,
  validateDraft,
  type DraftErrors,
  type ResourceDraft,
} from '../../lib/resourceForm';
import { parseTheme } from '../../lib/theme';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useFellowTheme } from '../../lib/useFellowTheme';
import { TagInput } from '../me/editorParts';

/** /<username>/r/<resource>/edit and /<username>/r/new/edit: the real resource page, in edit mode. */
export function ResourceBuilder() {
  useDocumentTitle('Edit resource');
  return <OwnerGate>{(ctx) => <Loader {...ctx} />}</OwnerGate>;
}

function Loader(ctx: OwnerContext) {
  const { resourceId = '' } = useParams();
  const isNew = resourceId === 'new';
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'ready'; draft: ResourceDraft | null }
    | { status: 'error'; message: string }
  >(isNew ? { status: 'ready', draft: emptyDraft() } : { status: 'loading' });

  useEffect(() => {
    if (isNew) {
      setState({ status: 'ready', draft: emptyDraft() });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    getMyResource(ctx.userId, resourceId)
      .then((draft) => !cancelled && setState({ status: 'ready', draft }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      cancelled = true;
    };
  }, [ctx.userId, resourceId, isNew]);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <LoadError message={state.message} />;
  if (!state.draft) return <NotFoundView what="resource" />;
  return <Builder key={resourceId} {...ctx} initial={state.draft} />;
}

const fieldError = (message?: string) =>
  message && (
    <p className="form__error" role="alert">
      {message}
    </p>
  );

/** A character count, shown only once the text is close to its limit so it isn't always in the way. */
const Count = ({ length, max }: { length: number; max: number }) =>
  length > max * 0.8 ? (
    <p className="form__hint">
      {length} / {max}
    </p>
  ) : null;

function Builder({ userId, fellow, initial }: OwnerContext & { initial: ResourceDraft }) {
  const navigate = useNavigate();
  const location = useLocation();
  const base = `/${fellow.slug}`;
  const isNew = !initial.id;

  const [draft, setDraft] = useState<ResourceDraft>(initial);
  const [saved, setSaved] = useState<ResourceDraft>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | undefined>(
    (location.state as { notice?: string } | null)?.notice,
  );
  const [problem, setProblem] = useState<string>();

  // The page shows the fellow's chosen style while editing, as it does for visitors.
  useFellowTheme(parseTheme(fellow.theme));

  const published = saved.status === 'published';
  const dirty = useMemo(
    () => JSON.stringify(cleanDraft(draft)) !== JSON.stringify(cleanDraft(saved)),
    [draft, saved],
  );

  // Warn before a refresh or tab close loses unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof ResourceDraft>(key: K, value: ResourceDraft[K]) => {
    setNotice(undefined);
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const onTitle = (title: string) => {
    setNotice(undefined);
    setDraft((d) => ({ ...d, title, slug: slugTouched ? d.slug : slugFromTitle(title) }));
  };

  const leave = (e: MouseEvent) => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?'))
      e.preventDefault();
  };

  const persist = async (status?: 'published') => {
    const found = validateDraft(draft);
    setErrors(found);
    setProblem(undefined);
    if (hasErrors(found)) {
      setProblem('Some things need fixing before this can be saved. They are marked on the page.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setBusy(true);
    try {
      const result = await saveResource(userId, draft, {
        status,
        previous: saved.id ? saved : undefined,
      });
      setDraft(result);
      setSaved(result);
      const message = status === 'published' ? 'Published. Visitors can see it now.' : 'Saved.';
      setNotice(message);
      if (result.slug !== initial.slug || isNew) {
        navigate(`${base}/r/${result.slug}/edit`, {
          replace: true,
          state: { notice: message },
        });
      }
    } catch (e) {
      if (e instanceof ResourceSlugTakenError) setErrors({ slug: e.message });
      else setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    if (!saved.id) return;
    setBusy(true);
    setProblem(undefined);
    try {
      await setResourceStatus(saved.id, 'draft');
      setSaved((s) => ({ ...s, status: 'draft' }));
      setDraft((d) => ({ ...d, status: 'draft' }));
      setNotice('Unpublished. It is a draft again.');
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!saved.id) return;
    if (!window.confirm(`Delete "${saved.title}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await deleteResource(saved);
      navigate(`${base}/me`, { replace: true });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const status = notice ?? (dirty ? 'Unsaved changes' : isNew ? '' : 'All changes saved');

  return (
    <div className="builder builder--resource">
      <div className="builder__bar" role="toolbar" aria-label="Resource editor">
        <Link className="builder__back" to={`${base}/me`} onClick={leave}>
          ← Back
        </Link>
        <span className={`badge ${published ? 'badge--live' : ''}`}>
          {isNew ? 'New' : published ? 'Published' : 'Draft'}
        </span>
        <span className="builder__status" aria-live="polite">
          {status}
        </span>
        <div className="builder__actions">
          {!isNew && (
            <button
              type="button"
              className="button button--link"
              disabled={busy}
              onClick={() => void remove()}
            >
              Delete
            </button>
          )}
          {published && (
            <Link className="button button--ghost" to={`${base}/r/${saved.slug}`} onClick={leave}>
              View
            </Link>
          )}
          {published ? (
            <>
              <button
                type="button"
                className="button button--ghost"
                disabled={busy}
                onClick={() => void unpublish()}
              >
                Unpublish
              </button>
              <button
                type="button"
                className="button button--accent"
                disabled={busy || !dirty}
                onClick={() => void persist()}
              >
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="button button--ghost"
                disabled={busy}
                onClick={() => void persist()}
              >
                {busy ? 'Saving…' : 'Save draft'}
              </button>
              <button
                type="button"
                className="button button--accent"
                disabled={busy}
                onClick={() => void persist('published')}
              >
                Publish
              </button>
            </>
          )}
        </div>
      </div>

      {problem && (
        <p className="form__error editor__problem" role="alert">
          {problem}
        </p>
      )}

      <article className="detail">
        <div className="detail__body">
          <header className="detail__head">
            <div className="tagrow">
              <input
                className="tag tag--raised tag-input"
                list="subjects"
                aria-label="Subject"
                aria-invalid={Boolean(errors.subject)}
                maxLength={LIMITS.short}
                placeholder="Subject"
                value={draft.subject}
                onChange={(e) => set('subject', e.target.value)}
              />
              <datalist id="subjects">
                {SUBJECT_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <InlineText
              className="detail__title"
              label="Title"
              singleLine
              placeholder="Fractions with rotis"
              maxLength={LIMITS.title}
              invalid={Boolean(errors.title)}
              value={draft.title}
              onChange={onTitle}
            />
            {fieldError(errors.title)}
            <InlineText
              className="detail__lede"
              label="Summary"
              placeholder="One or two sentences. This shows on the card."
              maxLength={LIMITS.summary}
              invalid={Boolean(errors.summary)}
              value={draft.summary}
              onChange={(v) => set('summary', v)}
            />
            <Count length={draft.summary.length} max={LIMITS.summary} />
            {fieldError(errors.summary)}
            <div className="chips-edit">
              <TagInput tags={draft.tags} onChange={(tags) => set('tags', tags)} />
              <p className="form__hint">Press Enter to add a tag.</p>
            </div>
          </header>

          <section className="detail__coveredit" aria-label="Cover picture">
            <CoverSlot
              userId={userId}
              value={draft.coverPath}
              blurhash={draft.coverBlurhash}
              consent={draft.coverConsent}
              error={errors.cover}
              onChange={(path, blurhash) => {
                set('coverPath', path);
                set('coverBlurhash', blurhash);
              }}
              onConsent={(v) => set('coverConsent', v)}
              onError={setProblem}
            />
          </section>

          <section className="panel detail__desc">
            <h2 className="panel__title">Description</h2>
            <InlineText
              className="detail__desctext"
              label="Description"
              placeholder="What is it, how do you use it, and what do students do?"
              maxLength={LIMITS.description}
              invalid={Boolean(errors.description)}
              value={draft.description}
              onChange={(v) => set('description', v)}
            />
            <Count length={draft.description.length} max={LIMITS.description} />
            {fieldError(errors.description)}
          </section>

          <section className="panel detail__media detail__media--edit">
            <h2 className="panel__title">In the classroom</h2>
            <MediaEditor
              userId={userId}
              media={draft.media}
              error={errors.media}
              onChange={(media) => set('media', media)}
              onError={setProblem}
            />
          </section>

          <aside className="detail__side">
            <section className="panel">
              <h2 className="panel__title">Use this resource</h2>
              <div className="field">
                <label htmlFor="drive">Google Drive link</label>
                <input
                  id="drive"
                  inputMode="url"
                  placeholder="https://drive.google.com/…"
                  aria-invalid={Boolean(errors.driveLink)}
                  value={draft.driveLink}
                  onChange={(e) => set('driveLink', e.target.value)}
                />
                <p className="form__hint">Set sharing to "anyone with the link can view".</p>
                {fieldError(errors.driveLink)}
              </div>
              <h3 className="panel__sub">What's inside</h3>
              <div className="chips-edit">
                <TagInput
                  pills
                  id="inside"
                  label="What's inside"
                  noun="item"
                  max={LIMITS.files}
                  maxLength={LIMITS.fileTag}
                  tags={draft.files.map((f) => f.name)}
                  onChange={(names) => set('files', filesFromNames(names, draft.files))}
                />
                <p className="form__hint">For example: Lesson plan, Worksheet. Press Enter.</p>
              </div>
              {fieldError(errors.files)}
            </section>
            <section className="panel">
              <h2 className="panel__title">Details</h2>
              <dl className="facts">
                <div className="fact">
                  <dt>
                    <label htmlFor="grade">Grade</label>
                  </dt>
                  <dd>
                    <input
                      id="grade"
                      maxLength={LIMITS.short}
                      placeholder="Grade 5"
                      value={draft.grade}
                      onChange={(e) => set('grade', e.target.value)}
                    />
                  </dd>
                </div>
                <div className="fact">
                  <dt>Subject</dt>
                  <dd>{draft.subject || '—'}</dd>
                </div>
                <div className="fact">
                  <dt>
                    <label htmlFor="length">Length</label>
                  </dt>
                  <dd>
                    <input
                      id="length"
                      maxLength={LIMITS.short}
                      placeholder="45 min"
                      value={draft.length}
                      onChange={(e) => set('length', e.target.value)}
                    />
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>

        <details className="builder__address" open={Boolean(errors.slug) || undefined}>
          <summary>Advanced: page address</summary>
          <div className="field">
            <div className="affix">
              <span aria-hidden="true">…/{fellow.slug}/r/</span>
              <input
                id="slug"
                aria-label="Page address"
                maxLength={LIMITS.slug}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(errors.slug)}
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', e.target.value.toLowerCase());
                }}
              />
            </div>
            <p className="form__hint">
              Made from the title.{' '}
              {isNew ? '' : 'Changing it breaks links you have already shared.'}
            </p>
            {fieldError(errors.slug)}
          </div>
        </details>
      </article>
    </div>
  );
}
