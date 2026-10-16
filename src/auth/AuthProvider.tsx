import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getClient } from '../data/supabase/client';
import { AuthContext, type AuthApi, type AuthState } from './authContext';

/** Turns Supabase's error text into something a fellow can act on. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('security purposes')) {
    return 'Too many tries. Please wait a minute and try again.';
  }
  if (m.includes('expired') || m.includes('invalid')) {
    return 'That link or code has expired or was already used. Please ask for a new one.';
  }
  if (m.includes('not authorized')) {
    return 'Sign-in emails can only be sent to approved addresses right now.';
  }
  return message;
}

/** Keeps the signed-in user in sync with Supabase's saved session. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    const client = getClient();
    // Fires once with the saved session (or none), then on every sign-in and sign-out.
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setState(session ? { status: 'signedIn', user: session.user } : { status: 'signedOut' });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const api = useMemo<AuthApi>(
    () => ({
      state,
      async sendLink(email, captchaToken) {
        const { error } = await getClient().auth.signInWithOtp({
          email: email.trim(),
          options: {
            // Back to this same site, whether it's GitHub Pages or localhost.
            emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`,
            shouldCreateUser: true,
            captchaToken,
          },
        });
        if (error) throw new Error(friendly(error.message));
      },
      async verifyCode(email, code) {
        const { error } = await getClient().auth.verifyOtp({
          email: email.trim(),
          token: code.trim(),
          type: 'email',
        });
        if (error) throw new Error(friendly(error.message));
      },
      async verifyLink(tokenHash) {
        const { error } = await getClient().auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email',
        });
        if (error) throw new Error(friendly(error.message));
      },
      async signOut() {
        await getClient().auth.signOut();
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}
