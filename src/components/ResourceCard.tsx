import { Link } from 'react-router-dom';
import type { Resource } from '../types';
import { SubjectTag } from './SubjectTag';

const MAX_CHIPS = 4;

/** Short label for a file chip: drops anything in brackets. */
const chipLabel = (name: string) => name.replace(/\s*\(.*\)\s*$/, '');

export function ResourceCard({ resource }: { resource: Resource }) {
  const { files } = resource;
  const extra = files.length - MAX_CHIPS;
  return (
    <Link className="card" to={`/${resource.fellowId}/r/${resource.id}`}>
      <div className="tagrow">
        <SubjectTag subject={resource.subject} />
        <span className="meta">
          {[resource.board, resource.chapter].filter(Boolean).join(' · ')}
        </span>
      </div>
      <h3 className="card__title">{resource.title}</h3>
      <p className="card__summary">{resource.summary}</p>
      {files.length > 0 && (
        <ul className="chips" aria-label="What's inside">
          {files.slice(0, MAX_CHIPS).map((f) => (
            <li key={f.name}>{chipLabel(f.name)}</li>
          ))}
          {extra > 0 && <li>+{extra} more</li>}
        </ul>
      )}
      <span className="card__more">View details →</span>
    </Link>
  );
}
