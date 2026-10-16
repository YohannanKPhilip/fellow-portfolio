import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  DEFAULT_RESOURCES_SUBTITLE,
  DEFAULT_RESOURCES_TITLE,
  LIMIT_OPTIONS,
  PAGE_LIMITS,
  describeFilter,
  setLimit,
  toggleFilterValue,
  type ResourcesSection,
} from '../../lib/page';
import type { Resource } from '../../types';
import { ResourceGrid } from '../ResourceGrid';
import { TitleEditor } from './TitleEditor';

interface Props {
  section: ResourcesSection;
  /** The resources this section shows right now (filtered, sorted, limited). */
  resources: Resource[];
  /** Position among the resources sections. The first keeps the original ids. */
  index: number;
  /** The fellow's own subjects and tags, offered as filter choices. */
  subjects: string[];
  tags: string[];
  settingsOpen: boolean;
  /** Where the fellow's own list of resources is, for the empty-section hint. */
  resourcesTo: string;
  onChange: (section: ResourcesSection) => void;
}

/** A resources section in edit mode: edit its heading and description, and choose what it shows. */
export function ResourcesSectionEditor({
  section,
  resources,
  index,
  subjects,
  tags,
  settingsOpen,
  resourcesTo,
  onChange,
}: Props) {
  const title = section.title ?? DEFAULT_RESOURCES_TITLE;
  const subtitle = section.subtitle ?? DEFAULT_RESOURCES_SUBTITLE;
  return (
    <section className="resources resources--editing">
      <TitleEditor
        runs={title}
        label="Section heading. Click to edit."
        onChange={(runs) => onChange({ ...section, title: runs })}
      />
      <SubtitleField
        value={subtitle}
        onChange={(value) => onChange({ ...section, subtitle: value })}
      />
      <p className="resources__summary">
        Showing: {describeFilter(section)} · {resources.length}{' '}
        {resources.length === 1 ? 'resource' : 'resources'}.
      </p>
      {settingsOpen && (
        <SectionSettings
          section={section}
          subjects={subjects}
          tags={tags}
          count={resources.length}
          onChange={onChange}
        />
      )}
      {resources.length === 0 ? (
        <div className="me__empty">
          <strong>Your resources will appear here</strong>
          <p>
            Cards show up as you publish resources. You add and edit them from{' '}
            <Link to={resourcesTo}>your resources</Link>, then come back to arrange this page.
          </p>
        </div>
      ) : (
        <ResourceGrid
          resources={resources}
          showFilters={section.showFilters ?? true}
          paramKey={index === 0 ? 'subject' : `subject-${index}`}
          // Cards are a preview here: this edits the page, not the resources.
          cardTo={() => null}
        />
      )}
    </section>
  );
}

/** The short line under a heading, edited in place. Grows with its text. */
function SubtitleField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="section-sub section-sub--edit"
      rows={1}
      maxLength={PAGE_LIMITS.subtitle}
      aria-label="Short description under the heading (optional)"
      placeholder="Add a short description (optional)"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
    />
  );
}

function SectionSettings({
  section,
  subjects,
  tags,
  count,
  onChange,
}: {
  section: ResourcesSection;
  subjects: string[];
  tags: string[];
  count: number;
  onChange: (section: ResourcesSection) => void;
}) {
  const picked = (key: 'subjects' | 'tags') =>
    (section.filter?.[key] ?? []).map((v) => v.toLowerCase());
  // Show filter values that no longer match any resource too, so they can be switched off.
  const withPicked = (all: string[], key: 'subjects' | 'tags') => {
    const known = new Set(all.map((v) => v.toLowerCase()));
    return [...all, ...(section.filter?.[key] ?? []).filter((v) => !known.has(v.toLowerCase()))];
  };
  const subjectChoices = withPicked(subjects, 'subjects');
  const tagChoices = withPicked(tags, 'tags');
  const limit = section.limit ?? null;
  const limitChoices = [...new Set<number>([...LIMIT_OPTIONS, ...(limit ? [limit] : [])])].sort(
    (a, b) => a - b,
  );

  return (
    <div className="sectionsettings panel" role="group" aria-label="What this section shows">
      <h3 className="panel__title">What this section shows</h3>
      <div className="form">
        <div className="field">
          <span className="field__label">Subjects</span>
          {subjectChoices.length ? (
            <div className="choices">
              {subjectChoices.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="choice"
                  aria-pressed={picked('subjects').includes(s.toLowerCase())}
                  onClick={() => onChange(toggleFilterValue(section, 'subjects', s))}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <p className="form__hint">Add a resource with a subject and it will appear here.</p>
          )}
          <p className="form__hint">
            Pick subjects to show only those. Pick none to show every subject.
          </p>
        </div>

        {tagChoices.length > 0 && (
          <div className="field">
            <span className="field__label">Tags</span>
            <div className="choices">
              {tagChoices.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="choice"
                  aria-pressed={picked('tags').includes(t.toLowerCase())}
                  onClick={() => onChange(toggleFilterValue(section, 'tags', t))}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="form__hint">
              With a subject and a tag both picked, only resources with both show.
            </p>
          </div>
        )}

        <div className="field">
          <span className="field__label">Order</span>
          <div className="choices" role="group" aria-label="Order">
            {(['oldest', 'newest'] as const).map((o) => (
              <button
                key={o}
                type="button"
                className="choice"
                aria-pressed={(section.sort ?? 'oldest') === o}
                onClick={() => onChange({ ...section, sort: o })}
              >
                {o === 'oldest' ? 'Oldest first' : 'Newest first'}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`limit-${section.id}`}>
            Show at most
          </label>
          <select
            id={`limit-${section.id}`}
            value={limit ?? ''}
            onChange={(e) =>
              onChange(setLimit(section, e.target.value ? Number(e.target.value) : null))
            }
          >
            <option value="">All of them</option>
            {limitChoices.map((n) => (
              <option key={n} value={n}>
                {n} resources
              </option>
            ))}
          </select>
        </div>

        <label className="consent" htmlFor={`filters-${section.id}`}>
          <input
            id={`filters-${section.id}`}
            type="checkbox"
            checked={section.showFilters ?? true}
            onChange={(e) => onChange({ ...section, showFilters: e.target.checked })}
          />
          <span>Show subject buttons above the cards (when there is more than one subject)</span>
        </label>

        <p className="form__hint">
          Showing {count} now. Draft resources appear here once you publish them.
        </p>
      </div>
    </div>
  );
}
