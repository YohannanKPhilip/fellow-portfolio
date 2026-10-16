import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import { Turnstile } from '../../auth/Turnstile';
import { Loading } from '../../components/StatusView';
import { config } from '../../config';
import { safeNext } from '../../lib/next';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

/** Sign up and sign in are the same: enter your email, then use the link or the 6-digit code. */
export function LoginPage() {
  useDocumentTitle('Sign in');
  const auth = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string>();
  const [captcha, setCaptcha] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (auth.state.status === 'loading') return <Loading />;
  if (auth.state.status === 'signedIn') return <Navigate to={next} replace />;

  const needsCaptcha = Boolean(config.turnstileSiteKey);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const sendLink = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await auth.sendLink(email, captcha);
      setSentTo(email.trim());
      setCode('');
    });
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    // On success the auth state changes and this page redirects by itself.
    if (sentTo) void run(() => auth.verifyCode(sentTo, code));
  };

  return (
    <div className="auth auth--split">
      <div>
        <h1 className="auth__title">
          {sentTo ? (
            <>
              Check your <span className="muted">email.</span>
            </>
          ) : (
            <>
              Sign in <span className="muted">to share your classroom.</span>
            </>
          )}
        </h1>
        <p className="auth__lede">
          A space where TFI fellows share the lessons, worksheets and classroom systems that work in
          their rooms.
        </p>
      </div>

      <div className="auth__card">
        {!sentTo ? (
          <form className="form" onSubmit={sendLink}>
            <div>
              <h2>Your email</h2>
              <p className="form__hint">New here? The same link creates your account.</p>
            </div>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {needsCaptcha && <Turnstile siteKey={config.turnstileSiteKey} onToken={setCaptcha} />}
            {error && (
              <p className="form__error" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="button button--accent button--block"
              disabled={busy || !email.trim() || (needsCaptcha && !captcha)}
            >
              {busy ? 'Sending…' : 'Send me a link'}
            </button>
          </form>
        ) : (
          <form className="form" onSubmit={verify}>
            <div>
              <span className="auth__sent" aria-hidden="true">
                ✓
              </span>
              <h2>Link sent</h2>
              <p className="form__hint">
                We emailed a sign-in link to <strong>{sentTo}</strong>. Open it on any device. It
                can take a minute to arrive.
              </p>
            </div>
            <div className="field field--code">
              <label htmlFor="code">Got a 6-digit code instead?</label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            {error && (
              <p className="form__error" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="button button--accent button--block"
              disabled={busy || code.length !== 6}
            >
              {busy ? 'Checking…' : 'Sign in with code'}
            </button>
            <button
              type="button"
              className="button button--link"
              onClick={() => {
                setSentTo(undefined);
                setError(undefined);
                setCaptcha(undefined);
              }}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
