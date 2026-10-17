import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Resource } from '../types';
import { ResourceCard } from './ResourceCard';

interface Props {
  resources: Resource[];
  /** Show the subject chips above the cards (when there is more than one subject). Default true. */
  showFilters?: boolean;
  /** Address parameter that remembers the chosen subject, so several grids on a page don't clash. */
  paramKey?: string;
  /** Where a card goes when clicked. Default: the resource's public page. null makes it a plain preview. */
  cardTo?: (resource: Resource) => string | null;
}

/** Subject filter + card grid. The chosen subject lives in the URL (?subject=EVS) so it can be shared. */
export function ResourceGrid({
  resources,
  showFilters = true,
  paramKey = 'subject',
  cardTo,
}: Props) {
  const [params, setParams] = useSearchParams();
  const subjects = useMemo(() => [...new Set(resources.map((r) => r.subject))], [resources]);
  const requested = params.get(paramKey);
  const active = requested && subjects.includes(requested) ? requested : 'all';
  const shown = active === 'all' ? resources : resources.filter((r) => r.subject === active);
  // Cards rise in one after another when a visitor changes the filter, not when the page opens.
  const [filtered, setFiltered] = useState(false);

  const choose = (subject: string) => {
    setFiltered(true);
    const next = new URLSearchParams(params);
    if (subject === 'all') next.delete(paramKey);
    else next.set(paramKey, subject);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  if (resources.length === 0) {
    return <p className="empty">No resources published yet.</p>;
  }

  return (
    <>
      {showFilters && subjects.length > 1 && (
        <div className="filters" role="group" aria-label="Filter by subject">
          {['all', ...subjects].map((s) => (
            <button key={s} type="button" aria-pressed={active === s} onClick={() => choose(s)}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      )}
      <div className={filtered ? 'grid grid--rise' : 'grid'} key={active}>
        {shown.map((r) => (
          <ResourceCard key={r.id} resource={r} to={cardTo?.(r)} />
        ))}
      </div>
    </>
  );
}
