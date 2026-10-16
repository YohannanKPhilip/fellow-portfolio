import { useEffect, useState } from 'react';
import { listMyResources, type MyResourceSummary } from '../../data/supabase/resources';

export type MyResourcesState =
  | { status: 'loading' }
  | { status: 'ready'; resources: MyResourceSummary[] }
  | { status: 'error'; message: string };

/** The signed-in fellow's own resources (drafts included), . */
export function useMyResources(userId: string) {
  const [state, setState] = useState<MyResourcesState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    listMyResources(userId)
      .then((resources) => !cancelled && setState({ status: 'ready', resources }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { state };
}
