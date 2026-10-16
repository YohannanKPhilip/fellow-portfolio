import { colorClass } from '../lib/hero';
import {
  DEFAULT_RESOURCES_SUBTITLE,
  DEFAULT_RESOURCES_TITLE,
  type ResourcesSection,
} from '../lib/page';
import type { Resource } from '../types';
import { ResourceGrid } from './ResourceGrid';

interface Props {
  section: ResourcesSection;
  /** The resources this section shows, already filtered, sorted and limited. */
  resources: Resource[];
  /** Position among the resources sections on the page. The first one keeps the original ids. */
  index: number;
}

/** A titled set of resource cards: the "Resources from my classroom" part of a page, or a filtered copy of it. */
export function ResourcesSectionView({ section, resources, index }: Props) {
  const title = section.title ?? DEFAULT_RESOURCES_TITLE;
  const subtitle = section.subtitle ?? DEFAULT_RESOURCES_SUBTITLE;
  const titleId = index === 0 ? 'resources-title' : `resources-title-${index}`;
  return (
    <section className="resources" aria-labelledby={title.length ? titleId : undefined}>
      {title.length > 0 && (
        <h2 id={titleId} className="section-title">
          {title.map((run, i) =>
            run.c ? (
              <span key={i} className={colorClass(run.c)}>
                {run.t}
              </span>
            ) : (
              run.t
            ),
          )}
        </h2>
      )}
      {subtitle && <p className="section-sub">{subtitle}</p>}
      <ResourceGrid
        resources={resources}
        showFilters={section.showFilters ?? true}
        paramKey={index === 0 ? 'subject' : `subject-${index}`}
      />
    </section>
  );
}
