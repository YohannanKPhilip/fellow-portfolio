import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { OwnerGate } from '../../auth/OwnerGate';
import { HeroEditor } from '../../components/editor/HeroEditor';
import { LinksSectionEditor } from '../../components/editor/LinksSectionEditor';
import { ResourcesSectionEditor } from '../../components/editor/ResourcesSectionEditor';
import { StylePanel } from '../../components/editor/StylePanel';
import { config } from '../../config';
import { summaryToResource } from '../../data/supabase/cardResource';
import { blurhashFor, imageRef } from '../../data/supabase/mappers';
import { asJson, updateMyFellow, type MyFellow } from '../../data/supabase/me';
import { removeImages } from '../../data/supabase/storage';
import { defaultHero, heroProblem } from '../../lib/hero';
import {
  collectValues,
  defaultLinksSection,
  defaultPage,
  defaultResourcesSection,
  duplicateSection,
  heroSectionOf,
  insertSection,
  moveSection,
  newSectionId,
  pageImages,
  pageProblem,
  parsePage,
  removeSection,
  sectionResources,
  updateSection,
  type PageDoc,
  type Section,
} from '../../lib/page';
import { withViewTransition } from '../../lib/motion';
import type { Theme } from '../../lib/theme';
import { parseTheme } from '../../lib/theme';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useFellowTheme } from '../../lib/useFellowTheme';
import { useMyResources } from '../me/useMyResources';

/** /<username>/edit: the fellow's real page in edit mode. Add, move and remove sections; edit the top in place. */
export function PageBuilder() {
  useDocumentTitle('Edit my page');
  return (
    <OwnerGate>{({ userId, fellow }) => <Builder userId={userId} fellow={fellow} />}</OwnerGate>
  );
}

interface Draft {
  page: PageDoc;
  theme: Theme;
  /** The photo shown in the top section: an uploaded path, an outside link, or empty. */
  photo: string;
  /** The blurhash that goes with `photo` ('' for a link or no photo). */
  photoBlurhash: string;
}

const toDraft = (f: MyFellow): Draft => ({
  page: parsePage(f.page) ?? defaultPage(f.first_name),
  theme: parseTheme(f.theme),
  photo: f.photo_path ?? '',
  photoBlurhash: blurhashFor(f.photo_path, f.photo_blurhash),
});

const LABEL: Record<Section['type'], string> = {
  hero: 'Top of page',
  resources: 'Resources',
  links: 'Links',
};

