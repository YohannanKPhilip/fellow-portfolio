import { useState } from 'react';
import { Link } from 'react-router-dom';
import { imageUrl } from '../lib/links';
import type { Resource } from '../types';
import { Cover } from './Cover';
import { SubjectTag } from './SubjectTag';

const MAX_TAGS = 3;

/**
 * Every card has the same (short) height. A resource with a cover shows it as a slim strip on
 * top and hides the summary; one without a cover shows the summary in that space instead.
 */
export function ResourceCard({ resource }: { resource: Resource }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(imageUrl(resource.coverUrl)) && !coverFailed;
  const { tags } = resource;
  const extra = tags.length - MAX_TAGS;
  return (
    <Link className="card" to={`/${resource.fellowId}/r/${resource.id}`}>
      {showCover && (
        <Cover
          url={resource.coverUrl}
          className="cover cover--card"
          width={700}
          onFail={() => setCoverFailed(true)}
        />
      )}
      <div className="card__content">
        <div className="tagrow">
          <SubjectTag subject={resource.subject} />
          <span className="meta">
            {[resource.grade, resource.length].filter(Boolean).join(' · ')}
          </span>
        </div>
        <h3 className="card__title">{resource.title}</h3>
        {!showCover && <p className="card__summary">{resource.summary}</p>}
        {tags.length > 0 && (
          <ul className="chips" aria-label="Tags">
            {tags.slice(0, MAX_TAGS).map((t) => (
              <li key={t}>{t}</li>
            ))}
            {extra > 0 && <li>+{extra}</li>}
          </ul>
        )}
      </div>
    </Link>
  );
}
