import type { User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loading } from '../components/StatusView';
import { useAuth } from './authContext';

/** Shows its children only to a signed-in user; everyone else is sent to /login and brought back after. */
export function RequireAuth({ children }: { children: (user: User) => ReactNode }) {
  const { state } = useAuth();
  const { pathname, search } = useLocation();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'signedOut') {
    return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
  }
  return <>{children(state.user)}</>;
}
