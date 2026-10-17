import { useEffect, useState } from 'react';

/**
 * Returns "reveal" once a page that had to show its loading skeleton has finished loading, so the
 * content can fade in where the skeleton was. A page that opens with its data already there (the
 * usual case when moving around the site) returns "", because the page transition already animates it.
 */
export function useRevealAfterLoad(loading: boolean): string {
  const [sawLoading, setSawLoading] = useState(loading);
  useEffect(() => {
    if (loading) setSawLoading(true);
  }, [loading]);
  return sawLoading && !loading ? 'reveal' : '';
}
