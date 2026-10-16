import type { ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { LoadError, Loading } from '../components/StatusView';
import type { MyFellow } from '../data/supabase/me';
import { RequireAuth } from './RequireAuth';
import { useMyFellow } from './useMyFellow';

export interface OwnerContext {
  userId: string;
  email: string;
  fellow: MyFellow;
  setFellow: (fellow: MyFellow) => void;
}

/**
 * Wraps every /<username>/me/... page. Needs a signed-in user with a page, and the address
 * must be their own: someone else's /<username>/me is redirected to their own, and a new
 * account with no page goes to /setup.
 */
export function OwnerGate({ children }: { children: (ctx: OwnerContext) => ReactNode }) {
  return (
    <RequireAuth>
      {(user) => (
        <Gate userId={user.id} email={user.email ?? ''}>
          {children}
        </Gate>
      )}
    </RequireAuth>
  );
}

function Gate({
  userId,
  email,
  children,
}: {
  userId: string;
  email: string;
  children: (ctx: OwnerContext) => ReactNode;
}) {
  const { fellowId = '' } = useParams();
  const { pathname } = useLocation();
  const mine = useMyFellow(userId);

  if (mine.state.status === 'loading') return <Loading />;
  if (mine.state.status === 'error') return <LoadError message={mine.state.message} />;
  const fellow = mine.state.fellow;
  if (!fellow) return <Navigate to="/setup" replace />;
  if (fellow.slug !== fellowId) {
    // Same page, but under the signed-in fellow's own address.
    return <Navigate to={pathname.replace(/^\/[^/]+/, `/${fellow.slug}`)} replace />;
  }
  return <>{children({ userId, email, fellow, setFellow: mine.setFellow })}</>;
}
