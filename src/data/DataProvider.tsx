import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { config } from '../config';
import { isReservedSlug } from '../lib/slug';
import { DataContext, type DataState } from './dataContext';
import { loadData } from './loadData';

/** The fellow in the address ("/yohannan/r/..."); empty on the home page. */
function fellowFromPath(pathname: string): string {
  return pathname.split('/')[1] ?? '';
}

/**
 * Loads the data and shares it with every page. The sheet is loaded once; Supabase
 * loads one fellow's page at a time, so it reloads when the address moves to another fellow.
 * Site pages such as /login and /me aren't fellows, so they don't load anything.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isSupabase = config.dataSource === 'supabase';
  const first = fellowFromPath(pathname);
  const slug = isSupabase ? (!first || isReservedSlug(first) ? undefined : first) : '';
  const [state, setState] = useState<DataState>({ status: 'loading' });

  // The owner's pages (/me, /edit, /settings, a resource's /edit) change what visitors see. Coming
  // back out of one loads the page again, so the public pages show what was just saved.
  const ownerPage = /^\/[^/]+\/(me|edit|settings)$|^\/[^/]+\/r\/[^/]+\/edit$/.test(pathname);
  const [reloads, setReloads] = useState(0);
  const wasOwnerPage = useRef(ownerPage);
  useEffect(() => {
    if (wasOwnerPage.current && !ownerPage) setReloads((n) => n + 1);
    wasOwnerPage.current = ownerPage;
  }, [ownerPage]);

  useEffect(() => {
    if (slug === undefined) return;
    const controller = new AbortController();
    setState({ status: 'loading' });
    loadData(controller.signal, slug || undefined)
      .then((data) => {
        if (data.warnings.length) console.warn('[fellow-portfolio] data warnings:', data.warnings);
        setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => controller.abort();
  }, [slug, reloads]);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}
