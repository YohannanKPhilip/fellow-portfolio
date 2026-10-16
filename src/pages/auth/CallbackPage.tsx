import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import { Loading } from '../../components/StatusView';

/** How long to wait for Supabase to finish reading a sign-in from the address. */
const WAIT_MS = 6000;

/** An error Supabase puts in the address when a link is expired or used ("#error_description=..."). */
function addressError(): string | undefined {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const text = params.get('error_description');
  return text ? text.replace(/\+/g, ' ') : undefined;
}

/**
 * The page the email link opens. Two kinds of link land here:
 * - Supabase's own link (the default): the sign-in arrives in the address and Supabase picks it up.
 * - Our link with a token_hash (once custom email templates are set up): verified here.
 * Either way, once signed in, /me decides where the person goes.
 */
export function CallbackPage() {
  const auth = useAuth();
  const [params] = useSearchParams();
  const tokenHash = params.get('token_hash');
  const [error, setError] = useState<string | undefined>(addressError);
  const [timedOut, setTimedOut] = useState(false);
  // A link works once, and React runs effects twice in development, so only try once.
  const tried = useRef(false);

  useEffect(() => {
    if (!tokenHash || tried.current) return;
    tried.current = true;
    auth.verifyLink(tokenHash).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : String(e));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenHash]);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), WAIT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (auth.state.status === 'signedIn') return <Navigate to="/me" replace />;

  const stillWaiting = !error && !timedOut;
  if (stillWaiting || auth.state.status === 'loading') return <Loading />;

  return (
    <div className="status">
      <h1 className="status__title">That link didn't work.</h1>
      <p className="status__text">
        {error ?? 'The sign-in link was incomplete, expired, or already used.'} Please ask for a new
        link on the sign-in page.
      </p>
      <Link className="button" to="/login">
        Back to sign in
      </Link>
    </div>
  );
}
