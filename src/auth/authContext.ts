import type { User } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User };

export interface AuthApi {
  state: AuthState;
  /** Emails a sign-in link and 6-digit code. Works for new and returning people. */
  sendLink: (email: string, captchaToken?: string) => Promise<void>;
  /** Signs in with the 6-digit code from the email. */
  verifyCode: (email: string, code: string) => Promise<void>;
  /** Signs in with the token in the email link. */
  verifyLink: (tokenHash: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthApi | undefined>(undefined);

export function useAuth(): AuthApi {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