function Builder({ userId, fellow }: { userId: string; fellow: MyFellow }) {
  const initial = useMemo(() => toDraft(fellow), [fellow]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [styleOpen, setStyleOpen] = useState(false);
  // The resources section whose settings panel is open, if any.
  const [openSettings, setOpenSettings] = useState<string | null>(null);
  // Pictures uploaded in this visit, so ones that end up unused can be cleaned up.
  const uploaded = useRef<string[]>([]);
  // The sections' container: marked while a section moves, so each one animates to its new place.
  const pageRef = useRef<HTMLDivElement>(null);
  const mine = useMyResources(userId);

  // The whole page shows the chosen style while editing.
  useFellowTheme(draft.theme);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const setPage = (page: PageDoc) => {
    setNotice(undefined);
    setDraft((d) => ({ ...d, page }));
  };
  /** Adding, moving, copying and removing sections change the page's layout, so they animate. */
  const rearrange = (page: PageDoc) =>
    withViewTransition(() => setPage(page), { scope: pageRef.current });

  // The resources a visitor would see: published ones, oldest first.
  const published = useMemo(
    () =>
      mine.state.status === 'ready'
        ? mine.state.resources
            .filter((r) => r.status === 'published')
            .sort((a, b) => (a.published_at ?? '').localeCompare(b.published_at ?? ''))
            .map((r) => summaryToResource(r, fellow.slug))
        : [],
    [mine.state, fellow.slug],
  );

  // The fellow's own subjects and tags (drafts included), offered as filter choices.
  const { subjects, tags } = useMemo(() => {
    const all = mine.state.status === 'ready' ? mine.state.resources : [];
    return {
      subjects: collectValues(all.map((r) => r.subject)),
      tags: collectValues(all.flatMap((r) => r.tags)),
    };
  }, [mine.state]);

  const patchSection = (section: Section) => {
    setNotice(undefined);
    setDraft((d) => ({ ...d, page: updateSection(d.page, section) }));
  };

  const base = `/${fellow.slug}`;
  const leave = (e: MouseEvent) => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?'))
      e.preventDefault();
  };

  const save = async () => {
    setProblem(undefined);
    const hero = heroSectionOf(draft.page);
    const issue = (hero && heroProblem({ v: 1, blocks: hero.blocks })) || pageProblem(draft.page);
    if (issue) return setProblem(issue);
    setBusy(true);
    try {
      await updateMyFellow(userId, {
        page: asJson(draft.page),
        theme: asJson(draft.theme),
        photo_path: draft.photo.trim() || null,
        photo_blurhash: blurhashFor(draft.photo.trim(), draft.photoBlurhash) || null,
      });
      // Pictures that were replaced or never used are no longer needed.
      const inUse = new Set([draft.photo, ...pageImages(draft.page)]);
      await removeImages([
        ...uploaded.current.filter((p) => !inUse.has(p)),
        saved.photo !== draft.photo ? saved.photo : undefined,
        ...pageImages(saved.page).filter((p) => !inUse.has(p)),
      ]);
      uploaded.current = [];
      setSaved(draft);
      setNotice(fellow.status === 'published' ? 'Saved. Your page is updated.' : 'Saved.');
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const discard = () => {
    if (window.confirm('Discard your changes?')) setDraft(saved);
  };

  let resourcesIndex = 0;
  const hasHero = Boolean(heroSectionOf(draft.page));
  const addSection = (type: Section['type'], afterId?: string) => {
    const section: Section =
      type === 'hero'
        ? { id: newSectionId(), type: 'hero', blocks: defaultHero(fellow.first_name).blocks }
        : type === 'links'
          ? defaultLinksSection(newSectionId())
          : defaultResourcesSection(newSectionId());
    rearrange(insertSection(draft.page, section, afterId));
  };

  return (
    <div className="builder">
      <div className="builder__bar" role="toolbar" aria-label="Page editor">
        <Link viewTransition className="builder__back" to={`${base}/me`} onClick={leave}>
          ← Back
        </Link>
        <span className="builder__status" aria-live="polite">
          <span key={notice ?? String(dirty)} className="fade">
            {notice ?? (dirty ? 'Unsaved changes' : 'All changes saved')}
          </span>
        </span>
        <div className="builder__actions">
          <button
            type="button"
            className="button button--ghost"
            aria-expanded={styleOpen}
            onClick={() => setStyleOpen((o) => !o)}
          >
            Style
          </button>
          <Link
            viewTransition
            className="button button--ghost"
            to={`${base}/settings`}
            onClick={leave}
          >
            Settings
          </Link>
          {dirty && (
            <button
              type="button"
              className="button button--ghost"
              disabled={busy}
              onClick={discard}
            >
              Discard
            </button>
          )}
          <button
            type="button"
            className="button button--accent"
            disabled={busy || !dirty}
            onClick={() => void save()}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {styleOpen && (
        <section className="panel builder__style" aria-label="Page style">
          <h2 className="panel__title">Page style</h2>
          <StylePanel
            theme={draft.theme}
            onChange={(patch) =>
              withViewTransition(() => setDraft((d) => ({ ...d, theme: { ...d.theme, ...patch } })))
            }
          />
        </section>
      )}

      {problem && (
        <p className="form__error editor__problem" role="alert">
          {problem}
        </p>
      )}

      <div className="builder__page" ref={pageRef}>
        <AddSection hasHero={hasHero} onAdd={(type) => addSection(type)} />
        {draft.page.sections.map((section, i) => {
          const count = draft.page.sections.length;
          let body: ReactNode;
          if (section.type === 'hero') {
            body = (
              <section className="hero pageeditor__hero" aria-label="Top of your page">
                <HeroEditor
                  hero={{ v: 1, blocks: section.blocks }}
                  userId={userId}
                  photo={draft.photo}
                  photoUrl={imageRef(draft.photo, config.supabaseUrl)}
                  photoBlurhash={draft.photoBlurhash}
                  initial={fellow.first_name.charAt(0).toUpperCase() || '?'}
                  onPhotoChange={(photo, photoBlurhash) => {
                    if (photo) uploaded.current.push(photo);
                    setNotice(undefined);
                    setDraft((d) => ({ ...d, photo, photoBlurhash }));
                  }}
                  onChange={(hero) =>
                    setPage(updateSection(draft.page, { ...section, blocks: hero.blocks }))
                  }
                />
              </section>
            );
          } else if (section.type === 'links') {
            body = (
              <LinksSectionEditor
                userId={userId}
                section={section}
                onChange={patchSection}
                onUploaded={(path) => uploaded.current.push(path)}
              />
            );
          } else {
            body = (
              <ResourcesSectionEditor
                section={section}
                resources={sectionResources(section, published)}
                index={resourcesIndex++}
                subjects={subjects}
                tags={tags}
                settingsOpen={openSettings === section.id}
                resourcesTo={`${base}/me`}
                onChange={patchSection}
              />
            );
          }
          return (
            <div
              key={section.id}
              style={
                { '--vt-name': `section-${section.id.replace(/[^\w-]/g, '')}` } as CSSProperties
              }
            >
              <SectionFrame
                label={LABEL[section.type]}
                canMoveUp={i > 0}
                canMoveDown={i < count - 1}
                canDuplicate={section.type !== 'hero'}
                canDelete={count > 1}
                canSettings={section.type === 'resources'}
                settingsOpen={openSettings === section.id}
                onSettings={() => setOpenSettings((id) => (id === section.id ? null : section.id))}
                onMove={(by) => rearrange(moveSection(draft.page, section.id, by))}
                onDuplicate={() => rearrange(duplicateSection(draft.page, section.id))}
                onDelete={() => {
                  if (window.confirm(`Remove this ${LABEL[section.type].toLowerCase()} section?`)) {
                    rearrange(removeSection(draft.page, section.id));
                  }
                }}
              >
                {body}
              </SectionFrame>
              <AddSection hasHero={hasHero} onAdd={(type) => addSection(type, section.id)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A section with a small bar to move, copy or remove it. Shown on hover, focus, and always on touch screens. */
function SectionFrame({
  label,
  canMoveUp,
  canMoveDown,
  canDuplicate,
  canDelete,
  canSettings,
  settingsOpen,
  onSettings,
  onMove,
  onDuplicate,
  onDelete,
  children,
}: {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDuplicate: boolean;
  canDelete: boolean;
  canSettings: boolean;
  settingsOpen: boolean;
  onSettings: () => void;
  onMove: (by: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  return (
    <div className="sectionframe">
      <div className="sectionbar" role="toolbar" aria-label={`${label} section`}>
        <span className="sectionbar__label">{label}</span>
        {canSettings && (
          <button
            type="button"
            className="sectionbar__settings"
            aria-label="Section settings"
            aria-expanded={settingsOpen}
            title="What this section shows"
            onClick={onSettings}
          >
            ⚙
          </button>
        )}
        <button type="button" aria-label="Move up" disabled={!canMoveUp} onClick={() => onMove(-1)}>
          ↑
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={!canMoveDown}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
        {canDuplicate && (
          <button
            type="button"
            aria-label="Duplicate section"
            title="Duplicate"
            onClick={onDuplicate}
          >
            ⧉
          </button>
        )}
        <button
          type="button"
          aria-label="Remove section"
          title="Remove"
          disabled={!canDelete}
          onClick={onDelete}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

/** The "+ Add section" line between sections. */
function AddSection({
  hasHero,
  onAdd,
}: {
  hasHero: boolean;
  onAdd: (type: Section['type']) => void;
}) {
  const [open, setOpen] = useState(false);
  const pick = (type: Section['type']) => {
    setOpen(false);
    onAdd(type);
  };
  return (
    <div className="addline">
      <button
        type="button"
        className="addline__btn"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        + Add section
      </button>
      {open && (
        <div className="addmenu" role="menu">
          <button type="button" role="menuitem" onClick={() => pick('resources')}>
            <strong>Resources</strong>
            <span>Cards for your resources. Later you can show only some of them.</span>
          </button>
          <button type="button" role="menuitem" onClick={() => pick('links')}>
            <strong>Links</strong>
            <span>A set of links to anything on the web: videos, a blog, a form.</span>
          </button>
          {!hasHero && (
            <button type="button" role="menuitem" onClick={() => pick('hero')}>
              <strong>Top of page</strong>
              <span>Your headline, photo and intro.</span>
            </button>
          )}
          <button type="button" className="addmenu__close" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
