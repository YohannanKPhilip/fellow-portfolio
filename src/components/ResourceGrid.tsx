import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Resource } from '../types';
import { ResourceCard } from './ResourceCard';

/** Subject filter + card grid. The chosen subject lives in the URL (?subject=EVS) so it can be shared. */
export function ResourceGrid({ resources }: { resources: Resource[] }) {
  const [params, setParams] = useSearchParams();
  const subjects = useMemo(() => [...new Set(resources.map((r) => r.subject))], [resources]);
  const requested = params.get('subject');
  const active = requested && subjects.includes(requested) ? requested : 'all';
  const shown = active === 'all' ? resources : resources.filter((r) => r.subject === active);

  const choose = (subject: string) => {
    const next = new URLSearchParams(params);
    if (subject === 'all') next.delete('subject');
    else next.set('subject', subject);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  if (resources.length === 0) {
    return <p className="empty">No resources published yet.</p>;
  }

  return (
    <>
      {subjects.length > 1 && (
        <div className="filters" role="group" aria-label="Filter by subject">
          {['all', ...subjects].map((s) => (
            <button key={s} type="button" aria-pressed={active === s} onClick={() => choose(s)}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      )}
      <div className="grid">
        {shown.map((r) => (
          <ResourceCard key={r.id} resource={r} />
        ))}
      </div>
    </>
  );
}
