/** Where to go after signing in. Only a path on this site is followed, never another address. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
    ? next
    : '/me';
}
