import { Link } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import { useMyFellow } from '../auth/useMyFellow';
import { config } from '../config';

interface Props {
  fellowId: string;
  /** On a resource's page: edit that resource instead of the fellow's page. */
  resourceId?: string;
}

/**
 * A small "Edit page" (or "Edit resource") button on a fellow's own public page, shown only to
 * them. Visitors, and anyone signed in as someone else, see nothing at all, so the public page is
 * unchanged.
 */
export function OwnerEditButton({ fellowId, resourceId }: Props) {
  if (config.dataSource !== 'supabase') return null;
  return <SignedIn fellowId={fellowId} resourceId={resourceId} />;
}

function SignedIn(props: Props) {
  const { state } = useAuth();
  if (state.status !== 'signedIn') return null;
  return <Owner userId={state.user.id} {...props} />;
}

function Owner({ userId, fellowId, resourceId }: Props & { userId: string }) {
  const mine = useMyFellow(userId);
  if (mine.state.status !== 'ready' || mine.state.fellow?.slug !== fellowId) return null;
  return (
    <Link
      className="owneredit"
      to={resourceId ? `/${fellowId}/r/${resourceId}/edit` : `/${fellowId}/edit`}
    >
      {resourceId ? 'Edit resource' : 'Edit page'}
    </Link>
  );
}
