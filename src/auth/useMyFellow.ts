import { useCallback, useEffect, useState } from 'react';
import { getMyFellow, type MyFellow } from '../data/supabase/me';

export type MyFellowState =
  | { status: 'loading' }
  | { status: 'ready'; fellow: MyFellow | null }
  | { status: 'error'; message: string };

/** Loads the signed-in user's own page row (null until they've set it up). */
export function useMyFellow(userId: string) {
  const [state, setState] = useState<MyFellowState>({ status: 'loading' });

  const load = useCallback(() => {
    let cancelled = false;
    getMyFellow(userId)
      .then((fellow) => !cancelled && setState({ status: 'ready', fellow }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => load(), [load]);

  return { state, setFellow: (fellow: MyFellow) => setState({ status: 'ready', fellow }) };
}
