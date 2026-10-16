import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { config } from '../config';
import { DataContext, type DataState } from './dataContext';
import { loadData } from './loadData';

/** The fellow in the address ("/yohannan/r/..."), or the default fellow on the home page. */
function fellowFromPath(pathname: string): string {
  return pathname.split('/')[1] || config.defaultFellow;
}

/**
 * Loads the data and shares it with every page. The sheet is loaded once; Supabase
 * loads one fellow's page at a time, so it reloads when the address moves to another fellow.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const slug = config.dataSource === 'supabase' ? fellowFromPath(pathname) : '';
  const [state, setState] = useState<DataState>({ status: 'loading' });

  useEffect(() => {
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
  }, [slug]);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}
