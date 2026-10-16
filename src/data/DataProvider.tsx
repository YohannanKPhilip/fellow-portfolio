import { useEffect, useState, type ReactNode } from 'react';
import { DataContext, type DataState } from './dataContext';
import { loadData } from './loadData';

/** Loads the dataset once per page load and shares it with every page. */
export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal)
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
  }, []);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}
