import { Link } from 'react-router-dom';
import type { Resource } from '../types';
import { Cover } from './Cover';
import { SubjectTag } from './SubjectTag';

const MAX_TAGS = 3;

export function ResourceCard({ resource }: { resource: Resource }) {
  const { tags } = resource;
  const extra = tags.length - MAX_TAGS;
  return (
    <Link className="card" to={`/${resource.fellowId}/r/${resource.id}`}>
      <Cover url={resource.coverUrl} className="cover cover--card" width={700} />
      <div className="tagrow">
        <SubjectTag subject={resource.subject} />
        <span className="meta">
          {[resource.grade, resource.length].filter(Boolean).join(' · ')}
        </span>
      </div>
      <h3 className="card__title">{resource.title}</h3>
      <p className="card__summary">{resource.summary}</p>
      {tags.length > 0 && (
        <ul className="chips" aria-label="Tags">
          {tags.slice(0, MAX_TAGS).map((t) => (
            <li key={t}>{t}</li>
          ))}
          {extra > 0 && <li>+{extra}</li>}
        </ul>
      )}
      <span className="card__more">View details →</span>
    </Link>
  );
}
