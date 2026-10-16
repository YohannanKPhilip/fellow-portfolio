import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to the top when the page path changes (not when only the filter changes). */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
